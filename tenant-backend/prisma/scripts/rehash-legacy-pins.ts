import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

// RUN ONCE THEN DELETE
const prisma = new PrismaClient();

async function main() {
  const employees = await prisma.employee.findMany({
    where: {
      ussdPin: { not: null },
      ussdPinHash: null,
    },
  });

  console.log('employeeId,phone,newPin');
  for (const emp of employees) {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    const hash = await bcrypt.hash(pin, 10);
    
    await prisma.employee.update({
      where: { id: emp.id },
      data: {
        ussdPin: null,
        ussdPinHash: hash,
      },
    });
    
    console.log(`${emp.employeeIdNumber},${emp.phoneNumber},${pin}`);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
