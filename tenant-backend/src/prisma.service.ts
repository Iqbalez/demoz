import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as crypto from 'crypto';
import { tenantStorage } from './tenant-context'; // Reusing your existing store
import { createAuditLoggingExtension } from './prisma/audit-logging.extension';

// Cryptographic helpers for custom field encryption (AES-256-GCM)
function getEncryptionKeyBuffer(): Buffer {
  const envKey = process.env.PRISMA_FIELD_ENCRYPTION_KEY;
  const fallbackKey = 'k1.aesgcm256.G6yYVBg1xuWFChMTKwaDTUUyCD91PJIdc9UwnmUrPGw=';
  const targetKey = envKey || fallbackKey;
  const cleanKey = targetKey.replace(/['"]/g, '').trim();

  // If it's a valid cloak base64 key
  if (cleanKey.startsWith('k1.aesgcm256.')) {
    const base64Part = cleanKey.substring('k1.aesgcm256.'.length);
    return Buffer.from(base64Part, 'base64');
  }

  // If it's a raw hex key (64 characters)
  if (/^[0-9a-fA-F]{64}$/.test(cleanKey)) {
    return Buffer.from(cleanKey, 'hex');
  }

  return Buffer.from(fallbackKey.substring('k1.aesgcm256.'.length), 'base64');
}

function encrypt(text: string): string {
  if (!text) return text;
  try {
    const key = getEncryptionKeyBuffer();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag().toString('hex');
    return `enc:${iv.toString('hex')}:${tag}:${encrypted}`;
  } catch (e) {
    return text;
  }
}

function decrypt(cipherText: string): string {
  if (!cipherText || !cipherText.startsWith('enc:')) return cipherText;
  try {
    const parts = cipherText.split(':');
    if (parts.length !== 4) return cipherText;
    const key = getEncryptionKeyBuffer();
    const iv = Buffer.from(parts[1], 'hex');
    const tag = Buffer.from(parts[2], 'hex');
    const encrypted = parts[3];
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    return cipherText;
  }
}

function encryptFields(data: any, fields: string[]) {
  if (!data) return;
  if (Array.isArray(data)) {
    for (const item of data) {
      encryptFields(item, fields);
    }
  } else {
    for (const field of fields) {
      if (data[field]) {
        if (typeof data[field] === 'string') {
          data[field] = encrypt(data[field]);
        } else if (data[field].set && typeof data[field].set === 'string') {
          data[field].set = encrypt(data[field].set);
        }
      }
    }
  }
}

function decryptFields(result: any, fields: string[]) {
  if (!result) return;
  if (Array.isArray(result)) {
    for (const item of result) {
      decryptFields(item, fields);
    }
  } else {
    for (const field of fields) {
      if (typeof result[field] === 'string') {
        result[field] = decrypt(result[field]);
      }
    }
  }
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly prismaClient: PrismaClient;
  private readonly extendedClient: any;

  constructor() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    super({ adapter });

    // Retain a reference to the unextended client for safe, recursion-free checks
    const rawClient = this;
    this.prismaClient = this;

    // Initialize the multi-tenant + encrypted Prisma Client Extension chain.
    // ORDER MATTERS: Encryption runs FIRST so tenant logic operates on already-decrypted data.
    this.extendedClient = this
      // ─── Layer 1: Custom Field Encryption (AES-256-GCM) ────────────────────────────
      .$extends({
        query: {
          user: {
            async $allOperations({ model, operation, args, query }) {
              const anyArgs = args as any;
              if (anyArgs.data) {
                encryptFields(anyArgs.data, ['twoFactorSecret']);
              }
              const result = await query(args);
              decryptFields(result, ['twoFactorSecret']);
              return result;
            }
          },
          employee: {
            async $allOperations({ model, operation, args, query }) {
              const anyArgs = args as any;
              if (anyArgs.data) {
                encryptFields(anyArgs.data, ['tin', 'pensionId', 'bankAccount', 'accountName', 'faydaNumber']);
              }
              const result = await query(args);
              decryptFields(result, ['tin', 'pensionId', 'bankAccount', 'accountName', 'faydaNumber']);
              return result;
            }
          }
        }
      })
      // ─── Layer 2: Mutation Audit Logging ──────────────────────────────────────────
      .$extends(createAuditLoggingExtension())
      // ─── Layer 3: Multi-Tenant Row Isolation (AsyncLocalStorage) ────────────
      .$extends({
        query: {
          $allModels: {
            async $allOperations({ model, operation, args, query }) {
              // Models that require tenant isolation (add new models here as schema grows)
              const tenantScopedModels = [
                'User',
                'Employee',
                'Branch',
                'Department',
                'Attendance',
                'AttendanceLog',
                'PayrollRun',
                'PayrollLineItem',
                'AiAuditReport',
                'AuditLog',
                'SubscriptionInvoice',
                'LeaveType',
                'LeaveRequest',
                'PaymentTransaction',
              ];

              if (tenantScopedModels.includes(model)) {
                const tenantId = tenantStorage.getStore();

                if (tenantId) {
                  const modelKey = model.charAt(0).toLowerCase() + model.slice(1);

                  // A. Automatic Stamp on Creations
                  if (operation === 'create') {
                    args.data = args.data || {};
                    (args.data as any).tenantId = tenantId;
                  } else if (operation === 'createMany' || operation === 'createManyAndReturn') {
                    if (Array.isArray(args.data)) {
                      args.data = args.data.map((item: any) => ({ ...item, tenantId }));
                    } else {
                      args.data = { ...(args.data as any), tenantId };
                    }
                  }

                  // B. Automatic Filtering on standard reads & bulk writes
                  else if ([
                    'findMany', 'findFirst', 'findFirstOrThrow', 'count',
                    'aggregate', 'groupBy', 'updateMany', 'deleteMany'
                  ].includes(operation)) {
                    args.where = args.where || {};
                    (args.where as any).tenantId = tenantId;
                  }

                  // C. Intercept unique reads and convert to findFirst to support tenantId queries
                  else if (operation === 'findUnique' || operation === 'findUniqueOrThrow') {
                    const flattenedWhere: any = { tenantId };
                    const originalWhere = args.where || {};
                    for (const key of Object.keys(originalWhere)) {
                      const val = originalWhere[key];
                      if (
                        val &&
                        typeof val === 'object' &&
                        !Array.isArray(val) &&
                        !(val instanceof Date)
                      ) {
                        // Flatten compound unique key objects (e.g. employeeId_date)
                        Object.assign(flattenedWhere, val);
                      } else {
                        flattenedWhere[key] = val;
                      }
                    }

                    const result = await (rawClient as any)[modelKey].findFirst({
                      ...args,
                      where: flattenedWhere,
                    });
                    if (!result && operation === 'findUniqueOrThrow') {
                      throw new Error(`Record not found in tenant context.`);
                    }
                    return result;
                  }

                  // D. Pre-flight verification on single updates and deletions (prevent cross-tenant writes)
                  else if (operation === 'update' || operation === 'delete') {
                    const record = await (rawClient as any)[modelKey].findFirst({
                      where: { ...(args.where as any), tenantId },
                      select: { id: true },
                    });

                    if (!record) {
                      throw new Error(`Access Denied: Record not found or does not belong to active tenant.`);
                    }
                    // Proceed safely with the original query since validation passed
                  }
                }
              }

              // Execute the query
              return (query as any)(args);
            },
          },
        },
      });

    // Wrap the service in a Proxy to redirect operations to the tenant-isolated extendedClient
    return new Proxy(this, {
      get(target, prop, receiver) {
        // Retain native lifecycle and helper methods on the target
        if (
          prop === 'extendedClient' ||
          prop === 'prismaClient' ||
          prop === '$connect' ||
          prop === '$disconnect' ||
          prop === 'onModuleInit' ||
          prop === 'onModuleDestroy' ||
          prop === 'logger'
        ) {
          const val = Reflect.get(target, prop, receiver);
          if (typeof val === 'function') {
            return (val as any).bind(target);
          }
          return val;
        }

        // Redirect database collections (e.g. prismaService.user) to the extended client
        const val = Reflect.get(target.extendedClient, prop);
        if (typeof val === 'function') {
          return (val as any).bind(target.extendedClient);
        }
        return val;
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
