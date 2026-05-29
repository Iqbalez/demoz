/**
 * One-time (idempotent) seed for the platform SUPER_ADMIN account.
 *
 * Usage:
 *   SUPER_ADMIN_EMAIL=iqbalezedin@gmail.com SUPER_ADMIN_PASSWORD='YourSecurePassword' \
 *     npx ts-node prisma/seed-super-admin.ts
 */
import 'dotenv/config';
import { PrismaClient, UserRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';

const email = (process.env.SUPER_ADMIN_EMAIL || 'iqbalezedin@gmail.com').trim().toLowerCase();
const password = process.env.SUPER_ADMIN_PASSWORD;

async function main() {
  if (!password || password.length < 12) {
    throw new Error('Set SUPER_ADMIN_PASSWORD (min 12 characters) before running the seed.');
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const passwordHash = await bcrypt.hash(password, 12);

  let phoneNumber = process.env.SUPER_ADMIN_PHONE?.replace(/\s+/g, '') ?? '';
  if (!phoneNumber) {
    phoneNumber = '9000000001';
  }

  const existing = await prisma.user.findFirst({ where: { email } });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        role: UserRole.SUPER_ADMIN,
        tenantId: null,
        passwordHash,
        isActive: true,
      },
    });
    console.log(`Updated existing user ${email} to SUPER_ADMIN.`);
  } else {
    const phoneClash = await prisma.user.findUnique({ where: { phoneNumber } });
    if (phoneClash) {
      phoneNumber = `9${Math.floor(100000000 + Math.random() * 900000000)}`;
    }

    await prisma.user.create({
      data: {
        email,
        passwordHash,
        phoneNumber,
        role: UserRole.SUPER_ADMIN,
        tenantId: null,
        isActive: true,
      },
    });
    console.log(`Created SUPER_ADMIN user: ${email}`);
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
