import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting legacy USSD PIN rehash...');

  const employees = await prisma.employee.findMany({
    where: {
      ussdPin: {
        not: null,
      },
    },
    select: {
      id: true,
      ussdPin: true,
      tenantId: true,
    },
  });

  console.log(`Found ${employees.length} total employees with a USSD PIN.`);
  let rehashedCount = 0;

  for (const emp of employees) {
    if (!emp.ussdPin) continue;

    // A bcrypt hash typically starts with $2a$, $2b$, or $2y$ and is ~60 chars long.
    // Legacy plaintext PINs are usually 4 digits.
    if (!emp.ussdPin.startsWith('$2')) {
      const hashedPin = await bcrypt.hash(emp.ussdPin, 10);
      
      await prisma.employee.update({
        where: { id: emp.id },
        data: { ussdPin: hashedPin },
      });
      
      rehashedCount++;
      console.log(`Rehashed PIN for employee ${emp.id}`);
    }
  }

  console.log(`Migration complete. Rehashed ${rehashedCount} legacy PINs.`);
}

main()
  .catch((e) => {
    console.error('Error rehashing PINs:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
