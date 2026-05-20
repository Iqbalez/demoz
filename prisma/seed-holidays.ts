/**
 * Ethiopian Public Holidays Seed Script
 * Source: docs/ethiopia_2026_holidays.md
 * 
 * Seeds the 2026 Ethiopian public holiday calendar into the database.
 * All dates carry a 2.5x overtime multiplier per Labor Proclamation 1156/2019.
 * 
 * Usage: npx ts-node prisma/seed-holidays.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const holidays2026 = [
  // Fixed Holidays
  { date: '2026-01-07', nameEn: 'Ethiopian Christmas (Genna)', nameAm: 'ገና', ethiopicDate: '29 Tahsas 2018' },
  { date: '2026-01-19', nameEn: 'Orthodox Epiphany (Timkat)', nameAm: 'ጥምቀት', ethiopicDate: '11 Tir 2018' },
  { date: '2026-03-02', nameEn: 'Victory of Adwa Day', nameAm: 'የአድዋ ድል ቀን', ethiopicDate: '23 Yekatit 2018' },
  { date: '2026-05-01', nameEn: 'International Workers\' Day', nameAm: 'የሰራተኞች ቀን', ethiopicDate: '23 Miazia 2018' },
  { date: '2026-05-05', nameEn: 'Ethiopian Patriots\' Victory Day', nameAm: 'የአርበኞች ቀን', ethiopicDate: '27 Miazia 2018' },
  { date: '2026-05-28', nameEn: 'Downfall of the Derg / Eid al-Adha', nameAm: 'ደርግ የወደቀበት ቀን / ዒድ አል-አድሃ', ethiopicDate: '20 Ginbot 2018' },
  { date: '2026-09-11', nameEn: 'Ethiopian New Year (Enkutatash)', nameAm: 'እንቁጣጣሽ', ethiopicDate: '1 Meskerem 2019' },
  { date: '2026-09-27', nameEn: 'Meskel (Finding of the True Cross)', nameAm: 'መስቀል', ethiopicDate: '17 Meskerem 2019' },

  // Moveable Religious Holidays
  { date: '2026-03-20', nameEn: 'Eid al-Fitr (End of Ramadan)', nameAm: 'ዒድ አል-ፊጥር', ethiopicDate: '11 Megabit 2018' },
  { date: '2026-04-10', nameEn: 'Ethiopian Good Friday (Siklet)', nameAm: 'ስቅለት', ethiopicDate: '02 Miazia 2018' },
  { date: '2026-04-12', nameEn: 'Ethiopian Easter (Fasika)', nameAm: 'ፋሲካ', ethiopicDate: '04 Miazia 2018' },
  { date: '2026-08-25', nameEn: 'Mawlid (Birthday of Prophet Muhammad)', nameAm: 'መውሊድ', ethiopicDate: '19 Nehasse 2018' },
];

async function main() {
  console.log('Seeding 2026 Ethiopian Public Holidays...');

  for (const holiday of holidays2026) {
    await prisma.publicHoliday.upsert({
      where: {
        date_year: {
          date: new Date(holiday.date),
          year: 2026,
        },
      },
      update: {
        nameEn: holiday.nameEn,
        nameAm: holiday.nameAm,
        ethiopicDate: holiday.ethiopicDate,
      },
      create: {
        date: new Date(holiday.date),
        nameEn: holiday.nameEn,
        nameAm: holiday.nameAm,
        ethiopicDate: holiday.ethiopicDate,
        multiplier: 2.5,
        year: 2026,
      },
    });
    console.log(`  ✓ ${holiday.date} — ${holiday.nameEn} (${holiday.nameAm})`);
  }

  console.log(`\nDone! Seeded ${holidays2026.length} holidays for 2026.`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
