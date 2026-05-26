import { Logger } from '@nestjs/common';
import { getTenantId } from '../tenant-context';

/**
 * Prisma Client Extension layer that logs all mutation operations
 * (create, update, upsert, delete, updateMany, deleteMany) for
 * security audit trail purposes.
 *
 * Captures: model, operation, tenantId, and timestamp.
 * In production, this could be extended to write to an external
 * audit log service (e.g., CloudWatch, Datadog, or a dedicated
 * audit_events table).
 *
 * Registration order in PrismaService matters:
 *   1. Encryption layer
 *   2. Audit logging layer   ← this one
 *   3. Tenant isolation layer
 *
 * This ensures audit logs capture the *original* query intent
 * before tenant isolation rewrites the where clause.
 */

const MUTATION_ACTIONS = new Set([
  'create',
  'createMany',
  'createManyAndReturn',
  'update',
  'updateMany',
  'upsert',
  'delete',
  'deleteMany',
]);

/** Models that should NOT be audit-logged (high-frequency reads, system tables) */
const AUDIT_SKIP_MODELS = new Set([
  'PublicHoliday', // System-wide reference data, no tenant mutations
]);

const logger = new Logger('AuditMiddleware');

/**
 * Creates a Prisma Client Extension object for mutation audit logging.
 *
 * @returns Extension config to be passed to `$extends()`
 *
 * @example
 * ```ts
 * this.$extends(createAuditLoggingExtension())
 *     .$extends(createTenantIsolationExtension());
 * ```
 */
export function createAuditLoggingExtension() {
  return {
    query: {
      $allModels: {
        async $allOperations({
          model,
          operation,
          args,
          query,
        }: {
          model: string;
          operation: string;
          args: any;
          query: (args: any) => Promise<any>;
        }) {
          if (!MUTATION_ACTIONS.has(operation) || AUDIT_SKIP_MODELS.has(model)) {
            return query(args);
          }

          const tenantId = getTenantId() ?? 'SYSTEM';
          const start = performance.now();

          try {
            const result = await query(args);
            const durationMs = (performance.now() - start).toFixed(1);

            // Structured log line — parseable by log aggregators
            logger.log(
              JSON.stringify({
                event: 'DB_MUTATION',
                model,
                operation,
                tenantId,
                durationMs,
                timestamp: new Date().toISOString(),
              }),
            );

            return result;
          } catch (error) {
            const durationMs = (performance.now() - start).toFixed(1);

            logger.warn(
              JSON.stringify({
                event: 'DB_MUTATION_FAILED',
                model,
                operation,
                tenantId,
                durationMs,
                error: error instanceof Error ? error.message : String(error),
                timestamp: new Date().toISOString(),
              }),
            );

            throw error;
          }
        },
      },
    },
  };
}
