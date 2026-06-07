import { Injectable, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma.service';
import { GetEmployeesQueryDto } from './dto/employee-query.dto';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { SubscriptionService } from '../subscription/subscription.service';
import { tenantStorage } from '../tenant-context';
import { DashboardService } from '../dashboard/dashboard.service';
import { AfromessageService } from '../notifications/afromessage.service';
import { WorkspaceService } from './workspace.service';
import { normalizeEthiopianPhone } from '../lib/phone';
import { AuditService } from '../settings/audit.service';

@Injectable()
export class EmployeeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionService: SubscriptionService,
    private readonly dashboardService: DashboardService,
    private readonly afromessageService: AfromessageService,
    private readonly workspaceService: WorkspaceService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Enforces server-side paginated search, supporting filters and multi-column OR search (including Fayda ID)
   */
  async findAll(query: GetEmployeesQueryDto) {
    const { page, limit, search, branchId, status } = query;
    const skip = (page - 1) * limit;

    const whereClause: any = {};

    if (status) {
      whereClause.status = status;
    }

    if (branchId) {
      whereClause.department = { branchId: branchId };
    }

    if (search) {
      whereClause.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { employeeIdNumber: { contains: search, mode: 'insensitive' } },
        { faydaNumber: { contains: search, mode: 'insensitive' } }, // Phase 2 search index support
      ];
    }

    // Parallel database query resolution
    const [data, totalCount] = await Promise.all([
      this.prisma.employee.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: { 
          department: { select: { name: true, branchId: true } }
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.employee.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      data,
      metadata: {
        totalCount,
        totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
      },
    };
  }

  /**
   * Dedicated endpoint for fetching the organizational structure hierarchy
   */
  async getOrgStructure() {
    return this.prisma.employee.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeIdNumber: true,
        managerId: true,
        department: { select: { name: true, branchId: true } },
        manager: { select: { id: true, firstName: true, lastName: true } }
      }
    });
  }

  /**
   * Onboards a single employee, strictly enforcing deduplication on Fayda ID, employee ID and phone number.
   */
  async create(dto: CreateEmployeeDto, actorUserId?: string) {
    const tenantId = tenantStorage.getStore();
    if (!tenantId) {
      throw new BadRequestException('Active tenant context is missing.');
    }

    const hasCapacity = await this.subscriptionService.verifySeatCapacity(tenantId);
    if (!hasCapacity) {
      throw new BadRequestException(
        'Subscription Plan Limit Exceeded. You have reached the maximum number of active employees allowed on your tier. Please upgrade your subscription.',
      );
    }

    dto.phoneNumber = normalizeEthiopianPhone(dto.phoneNumber);
    const departmentId = await this.workspaceService.resolveDepartmentId(
      tenantId,
      dto.departmentId,
      dto.departmentName,
      dto.branchId,
    );

    // 1. Phone number global uniqueness check
    const existingPhone = await this.prisma.employee.findFirst({
      where: { phoneNumber: dto.phoneNumber },
    });
    if (existingPhone) {
      throw new BadRequestException('Phone number is already registered.');
    }

    // 2. Employee ID tenant-level uniqueness check
    const existingCode = await this.prisma.employee.findFirst({
      where: { employeeIdNumber: dto.employeeIdNumber },
    });
    if (existingCode) {
      throw new BadRequestException('Employee ID Number is already registered in this company.');
    }

    // 3. Fayda National ID global uniqueness check (Phase 2 primary key constraint)
    if (dto.faydaNumber) {
      const existingFayda = await this.prisma.employee.findFirst({
        where: { faydaNumber: dto.faydaNumber },
      });
      if (existingFayda) {
        throw new BadRequestException('Fayda National ID is already registered.');
      }
    }

    // Generate secure 4-digit PIN for Mobile App
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    const pinHash = await bcrypt.hash(pin, 10);

    // TenantId is automatically injected at query execution time by our Prisma Extension
    const emp = await this.prisma.employee.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        employeeIdNumber: dto.employeeIdNumber,
        phoneNumber: dto.phoneNumber,
        faydaNumber: dto.faydaNumber,
        baseSalary: dto.baseSalary,
        paymentMethod: dto.paymentMethod || 'BANK',
        bankName: dto.bankName || null,
        bankAccount: dto.bankAccount || null,
        status: dto.status || 'ACTIVE',
        hireDate: dto.hireDate ? new Date(dto.hireDate) : new Date(),
        departmentId,
        managerId: dto.managerId || null,
        userId: dto.userId || null,
        ussdPin: pin,
        ussdPinHash: pinHash,
      } as any,
    });

    await this.dashboardService.invalidateTenantKPICache(tenantId);

    if (actorUserId) {
      await this.audit.log(tenantId, actorUserId, 'employee_created', {
        module: 'employees',
        entityId: emp.id,
        employeeIdNumber: emp.employeeIdNumber,
        name: `${emp.firstName} ${emp.lastName}`,
      });
    }

    this.afromessageService.sendEmployeeMobileCredentials(emp.phoneNumber, emp.firstName, pin).catch((e) =>
      console.error(e),
    );

    return { ...emp, mobileAppPin: pin };
  }

  /** Issue a new 4-digit mobile PIN (shown once to HR). */
  async resetMobilePin(id: string) {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    const pinHash = await bcrypt.hash(pin, 10);
    const emp = await this.prisma.employee.update({
      where: { id },
      data: { ussdPin: pin, ussdPinHash: pinHash },
    });
    this.afromessageService.sendEmployeeMobileCredentials(emp.phoneNumber, emp.firstName, pin).catch((e) =>
      console.error(e),
    );
    return { mobileAppPin: pin, phoneNumber: emp.phoneNumber };
  }

  /**
   * Updates an employee, verifying that unique fields do not overlap with other records.
   */
  async update(id: string, dto: UpdateEmployeeDto, actorUserId?: string) {
    if (dto.phoneNumber) {
      dto.phoneNumber = dto.phoneNumber.replace(/\s+/g, '');
      const existingPhone = await this.prisma.employee.findFirst({
        where: { phoneNumber: dto.phoneNumber, NOT: { id } },
      });
      if (existingPhone) {
        throw new BadRequestException('Phone number is already registered.');
      }
    }

    if (dto.employeeIdNumber) {
      const existingCode = await this.prisma.employee.findFirst({
        where: { employeeIdNumber: dto.employeeIdNumber, NOT: { id } },
      });
      if (existingCode) {
        throw new BadRequestException('Employee ID Number is already registered.');
      }
    }

    if (dto.faydaNumber) {
      const existingFayda = await this.prisma.employee.findFirst({
        where: { faydaNumber: dto.faydaNumber, NOT: { id } },
      });
      if (existingFayda) {
        throw new BadRequestException('Fayda National ID is already registered.');
      }
    }

    const updatedEmp = await this.prisma.employee.update({
      where: { id },
      data: {
        ...dto,
        hireDate: dto.hireDate ? new Date(dto.hireDate) : undefined,
      } as any,
    });
    
    const tenantId = tenantStorage.getStore();
    if (tenantId) {
      await this.dashboardService.invalidateTenantKPICache(tenantId);
      if (actorUserId) {
        await this.audit.log(tenantId, actorUserId, 'employee_updated', {
          module: 'employees',
          entityId: updatedEmp.id,
          employeeIdNumber: updatedEmp.employeeIdNumber,
          fields: Object.keys(dto),
          status: updatedEmp.status,
        });
      }
    }
    
    return updatedEmp;
  }

  /**
   * High-speed in-memory validation & transaction-safe bulk upload ingestion pipeline
   */
  async bulkUpload(fileBuffer: Buffer) {
    const tenantId = tenantStorage.getStore();
    if (tenantId) {
      const hasCapacity = await this.subscriptionService.verifySeatCapacity(tenantId);
      if (!hasCapacity) {
        throw new BadRequestException('Subscription Plan Limit Exceeded. You cannot bulk upload more employees on your current tier.');
      }
    }

    let rawRows: any[] = [];
    try {
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    } catch (err) {
      throw new BadRequestException('Failed to parse spreadsheet file. Please verify file integrity.');
    }

    if (rawRows.length === 0) {
      throw new BadRequestException('The spreadsheet is empty or contains zero rows of data.');
    }

    // Verify all mandatory columns exist
    const firstRowKeys = Object.keys(rawRows[0]);
    const requiredHeaders = [
      'firstName',
      'lastName',
      'employeeIdNumber',
      'phoneNumber',
      'baseSalary',
      'paymentMethod',
      'departmentId',
      'hireDate',
    ];

    const missingHeaders = requiredHeaders.filter(h => !firstRowKeys.includes(h));
    if (missingHeaders.length > 0) {
      throw new BadRequestException(`Spreadsheet is missing required headers: ${missingHeaders.join(', ')}`);
    }

    // Single parallel lookup to resolve database state for O(1) in-memory checks
    const [existingDepartments, existingEmployees] = await Promise.all([
      this.prisma.department.findMany({ select: { id: true } }),
      this.prisma.employee.findMany({ select: { employeeIdNumber: true, phoneNumber: true, faydaNumber: true } }),
    ]);

    const validDepartmentIds = new Set(existingDepartments.map(d => d.id.toLowerCase()));
    const existingDbIdNumbers = new Set(existingEmployees.map(e => e.employeeIdNumber.toLowerCase()));
    const existingDbPhoneNumbers = new Set(existingEmployees.map(e => e.phoneNumber.replace(/\s+/g, '')));
    const existingDbFaydaNumbers = new Set(
      existingEmployees
        .map(e => e.faydaNumber)
        .filter((f): f is string => !!f)
        .map(f => f.trim())
    );

    const fileIdNumbers = new Set<string>();
    const filePhoneNumbers = new Set<string>();
    const fileFaydaNumbers = new Set<string>();

    const employeesToCreate: any[] = [];
    const rowErrors: { row: number; errors: string[] }[] = [];

    const phoneRegex = /^(09|07|\+2519|\+2517)\d{8}$/;
    const generalPhoneRegex = /^\+?[1-9]\d{7,14}$/;
    const faydaRegex = /^\d{12}$/; // Strictly 12 digits

    rawRows.forEach((row, index) => {
      const rowNum = index + 2; // Rows start on spreadsheet line 2 (offsetting header)
      const errors: string[] = [];

      // Cleanse input data values
      const firstName = String(row.firstName || '').trim();
      const lastName = String(row.lastName || '').trim();
      const employeeIdNumber = String(row.employeeIdNumber || '').trim();
      const phoneNumber = String(row.phoneNumber || '').trim();
      const faydaNumber = String(row.faydaNumber || '').trim();
      const baseSalaryStr = String(row.baseSalary || '').trim();
      const paymentMethod = String(row.paymentMethod || 'BANK').trim().toUpperCase();
      const bankName = row.bankName ? String(row.bankName).trim() : null;
      const bankAccount = row.bankAccount ? String(row.bankAccount).trim() : null;
      const departmentId = String(row.departmentId || '').trim();
      const hireDateStr = String(row.hireDate || '').trim();

      if (!firstName) errors.push('firstName is required.');
      if (!lastName) errors.push('lastName is required.');

      // Check Department existence
      if (!departmentId) {
        errors.push('departmentId is required.');
      } else if (!validDepartmentIds.has(departmentId.toLowerCase())) {
        errors.push(`departmentId "${departmentId}" does not exist in your company context.`);
      }

      // Check Employee ID duplicates (file vs DB)
      if (!employeeIdNumber) {
        errors.push('employeeIdNumber is required.');
      } else {
        const lowerId = employeeIdNumber.toLowerCase();
        if (fileIdNumbers.has(lowerId)) {
          errors.push(`Duplicate employeeIdNumber "${employeeIdNumber}" detected in the uploaded file.`);
        } else if (existingDbIdNumbers.has(lowerId)) {
          errors.push(`employeeIdNumber "${employeeIdNumber}" is already registered in this company.`);
        } else {
          fileIdNumbers.add(lowerId);
        }
      }

      // Check Phone duplicates (file vs DB)
      if (!phoneNumber) {
        errors.push('phoneNumber is required.');
      } else {
        const cleanPhone = phoneNumber.replace(/\s+/g, '');
        if (!phoneRegex.test(cleanPhone) && !generalPhoneRegex.test(cleanPhone)) {
          errors.push(`phoneNumber "${phoneNumber}" must be a valid Ethiopian standard or E.164 phone number.`);
        } else if (filePhoneNumbers.has(cleanPhone)) {
          errors.push(`Duplicate phoneNumber "${phoneNumber}" detected in the uploaded file.`);
        } else if (existingDbPhoneNumbers.has(cleanPhone)) {
          errors.push(`phoneNumber "${phoneNumber}" is already registered globally.`);
        } else {
          filePhoneNumbers.add(cleanPhone);
        }
      }

      // Check Fayda ID uniqueness and 12-digit numeric constraint (file vs DB)
      if (faydaNumber) {
        if (!faydaRegex.test(faydaNumber)) {
          errors.push(`faydaNumber "${faydaNumber}" must be exactly a 12-digit numeric string.`);
        } else if (fileFaydaNumbers.has(faydaNumber)) {
          errors.push(`Duplicate faydaNumber "${faydaNumber}" detected in the uploaded file.`);
        } else if (existingDbFaydaNumbers.has(faydaNumber)) {
          errors.push(`faydaNumber "${faydaNumber}" is already registered globally.`);
        } else {
          fileFaydaNumbers.add(faydaNumber);
        }
      }

      // Salary validation
      const salary = parseFloat(baseSalaryStr);
      if (isNaN(salary) || salary <= 0) {
        errors.push(`baseSalary "${baseSalaryStr}" must be a positive number.`);
      }

      // Payment method validation
      if (paymentMethod && !['BANK', 'CHAPA_WALLET'].includes(paymentMethod)) {
        errors.push(`paymentMethod "${paymentMethod}" must be either BANK or CHAPA_WALLET.`);
      }

      // Hire date validation
      const hireDate = new Date(hireDateStr);
      if (isNaN(hireDate.getTime())) {
        errors.push(`hireDate "${hireDateStr}" is not a valid date format.`);
      }

      if (errors.length > 0) {
        rowErrors.push({ row: rowNum, errors });
      } else {
        employeesToCreate.push({
          firstName,
          lastName,
          employeeIdNumber,
          phoneNumber: phoneNumber.replace(/\s+/g, ''),
          faydaNumber: faydaNumber || null,
          baseSalary: salary,
          paymentMethod: paymentMethod || 'BANK',
          bankName,
          bankAccount,
          status: 'ACTIVE',
          departmentId,
          hireDate,
        });
      }
    });

    // Rollback-safe: Reject everything if any row fails validation
    if (rowErrors.length > 0) {
      throw new BadRequestException({
        message: 'Spreadsheet validation failed. No rows were committed to the database.',
        erroredRows: rowErrors,
      });
    }

    if (employeesToCreate.length === 0) {
      throw new BadRequestException('No valid employee records found to onboard.');
    }

    // Generate PINs and hashes for all bulk uploaded employees
    for (const emp of employeesToCreate) {
      const pin = Math.floor(1000 + Math.random() * 9000).toString();
      emp.ussdPin = pin;
      emp.ussdPinHash = await bcrypt.hash(pin, 10);
    }

    // Execute in a transaction. Rollback is triggered automatically if insert fails.
    const results = await this.prisma.$transaction(
      employeesToCreate.map(emp => this.prisma.employee.create({ data: emp as any }))
    );

    if (tenantId) {
      await this.dashboardService.invalidateTenantKPICache(tenantId);
    }

    // Dispatch SMS asynchronously for all bulk employees
    for (const emp of employeesToCreate) {
      this.afromessageService.sendEmployeeMobileCredentials(emp.phoneNumber, emp.firstName, emp.ussdPin).catch(e => console.error(e));
    }

    return {
      message: `Successfully onboarded all ${results.length} employees.`,
      count: results.length,
    };
  }
}