import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { EthiopianCalendarService } from '../../shared/ethiopian-calendar/ethiopian-calendar.service';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ErcaReportService {
  constructor(
    private prisma: PrismaService,
    private ethiopianCalendar: EthiopianCalendarService,
  ) {}

  async generateERCAMonthlyReport(tenantId: string, year: number, month: number): Promise<Buffer> {
    const periodStart = new Date(Date.UTC(year, month - 1, 1));
    const periodEnd = new Date(Date.UTC(year, month, 1) - 1);

    const runs = await this.prisma.payrollRun.findMany({
      where: {
        tenantId,
        periodStart: { gte: periodStart },
        periodEnd: { lte: new Date(Date.UTC(year, month, 0, 23, 59, 59)) },
      },
      include: {
        tenant: { select: { name: true, tin: true } },
        payrollLineItems: {
          include: {
            employee: { select: { firstName: true, lastName: true, employeeIdNumber: true, tin: true } }
          }
        }
      }
    });

    const allLines = runs.flatMap(r => r.payrollLineItems);
    const tenant = runs[0]?.tenant;
    const ethDate = this.ethiopianCalendar.toEthiopian(periodStart);
    const ecLabel = `${ethDate.monthName} ${ethDate.year}`;

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('ERCA Monthly Report');

    // Title Row
    sheet.mergeCells('A1:G1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `Company: ${tenant?.name || 'N/A'} | TIN: ${tenant?.tin || 'N/A'} | Period: ${ecLabel} (${month}/${year})`;
    titleCell.font = { bold: true, size: 12 };
    titleCell.alignment = { horizontal: 'center' };

    // Headers
    const headers = [
      'Employee ID / መታወቂያ', 
      'Full Name / ሙሉ ስም', 
      'TIN / የግብር ከፋይ ቁጥር', 
      'Gross / ጠቅላላ', 
      'Pension / ጡረታ', 
      'Taxable / ታክስ የሚሰላበት', 
      'Tax / ታክስ'
    ];
    
    const headerRow = sheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }; // Dark blue
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // Column Widths
    sheet.getColumn(1).width = 15;
    sheet.getColumn(2).width = 30;
    sheet.getColumn(3).width = 15;
    sheet.getColumn(4).width = 15;
    sheet.getColumn(5).width = 15;
    sheet.getColumn(6).width = 20;
    sheet.getColumn(7).width = 15;

    let totalGross = 0, totalPension = 0, totalTaxable = 0, totalTax = 0;

    allLines.forEach((line) => {
      const g = Number(line.grossSalary);
      const p = Number(line.pensionDeduction);
      const t = Number(line.incomeTax);
      const taxable = g - p;

      totalGross += g;
      totalPension += p;
      totalTaxable += taxable;
      totalTax += t;

      sheet.addRow([
        line.employee.employeeIdNumber,
        `${line.employee.firstName} ${line.employee.lastName}`,
        line.employee.tin || 'N/A',
        g,
        p,
        taxable,
        t
      ]);
    });

    // Totals Row
    const totalsRow = sheet.addRow(['', 'TOTAL', '', totalGross, totalPension, totalTaxable, totalTax]);
    totalsRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }; // Light gray
    });

    // Number formats
    for (let i = 4; i <= 7; i++) {
      sheet.getColumn(i).numFmt = '#,##0.00';
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
