import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { LeaveService } from '../../leave/leave.service';
import * as ExcelJS from 'exceljs';

@Injectable()
export class LeaveLiabilityService {
  constructor(
    private prisma: PrismaService,
    private leaveService: LeaveService,
  ) {}

  async generateLeaveLiabilityReport(tenantId: string): Promise<Buffer> {
    const employees = await this.prisma.employee.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
      },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Leave Liability');

    sheet.mergeCells('A1:G1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `Leave Liability Report as of ${new Date().toLocaleDateString()}`;
    titleCell.font = { bold: true, size: 12 };
    titleCell.alignment = { horizontal: 'center' };

    const headers = [
      'Employee ID',
      'Full Name',
      'Hire Date',
      'Annual Entitlement',
      'Days Used',
      'Days Remaining',
      'Liability (ETB)',
    ];

    const headerRow = sheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAB308' } }; // Yellow
      cell.font = { color: { argb: 'FF000000' }, bold: true };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    sheet.getColumn(1).width = 15;
    sheet.getColumn(2).width = 30;
    sheet.getColumn(3).width = 15;
    sheet.getColumn(4).width = 18;
    sheet.getColumn(5).width = 15;
    sheet.getColumn(6).width = 18;
    sheet.getColumn(7).width = 20;

    let totalLiability = 0;

    for (const emp of employees) {
      const entitlement = await this.leaveService.calculateAnnualLeaveEntitlement(emp.hireDate);
      const remaining = entitlement - emp.leaveBalanceUsed;
      // standard Ethiopian working days per month is 26
      const dailyRate = Number(emp.baseSalary) / 26;
      const liability = Math.max(0, remaining) * dailyRate;

      totalLiability += liability;

      sheet.addRow([
        emp.employeeIdNumber,
        `${emp.firstName} ${emp.lastName}`,
        emp.hireDate.toISOString().split('T')[0],
        entitlement,
        emp.leaveBalanceUsed,
        remaining,
        liability,
      ]);
    }

    const totalsRow = sheet.addRow(['', 'TOTAL LIABILITY', '', '', '', '', totalLiability]);
    totalsRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
    });

    sheet.getColumn(7).numFmt = '#,##0.00';

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
