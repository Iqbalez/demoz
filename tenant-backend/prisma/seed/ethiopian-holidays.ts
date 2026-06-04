import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// A subset of major Ethiopian Public Holidays mapped for 2016, 2017, and 2018 EC.
// These dates correspond to the GC dates roughly from Sep 2023 to Aug 2026.
const HOLIDAYS = [
  // --- 2016 EC (2023/2024 GC) ---
  {
    date: new Date('2023-09-12T00:00:00Z'),
    nameEn: 'Ethiopian New Year (Enkutatash)',
    nameAm: 'እንቁጣጣሽ',
    ethiopicDate: 'Meskerem 1, 2016',
    year: 2016,
    isRecurring: true,
    multiplier: 2.5,
  },
  {
    date: new Date('2023-09-28T00:00:00Z'),
    nameEn: 'Meskel',
    nameAm: 'መስቀል',
    ethiopicDate: 'Meskerem 17, 2016',
    year: 2016,
    isRecurring: true,
    multiplier: 2.5,
  },
  {
    date: new Date('2024-01-07T00:00:00Z'),
    nameEn: 'Ethiopian Christmas (Genna)',
    nameAm: 'ገና',
    ethiopicDate: 'Tahsas 29, 2016',
    year: 2016,
    isRecurring: true,
    multiplier: 2.5,
  },
  {
    date: new Date('2024-01-20T00:00:00Z'),
    nameEn: 'Timkat (Epiphany)',
    nameAm: 'ጥምቀት',
    ethiopicDate: 'Tirr 11, 2016',
    year: 2016,
    isRecurring: true,
    multiplier: 2.5,
  },
  {
    date: new Date('2024-03-02T00:00:00Z'),
    nameEn: 'Adwa Victory Day',
    nameAm: 'የአድዋ ድል በዓል',
    ethiopicDate: 'Yekatit 23, 2016',
    year: 2016,
    isRecurring: true,
    multiplier: 2.5,
  },
  {
    date: new Date('2024-05-01T00:00:00Z'),
    nameEn: 'International Workers\' Day',
    nameAm: 'የሰራተኞች ቀን',
    ethiopicDate: 'Miyazya 23, 2016',
    year: 2016,
    isRecurring: true,
    multiplier: 2.5,
  },
  {
    date: new Date('2024-05-03T00:00:00Z'),
    nameEn: 'Ethiopian Good Friday',
    nameAm: 'ስቅለት',
    ethiopicDate: 'Miyazya 25, 2016',
    year: 2016,
    isRecurring: false, // Lunar based
    multiplier: 2.5,
  },
  {
    date: new Date('2024-05-05T00:00:00Z'),
    nameEn: 'Ethiopian Easter (Fasika)',
    nameAm: 'ፋሲካ',
    ethiopicDate: 'Miyazya 27, 2016',
    year: 2016,
    isRecurring: false, // Lunar based
    multiplier: 2.5,
  },
  {
    date: new Date('2024-05-28T00:00:00Z'),
    nameEn: 'Downfall of the Derg',
    nameAm: 'ደርግ የወደቀበት ቀን',
    ethiopicDate: 'Ginbot 20, 2016',
    year: 2016,
    isRecurring: true,
    multiplier: 2.5,
  },
  
  // --- 2017 EC (2024/2025 GC) ---
  {
    date: new Date('2024-09-11T00:00:00Z'),
    nameEn: 'Ethiopian New Year (Enkutatash)',
    nameAm: 'እንቁጣጣሽ',
    ethiopicDate: 'Meskerem 1, 2017',
    year: 2017,
    isRecurring: true,
    multiplier: 2.5,
  },
  {
    date: new Date('2024-09-27T00:00:00Z'),
    nameEn: 'Meskel',
    nameAm: 'መስቀል',
    ethiopicDate: 'Meskerem 17, 2017',
    year: 2017,
    isRecurring: true,
    multiplier: 2.5,
  },
  {
    date: new Date('2025-01-07T00:00:00Z'),
    nameEn: 'Ethiopian Christmas (Genna)',
    nameAm: 'ገና',
    ethiopicDate: 'Tahsas 29, 2017',
    year: 2017,
    isRecurring: true,
    multiplier: 2.5,
  },
  {
    date: new Date('2025-01-19T00:00:00Z'),
    nameEn: 'Timkat (Epiphany)',
    nameAm: 'ጥምቀት',
    ethiopicDate: 'Tirr 11, 2017',
    year: 2017,
    isRecurring: true,
    multiplier: 2.5,
  },
  {
    date: new Date('2025-03-02T00:00:00Z'),
    nameEn: 'Adwa Victory Day',
    nameAm: 'የአድዋ ድል በዓል',
    ethiopicDate: 'Yekatit 23, 2017',
    year: 2017,
    isRecurring: true,
    multiplier: 2.5,
  },
  {
    date: new Date('2025-04-18T00:00:00Z'),
    nameEn: 'Ethiopian Good Friday',
    nameAm: 'ስቅለት',
    ethiopicDate: 'Miyazya 10, 2017',
    year: 2017,
    isRecurring: false,
    multiplier: 2.5,
  },
  {
    date: new Date('2025-04-20T00:00:00Z'),
    nameEn: 'Ethiopian Easter (Fasika)',
    nameAm: 'ፋሲካ',
    ethiopicDate: 'Miyazya 12, 2017',
    year: 2017,
    isRecurring: false,
    multiplier: 2.5,
  },
  {
    date: new Date('2025-05-01T00:00:00Z'),
    nameEn: 'International Workers\' Day',
    nameAm: 'የሰራተኞች ቀን',
    ethiopicDate: 'Miyazya 23, 2017',
    year: 2017,
    isRecurring: true,
    multiplier: 2.5,
  },
  {
    date: new Date('2025-05-28T00:00:00Z'),
    nameEn: 'Downfall of the Derg',
    nameAm: 'ደርግ የወደቀበት ቀን',
    ethiopicDate: 'Ginbot 20, 2017',
    year: 2017,
    isRecurring: true,
    multiplier: 2.5,
  },
];

async function main() {
  console.log('Seeding Ethiopian Public Holidays...');
  let inserted = 0;

  for (const holiday of HOLIDAYS) {
    try {
      await prisma.publicHoliday.upsert({
        where: {
          date_year: {
            date: holiday.date,
            year: holiday.year,
          },
        },
        update: holiday,
        create: holiday,
      });
      inserted++;
    } catch (e) {
      console.error(`Failed to upsert holiday ${holiday.nameEn}:`, e);
    }
  }

  console.log(`Successfully seeded ${inserted} Ethiopian Public Holidays.`);
}

main()
  .catch((e) => {
    console.error('Error seeding holidays:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
