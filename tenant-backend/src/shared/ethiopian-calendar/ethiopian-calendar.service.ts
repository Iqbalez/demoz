import { Injectable } from '@nestjs/common';
import * as EthiopianDate from 'ethiopian-date';

@Injectable()
export class EthiopianCalendarService {
  
  // Convert Gregorian JS Date to Ethiopian calendar object
  toEthiopian(date: Date): { year: number; month: number; day: number; monthName: string } {
    const [year, month, day] = EthiopianDate.toEthiopian(
      date.getFullYear(), date.getMonth() + 1, date.getDate()
    );
    return { year, month, day, monthName: this.getMonthName(month) };
  }

  // Convert Ethiopian date back to JS Date (Gregorian)
  toGregorian(year: number, month: number, day: number): Date {
    const [gYear, gMonth, gDay] = EthiopianDate.toGregorian(year, month, day);
    return new Date(gYear, gMonth - 1, gDay);
  }

  // Ethiopian month names in Amharic + English
  getMonthName(month: number): string {
    const months = [
      'መስከረም / Meskerem', 'ጥቅምት / Tikimt', 'ኅዳር / Hidar',
      'ታኅሣሥ / Tahsas', 'ጥር / Tir', 'የካቲት / Yekatit',
      'መጋቢት / Megabit', 'ሚያዝያ / Miazia', 'ግንቦት / Ginbot',
      'ሰኔ / Sene', 'ሐምሌ / Hamle', 'ነሐሴ / Nehase', 'ጳጉሜ / Pagume'
    ];
    return months[month - 1] ?? 'Unknown';
  }

  // Ethiopian public holidays — returns array of Gregorian JS Dates for a given Gregorian year
  getPublicHolidays(gregorianYear: number): Array<{ name: string; date: Date; amharic: string; multiplier: number; isRecurring: boolean }> {
    return [
      { name: 'Ethiopian New Year', amharic: 'እንቁጣጣሽ', date: new Date(gregorianYear, 8, 11), multiplier: 2.5, isRecurring: true },
      { name: 'Finding of the True Cross', amharic: 'መስቀል', date: new Date(gregorianYear, 8, 27), multiplier: 2.5, isRecurring: true },
      { name: 'Christmas', amharic: 'ገና', date: new Date(gregorianYear, 0, 7), multiplier: 2.5, isRecurring: true },
      { name: 'Epiphany', amharic: 'ጥምቀት', date: new Date(gregorianYear, 0, 19), multiplier: 2.5, isRecurring: true },
      { name: 'Adwa Victory Day', amharic: 'የአድዋ ድል ቀን', date: new Date(gregorianYear, 2, 2), multiplier: 2.5, isRecurring: true },
      { name: 'Good Friday', amharic: 'ስቅለት', date: this.getGoodFriday(gregorianYear), multiplier: 2.5, isRecurring: false },
      { name: 'Easter', amharic: 'ፋሲካ', date: this.getEaster(gregorianYear), multiplier: 2.5, isRecurring: false },
      { name: 'Labour Day', amharic: 'የሠራተኞች ቀን', date: new Date(gregorianYear, 4, 1), multiplier: 2.5, isRecurring: true },
      { name: 'Patriots Day', amharic: 'የአርበኞች ቀን', date: new Date(gregorianYear, 4, 5), multiplier: 2.5, isRecurring: true },
      { name: 'Downfall of Derg', amharic: 'የደርግ መውደቂያ ቀን', date: new Date(gregorianYear, 4, 28), multiplier: 2.5, isRecurring: true },
      { name: 'Eid al-Fitr', amharic: 'ኢድ አልፈጥር', date: this.getEidAlFitr(gregorianYear), multiplier: 2.5, isRecurring: false },
      { name: 'Eid al-Adha', amharic: 'ኢድ አልአደሃ', date: this.getEidAlAdha(gregorianYear), multiplier: 2.5, isRecurring: false },
      { name: 'Mawlid', amharic: 'መውሊድ', date: this.getMawlid(gregorianYear), multiplier: 2.5, isRecurring: false },
    ];
  }

  // Placeholder implementations — replace with proper lunar calendar calculations
  private getGoodFriday(year: number): Date { return new Date(year, 3, 14); }
  private getEaster(year: number): Date { return new Date(year, 3, 16); }
  private getEidAlFitr(year: number): Date { return new Date(year, 3, 10); }
  private getEidAlAdha(year: number): Date { return new Date(year, 6, 16); }
  private getMawlid(year: number): Date { return new Date(year, 8, 15); }

  // Check if a given date is a public holiday
  isPublicHoliday(date: Date): boolean {
    const holidays = this.getPublicHolidays(date.getFullYear());
    return holidays.some(h => 
      h.date.getDate() === date.getDate() &&
      h.date.getMonth() === date.getMonth()
    );
  }
}
