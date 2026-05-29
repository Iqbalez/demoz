import 'dotenv/config';
import { PrismaClient, UserRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';

const email = (process.env.SUPER_ADMIN_EMAIL || 'iqbalezedin@gmail.com').trim().toLowerCase();
const password = process.env.SUPER_ADMIN_PASSWORD;

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  const users = await prisma.user.findMany({ where: { email } });
  console.log(`Users with ${email}:`, users.length);
  for (const u of users) {
    console.log(` - id=${u.id} role=${u.role} active=${u.isActive} tenantId=${u.tenantId ?? 'null'}`);
    if (password && u.passwordHash) {
      const ok = await bcrypt.compare(password, u.passwordHash);
      console.log(`   password match: ${ok}`);
    }
  }

  const superCount = users.filter((u) => u.role === UserRole.SUPER_ADMIN && u.isActive).length;
  console.log(superCount ? 'SUPER_ADMIN ready' : 'No active SUPER_ADMIN for this email');

  await prisma.$disconnect();
  await pool.end();
}

main();
