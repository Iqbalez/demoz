import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { EthiopianCalendarService } from '../../src/shared/ethiopian-calendar/ethiopian-calendar.service';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const calendarService = new EthiopianCalendarService();

async function main() {
  const currentYear = new Date().getFullYear();
  // Generate for current year and next year to be safe
  const yearsToSeed = [currentYear - 1, currentYear, currentYear + 1];

  for (const year of yearsToSeed) {
    const holidays = calendarService.getPublicHolidays(year);
    
    for (const holiday of holidays) {
      const ethDate = calendarService.toEthiopian(holiday.date);
      const ethiopicDateStr = `${ethDate.day}/${ethDate.month}/${ethDate.year}`;

      await prisma.publicHoliday.upsert({
        where: {
          date_year: {
            date: holiday.date,
            year: year,
          },
        },
        update: {
          nameEn: holiday.name,
          nameAm: holiday.amharic,
          ethiopicDate: ethiopicDateStr,
          multiplier: holiday.multiplier,
          isRecurring: holiday.isRecurring,
        },
        create: {
          date: holiday.date,
          nameEn: holiday.name,
          nameAm: holiday.amharic,
          ethiopicDate: ethiopicDateStr,
          multiplier: holiday.multiplier,
          year: year,
          isRecurring: holiday.isRecurring,
        },
      });
      console.log(`Seeded: ${holiday.name} (${holiday.amharic}) for year ${year}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
