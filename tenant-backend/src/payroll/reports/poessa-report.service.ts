import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { EthiopianCalendarService } from '../../shared/ethiopian-calendar/ethiopian-calendar.service';
import * as ExcelJS from 'exceljs';

@Injectable()
export class PoessaReportService {
  constructor(
    private prisma: PrismaService,
    private ethiopianCalendar: EthiopianCalendarService,
  ) {}

  async generatePOESSAReport(tenantId: string, year: number, month: number): Promise<Buffer> {
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
            employee: { select: { firstName: true, lastName: true, employeeIdNumber: true, pensionId: true } }
          }
        }
      }
    });

    const allLines = runs.flatMap(r => r.payrollLineItems);
    const tenant = runs[0]?.tenant;
    const ethDate = this.ethiopianCalendar.toEthiopian(periodStart);
    const ecLabel = `${ethDate.monthName} ${ethDate.year}`;

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('POESSA Monthly Report');

    sheet.mergeCells('A1:F1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `POESSA Pension Report - ${tenant?.name || 'Company'} - ${ecLabel} (${month}/${year})`;
    titleCell.font = { bold: true, size: 12 };
    titleCell.alignment = { horizontal: 'center' };

    const headers = [
      'Employee ID / መታወቂያ',
      'Full Name / ሙሉ ስም',
      'Gross Salary / መሠረታዊ ደሞዝ',
      'Employee Pension (7%)',
      'Employer Pension (11%)',
      'Total Contribution / ጠቅላላ'
    ];

    const headerRow = sheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } }; // Emerald green
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    sheet.getColumn(1).width = 15;
    sheet.getColumn(2).width = 30;
    sheet.getColumn(3).width = 18;
    sheet.getColumn(4).width = 22;
    sheet.getColumn(5).width = 22;
    sheet.getColumn(6).width = 25;

    let totalGross = 0, totalEmpPension = 0, totalErPension = 0, totalCombined = 0;

    allLines.forEach((line) => {
      const g = Number(line.grossSalary);
      const pEmp = Number(line.pensionDeduction);
      const pEr = Number(line.employerPensionContribution);
      const combined = pEmp + pEr;

      totalGross += g;
      totalEmpPension += pEmp;
      totalErPension += pEr;
      totalCombined += combined;

      sheet.addRow([
        line.employee.employeeIdNumber,
        `${line.employee.firstName} ${line.employee.lastName}`,
        g,
        pEmp,
        pEr,
        combined
      ]);
    });

    const totalsRow = sheet.addRow(['', 'TOTAL', totalGross, totalEmpPension, totalErPension, totalCombined]);
    totalsRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
    });

    for (let i = 3; i <= 6; i++) {
      sheet.getColumn(i).numFmt = '#,##0.00';
    }

    sheet.addRow([]);
    const footerRow = sheet.addRow([`Total remitted to POESSA: ETB ${totalCombined.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]);
    footerRow.getCell(1).font = { bold: true, italic: true };
    sheet.mergeCells(`A${footerRow.number}:F${footerRow.number}`);

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
