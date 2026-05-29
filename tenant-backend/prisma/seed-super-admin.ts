/**
 * Idempotent SUPER_ADMIN seed. Run against Neon with DATABASE_URL set.
 *
 *   $env:DATABASE_URL='postgresql://...neon...'
 *   $env:SUPER_ADMIN_EMAIL='iqbalezedin@gmail.com'
 *   $env:SUPER_ADMIN_PASSWORD='YourSecurePassword12+'
 *   npm run seed:super-admin
 */
import 'dotenv/config';
import { PrismaClient, UserRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';

const email = (process.env.SUPER_ADMIN_EMAIL || 'iqbalezedin@gmail.com').trim().toLowerCase();
const password = process.env.SUPER_ADMIN_PASSWORD;

function logDatabaseTarget() {
  const url = process.env.DATABASE_URL ?? '';
  if (!url) {
    console.error('DATABASE_URL is not set. Set Neon URL in this shell before seeding.');
    process.exit(1);
  }
  try {
    const host = new URL(url.replace(/^postgresql:/, 'http:')).hostname;
    console.log(`Target database host: ${host}`);
    if (host.includes('localhost') || host === '127.0.0.1') {
      console.warn('WARNING: You are seeding LOCAL Postgres, not Neon. Set DATABASE_URL to your Neon pooler URL.');
    }
  } catch {
    console.log('Target database: (could not parse DATABASE_URL host)');
  }
}

async function main() {
  logDatabaseTarget();

  if (!password || password.length < 12) {
    throw new Error('Set SUPER_ADMIN_PASSWORD (min 12 characters) before running the seed.');
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const passwordHash = await bcrypt.hash(password, 12);

  const matches = await prisma.user.findMany({ where: { email } });

  if (matches.length > 1) {
    console.log(`Found ${matches.length} users with email ${email}. Consolidating to one SUPER_ADMIN.`);
  }

  const existingSuper = matches.find((u) => u.role === UserRole.SUPER_ADMIN);
  let adminUserId: string;

  if (existingSuper) {
    adminUserId = existingSuper.id;
    await prisma.user.update({
      where: { id: adminUserId },
      data: {
        role: UserRole.SUPER_ADMIN,
        tenantId: null,
        passwordHash,
        isActive: true,
      },
    });
    console.log(`Updated SUPER_ADMIN: ${email}`);
  } else if (matches.length > 0) {
    adminUserId = matches[0].id;
    await prisma.user.update({
      where: { id: adminUserId },
      data: {
        role: UserRole.SUPER_ADMIN,
        tenantId: null,
        passwordHash,
        isActive: true,
      },
    });
    console.log(`Promoted existing user to SUPER_ADMIN: ${email}`);
  } else {
    let phoneNumber = process.env.SUPER_ADMIN_PHONE?.replace(/\s+/g, '') ?? '9000000001';
    const phoneClash = await prisma.user.findUnique({ where: { phoneNumber } });
    if (phoneClash) {
      phoneNumber = `9${Math.floor(100000000 + Math.random() * 900000000)}`;
    }

    const created = await prisma.user.create({
      data: {
        email,
        passwordHash,
        phoneNumber,
        role: UserRole.SUPER_ADMIN,
        tenantId: null,
        isActive: true,
      },
    });
    adminUserId = created.id;
    console.log(`Created SUPER_ADMIN: ${email}`);
  }

  for (const u of matches) {
    if (u.id !== adminUserId) {
      await prisma.user.update({
        where: { id: u.id },
        data: { isActive: false },
      });
      console.log(`Deactivated duplicate login row (${u.role}, tenant ${u.tenantId ?? 'n/a'}).`);
    }
  }

  const verify = await bcrypt.compare(password, passwordHash);
  console.log(verify ? 'Password hash self-check: OK' : 'Password hash self-check: FAILED');

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
