import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceService } from './attendance.service';
import { PrismaService } from '../prisma.service';
import { AttendanceType, AttendanceSource } from '@prisma/client';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('AttendanceService - verifyWebClockIn', () => {
  let service: AttendanceService;
  let prisma: any;

  const mockPrisma = {
    employee: {
      findUnique: jest.fn(),
    },
    attendanceLog: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should log normally without anomalies if employee is inside geofence', async () => {
    const employeeId = 'emp_123';
    const tenantId = 'tenant_123';

    // Mock employee assigned to a branch in Bole, Addis Ababa
    const mockEmployee = {
      id: employeeId,
      tenantId,
      department: {
        branch: {
          latitude: 9.01156, // Bole Center Lat
          longitude: 38.78652, // Bole Center Lon
          geofenceRadiusMeters: 500, // 500m geofence radius
        },
      },
    };

    prisma.employee.findUnique.mockResolvedValue(mockEmployee);
    prisma.attendanceLog.create.mockImplementation((args: any) => Promise.resolve({ id: 'log_abc', ...args.data }));

    // Clock-in coordinates close to Bole center (~50 meters away)
    const clientLat = 9.0118;
    const clientLon = 38.7867;

    const result = await service.verifyWebClockIn(
      employeeId,
      tenantId,
      AttendanceType.CLOCK_IN,
      clientLat,
      clientLon,
    );

    expect(result.isAnomaly).toBe(false);
    expect(result.anomalyReason).toBeNull();
    expect(result.source).toBe(AttendanceSource.WEB_PWA);
    expect(result.type).toBe(AttendanceType.CLOCK_IN);
    expect(result.latitude).toBe(clientLat);
    expect(result.longitude).toBe(clientLon);
    expect(prisma.employee.findUnique).toHaveBeenCalledWith({
      where: { id: employeeId },
      include: { department: { include: { branch: true } } },
    });
  });

  it('should flag as an anomaly and record details if employee is outside geofence', async () => {
    const employeeId = 'emp_456';
    const tenantId = 'tenant_456';

    // Mock branch center
    const mockEmployee = {
      id: employeeId,
      tenantId,
      department: {
        branch: {
          latitude: 9.01156,
          longitude: 38.78652,
          geofenceRadiusMeters: 200, // tight 200m geofence
        },
      },
    };

    prisma.employee.findUnique.mockResolvedValue(mockEmployee);
    prisma.attendanceLog.create.mockImplementation((args: any) => Promise.resolve({ id: 'log_xyz', ...args.data }));

    // Client coordinates far away (e.g. Mexico Square ~5km away)
    const clientLat = 9.0105;
    const clientLon = 38.7423;

    const result = await service.verifyWebClockIn(
      employeeId,
      tenantId,
      AttendanceType.CLOCK_IN,
      clientLat,
      clientLon,
    );

    expect(result.isAnomaly).toBe(true);
    expect(result.anomalyReason).toContain('Geofence Breach: Worker was');
    expect(prisma.attendanceLog.create).toHaveBeenCalled();
  });

  it('should throw NotFoundException if employee does not exist', async () => {
    prisma.employee.findUnique.mockResolvedValue(null);

    await expect(
      service.verifyWebClockIn('none', 'tenant', AttendanceType.CLOCK_IN, 9.0, 38.0),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw BadRequestException if employee department or branch is missing', async () => {
    const mockEmployee = { id: 'emp_no_dept', department: null };
    prisma.employee.findUnique.mockResolvedValue(mockEmployee);

    await expect(
      service.verifyWebClockIn('emp_no_dept', 'tenant', AttendanceType.CLOCK_IN, 9.0, 38.0),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException if branch master coordinates are missing', async () => {
    const mockEmployee = {
      id: 'emp_no_coords',
      department: {
        branch: {
          latitude: null,
          longitude: null,
          geofenceRadiusMeters: 200,
        },
      },
    };
    prisma.employee.findUnique.mockResolvedValue(mockEmployee);

    await expect(
      service.verifyWebClockIn('emp_no_coords', 'tenant', AttendanceType.CLOCK_IN, 9.0, 38.0),
    ).rejects.toThrow(BadRequestException);
  });
});
