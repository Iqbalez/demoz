import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EthiopianCalendarService } from '../shared/ethiopian-calendar/ethiopian-calendar.service';
import PDFDocument = require('pdfkit');

@Injectable()
export class PayslipService {
  private readonly logger = new Logger(PayslipService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ethiopianCalendar: EthiopianCalendarService,
  ) {}

  /**
   * Generates a bilingual A4 payslip PDF for a single employee within a payroll run.
   */
  async generatePayslipPDF(payrollRunId: string, employeeId: string): Promise<Buffer> {
    // 1. Fetch all required data
    const lineItem = await this.prisma.payrollLineItem.findFirst({
      where: { payrollRunId, employeeId },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            employeeIdNumber: true,
            tin: true,
            pensionId: true,
            bankAccount: true,
            bankName: true,
            department: { select: { name: true } },
          },
        },
        payrollRun: {
          select: {
            periodStart: true,
            periodEnd: true,
            periodLabelEC: true,
            periodLabelGC: true,
            tenant: {
              select: { name: true, tin: true },
            },
          },
        },
      },
    });

    if (!lineItem) {
      throw new NotFoundException('Payroll line item not found for this employee and run.');
    }

    const emp = lineItem.employee;
    const run = lineItem.payrollRun;
    const tenant = run.tenant;

    const gross = Number(lineItem.grossSalary);
    const base = Number(lineItem.baseSalary);
    const transport = Number(lineItem.transportAllowance);
    const pensionEmp = Number(lineItem.pensionDeduction);
    const pensionEr = Number(lineItem.employerPensionContribution);
    const tax = Number(lineItem.incomeTax);
    const net = Number(lineItem.netPay);

    // Determine tax bracket applied
    const taxableIncome = gross - pensionEmp;
    const bracketLabel = this.getTaxBracketLabel(taxableIncome);

    // Ethiopian calendar period
    const ecLabel = run.periodLabelEC || 'N/A';
    const gcLabel = run.periodLabelGC || `${run.periodStart.getMonth() + 1}/${run.periodStart.getFullYear()}`;

    // 2. Render PDF
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const buffers: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => buffers.push(chunk));

    const fmtETB = (val: number) => val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // ── HEADER ──────────────────────────────────────────────────────────
    doc
      .fontSize(14).font('Helvetica-Bold')
      .text(tenant.name || 'Company', 50, 50)
      .fontSize(8).font('Helvetica')
      .text(`TIN: ${tenant.tin || 'N/A'}`, 50, 68);

    doc
      .fontSize(16).font('Helvetica-Bold')
      .text('PAYSLIP / የደሞዝ ሰነድ', 300, 50, { align: 'right' })
      .fontSize(9).font('Helvetica')
      .text(`Period: ${ecLabel}  (${gcLabel})`, 300, 72, { align: 'right' });

    // Divider
    doc.moveTo(50, 90).lineTo(545, 90).lineWidth(1).strokeColor('#10b981').stroke();

    // ── EMPLOYEE SECTION ────────────────────────────────────────────────
    const empY = 105;
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#333333');
    this.bilingualLabel(doc, 'Employee Name / የሰራተኛ ስም', 50, empY);
    doc.font('Helvetica').text(`${emp.firstName} ${emp.lastName}`, 220, empY);

    this.bilingualLabel(doc, 'Employee ID / መታወቂያ ቁጥር', 50, empY + 16);
    doc.font('Helvetica').text(emp.employeeIdNumber, 220, empY + 16);

    this.bilingualLabel(doc, 'Department / ክፍል', 50, empY + 32);
    doc.font('Helvetica').text(emp.department?.name || 'N/A', 220, empY + 32);

    this.bilingualLabel(doc, 'TIN / የግብር ከፋይ ቁጥር', 50, empY + 48);
    doc.font('Helvetica').text(emp.tin || 'N/A', 220, empY + 48);

    this.bilingualLabel(doc, 'Pension ID / የጡረታ ቁጥር', 330, empY);
    doc.font('Helvetica').text(emp.pensionId || 'N/A', 470, empY);

    this.bilingualLabel(doc, 'Bank Account / ባንክ ሂሳብ', 330, empY + 16);
    doc.font('Helvetica').text(emp.bankAccount || 'N/A', 470, empY + 16);

    // Divider
    doc.moveTo(50, empY + 70).lineTo(545, empY + 70).lineWidth(0.5).strokeColor('#cccccc').stroke();

    // ── EARNINGS TABLE ──────────────────────────────────────────────────
    let tableY = empY + 85;
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#10b981').text('EARNINGS / ገቢዎች', 50, tableY);
    tableY += 18;

    const earningsRows = [
      ['Basic Salary / መሠረታዊ ደሞዝ', fmtETB(base)],
      ['Transport Allowance / የትራንስፖርት አበል', fmtETB(transport)],
      ['Position Allowance / የአቋም አበል', fmtETB(Number(lineItem.taxableAllowances))],
      ['Overtime Pay / የትርፍ ሰዓት ክፍያ', fmtETB(Number(lineItem.overtimePay))],
    ];

    doc.font('Helvetica-Bold').fontSize(8).fillColor('#666666');
    doc.text('Description / ዝርዝር', 55, tableY);
    doc.text('Amount (ETB) / መጠን', 400, tableY, { align: 'right' });
    tableY += 14;

    doc.moveTo(50, tableY).lineTo(545, tableY).lineWidth(0.3).strokeColor('#eeeeee').stroke();
    tableY += 6;

    doc.font('Helvetica').fontSize(9).fillColor('#333333');
    for (const [label, amount] of earningsRows) {
      doc.text(label, 55, tableY);
      doc.text(amount, 400, tableY, { align: 'right' });
      tableY += 16;
    }

    // Gross total
    doc.moveTo(50, tableY).lineTo(545, tableY).lineWidth(0.5).strokeColor('#10b981').stroke();
    tableY += 6;
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#10b981');
    doc.text('Gross Salary / ጠቅላላ ደሞዝ', 55, tableY);
    doc.text(`ETB ${fmtETB(gross)}`, 400, tableY, { align: 'right' });
    tableY += 24;

    // ── DEDUCTIONS TABLE ────────────────────────────────────────────────
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#ef4444').text('DEDUCTIONS / ተቀናሾች', 50, tableY);
    tableY += 18;

    doc.font('Helvetica-Bold').fontSize(8).fillColor('#666666');
    doc.text('Description / ዝርዝር', 55, tableY);
    doc.text('Amount (ETB) / መጠን', 400, tableY, { align: 'right' });
    tableY += 14;
    doc.moveTo(50, tableY).lineTo(545, tableY).lineWidth(0.3).strokeColor('#eeeeee').stroke();
    tableY += 6;

    const deductionRows = [
      [`Employee Pension (7%) / የሰራተኛ ጡረታ (7%)`, fmtETB(pensionEmp)],
      [`Income Tax (Schedule A) / የገቢ ግብር — ${bracketLabel}`, fmtETB(tax)],
    ];

    doc.font('Helvetica').fontSize(9).fillColor('#333333');
    for (const [label, amount] of deductionRows) {
      doc.text(label, 55, tableY);
      doc.text(amount, 400, tableY, { align: 'right' });
      tableY += 16;
    }

    // Total deductions
    doc.moveTo(50, tableY).lineTo(545, tableY).lineWidth(0.5).strokeColor('#ef4444').stroke();
    tableY += 6;
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#ef4444');
    doc.text('Total Deductions / ጠቅላላ ተቀናሽ', 55, tableY);
    doc.text(`ETB ${fmtETB(pensionEmp + tax)}`, 400, tableY, { align: 'right' });
    tableY += 28;

    // ── NET PAY BOX ─────────────────────────────────────────────────────
    doc.roundedRect(50, tableY, 495, 50, 8).lineWidth(2).strokeColor('#10b981').stroke();
    doc.roundedRect(50, tableY, 495, 50, 8).fillColor('#f0fdf4').fillOpacity(0.5).fill();
    doc.fillOpacity(1);
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#333333');
    doc.text('NET PAY / ተጣራ ክፍያ', 65, tableY + 10);
    doc.fontSize(18).fillColor('#059669');
    doc.text(`ETB ${fmtETB(net)}`, 300, tableY + 10, { align: 'right' });
    tableY += 65;

    // ── EMPLOYER CONTRIBUTION (informational) ───────────────────────────
    doc.fontSize(8).font('Helvetica').fillColor('#999999');
    doc.text(
      `Employer Pension Contribution (11%) / የአሰሪ ጡረታ (11%) — ETB ${fmtETB(pensionEr)}  [Not deducted from your salary / ከደሞዝዎ አይቀነስም]`,
      50, tableY,
    );
    tableY += 24;

    // ── SIGNATURE AREA ──────────────────────────────────────────────────
    doc.moveTo(50, tableY).lineTo(545, tableY).lineWidth(0.5).strokeColor('#cccccc').stroke();
    tableY += 16;

    // Prepared by box
    doc.roundedRect(50, tableY, 220, 55, 4).lineWidth(0.5).strokeColor('#cccccc').stroke();
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#666666');
    doc.text('Prepared by / ያዘጋጀ', 60, tableY + 5);
    doc.font('Helvetica').fontSize(7).fillColor('#aaaaaa');
    doc.text('Name: _________________________', 60, tableY + 22);
    doc.text('Signature: ______________________', 60, tableY + 35);

    // Received by box
    doc.roundedRect(310, tableY, 235, 55, 4).lineWidth(0.5).strokeColor('#cccccc').stroke();
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#666666');
    doc.text('Received by / የተቀበለ', 320, tableY + 5);
    doc.font('Helvetica').fontSize(7).fillColor('#aaaaaa');
    doc.text('Name: _________________________', 320, tableY + 22);
    doc.text('Signature: ______________________', 320, tableY + 35);
    tableY += 70;

    // ── FOOTER ──────────────────────────────────────────────────────────
    doc.fontSize(7).font('Helvetica').fillColor('#aaaaaa');
    doc.text(
      `Payslip ID: ${lineItem.id} | Generated: ${new Date().toISOString()} | Powered by Demoz`,
      50, tableY, { align: 'center', width: 495 },
    );
    doc.text(
      'This payslip is computer generated by Demoz HR. For questions contact your HR department.',
      50, tableY + 12, { align: 'center', width: 495 },
    );

    // Finalize
    await new Promise<void>((resolve) => doc.on('end', resolve));
    doc.end();
    return Buffer.concat(buffers);
  }

  /**
   * Generates the ERCA Monthly Summary Report PDF.
   */
  async generateErcaMonthlyReport(tenantId: string, year: number, month: number): Promise<Buffer> {
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
            employee: {
              select: {
                firstName: true,
                lastName: true,
                employeeIdNumber: true,
                tin: true,
              },
            },
          },
        },
      },
    });

    // Flatten all line items
    const allLines = runs.flatMap(r => r.payrollLineItems);
    const tenant = runs[0]?.tenant;

    // Ethiopian calendar label
    const ethDate = this.ethiopianCalendar.toEthiopian(periodStart);
    const ecLabel = `${ethDate.monthName} ${ethDate.year}`;

    const doc = new PDFDocument({ size: 'A4', margin: 40, layout: 'landscape' });
    const buffers: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => buffers.push(chunk));

    const fmtETB = (val: number) => val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Header
    doc.fontSize(14).font('Helvetica-Bold')
      .text('ERCA MONTHLY PAYROLL SUMMARY / ኢአገ ወርሃዊ ደመወዝ ሪፖርት', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(9).font('Helvetica')
      .text(`Company: ${tenant?.name || 'N/A'}  |  TIN: ${tenant?.tin || 'N/A'}  |  Period: ${ecLabel} (${month}/${year})`, { align: 'center' });
    doc.moveDown(0.5);

    // Table header
    const cols = [
      { label: '#', x: 45, w: 30 },
      { label: 'Employee ID', x: 75, w: 80 },
      { label: 'Name / ስም', x: 155, w: 130 },
      { label: 'TIN', x: 285, w: 80 },
      { label: 'Gross (ETB)', x: 365, w: 85 },
      { label: 'Pension 7%', x: 450, w: 75 },
      { label: 'Taxable Inc.', x: 525, w: 80 },
      { label: 'Tax Withheld', x: 605, w: 80 },
      { label: 'Net Pay', x: 685, w: 80 },
    ];

    let y = doc.y;
    doc.fontSize(7).font('Helvetica-Bold').fillColor('#333333');
    for (const col of cols) {
      doc.text(col.label, col.x, y, { width: col.w });
    }
    y += 14;
    doc.moveTo(40, y).lineTo(770, y).lineWidth(0.5).strokeColor('#10b981').stroke();
    y += 5;

    // Table rows
    let totalGross = 0, totalPension = 0, totalTaxable = 0, totalTax = 0, totalNet = 0;

    doc.font('Helvetica').fontSize(7).fillColor('#333333');
    allLines.forEach((line, idx) => {
      const g = Number(line.grossSalary);
      const p = Number(line.pensionDeduction);
      const t = Number(line.incomeTax);
      const n = Number(line.netPay);
      const taxable = g - p;

      totalGross += g;
      totalPension += p;
      totalTaxable += taxable;
      totalTax += t;
      totalNet += n;

      doc.text(`${idx + 1}`, cols[0].x, y, { width: cols[0].w });
      doc.text(line.employee.employeeIdNumber, cols[1].x, y, { width: cols[1].w });
      doc.text(`${line.employee.firstName} ${line.employee.lastName}`, cols[2].x, y, { width: cols[2].w });
      doc.text(line.employee.tin || 'N/A', cols[3].x, y, { width: cols[3].w });
      doc.text(fmtETB(g), cols[4].x, y, { width: cols[4].w });
      doc.text(fmtETB(p), cols[5].x, y, { width: cols[5].w });
      doc.text(fmtETB(taxable), cols[6].x, y, { width: cols[6].w });
      doc.text(fmtETB(t), cols[7].x, y, { width: cols[7].w });
      doc.text(fmtETB(n), cols[8].x, y, { width: cols[8].w });
      y += 14;

      if (y > 520) {
        doc.addPage();
        y = 50;
      }
    });

    // Totals row
    doc.moveTo(40, y).lineTo(770, y).lineWidth(0.5).strokeColor('#10b981').stroke();
    y += 5;
    doc.font('Helvetica-Bold').fontSize(7).fillColor('#10b981');
    doc.text('TOTALS', cols[2].x, y, { width: cols[2].w });
    doc.text(fmtETB(totalGross), cols[4].x, y, { width: cols[4].w });
    doc.text(fmtETB(totalPension), cols[5].x, y, { width: cols[5].w });
    doc.text(fmtETB(totalTaxable), cols[6].x, y, { width: cols[6].w });
    doc.text(fmtETB(totalTax), cols[7].x, y, { width: cols[7].w });
    doc.text(fmtETB(totalNet), cols[8].x, y, { width: cols[8].w });
    y += 30;

    // Signature area
    doc.font('Helvetica').fontSize(8).fillColor('#666666');
    doc.text('Authorized Signatory / ስልጣን ያለው ፈራሚ: _________________________', 50, y);
    doc.text('Date / ቀን: _________________________', 500, y);
    y += 30;
    doc.fontSize(7).fillColor('#aaaaaa');
    doc.text(`Generated: ${new Date().toISOString()} | Powered by Demoz`, { align: 'center' });

    await new Promise<void>((resolve) => doc.on('end', resolve));
    doc.end();
    return Buffer.concat(buffers);
  }

  private bilingualLabel(doc: PDFKit.PDFDocument, text: string, x: number, y: number) {
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#666666').text(text, x, y);
  }

  private getTaxBracketLabel(taxableIncome: number): string {
    if (taxableIncome <= 2000) return '0% bracket';
    if (taxableIncome <= 4000) return '15% bracket';
    if (taxableIncome <= 7000) return '20% bracket';
    if (taxableIncome <= 10000) return '25% bracket';
    if (taxableIncome <= 14000) return '30% bracket';
    return '35% bracket';
  }
}
