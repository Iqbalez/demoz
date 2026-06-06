export const PERMISSIONS = {
  // HR
  VIEW_DIRECTORY: 'view_directory',
  MANAGE_EMPLOYEES: 'manage_employees',
  CREATE_EMPLOYEE: 'create_employee',
  DELETE_EMPLOYEE: 'delete_employee',
  MANAGE_DEPARTMENTS: 'manage_departments',
  
  // Payroll
  VIEW_PAYROLL: 'view_payroll',
  RUN_PAYROLL: 'run_payroll',
  APPROVE_PAYROLL: 'approve_payroll',
  
  // Leave
  VIEW_LEAVES: 'view_leaves',
  MANAGE_LEAVES: 'manage_leaves',
  
  // Attendance
  VIEW_ATTENDANCE: 'view_attendance',
  MANAGE_ATTENDANCE: 'manage_attendance',
  
  // Settings
  VIEW_SETTINGS: 'view_settings',
  MANAGE_SETTINGS: 'manage_settings',
  MANAGE_ROLES: 'manage_roles',
  MANAGE_BILLING: 'manage_billing',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

export const DEFAULT_ROLE_PERMISSIONS: Record<string, Permission[]> = {
  SUPER_ADMIN: Object.values(PERMISSIONS),
  OWNER: Object.values(PERMISSIONS),
  HR: [
    PERMISSIONS.VIEW_DIRECTORY,
    PERMISSIONS.MANAGE_EMPLOYEES,
    PERMISSIONS.CREATE_EMPLOYEE,
    PERMISSIONS.DELETE_EMPLOYEE,
    PERMISSIONS.MANAGE_DEPARTMENTS,
    PERMISSIONS.VIEW_PAYROLL,
    PERMISSIONS.VIEW_LEAVES,
    PERMISSIONS.MANAGE_LEAVES,
    PERMISSIONS.VIEW_ATTENDANCE,
    PERMISSIONS.MANAGE_ATTENDANCE,
    PERMISSIONS.MANAGE_SETTINGS,
  ],
  EMPLOYEE: [
    PERMISSIONS.VIEW_DIRECTORY,
    // Employees can view their own, but these generic flags are broad. 
    // We can use these for now to grant generic "employee" access to modules.
  ],
};

export const PERMISSION_GROUPS = [
  {
    group: 'Human Resources',
    permissions: [
      { id: PERMISSIONS.VIEW_DIRECTORY, label: 'View Directory', desc: 'Can see the employee directory' },
      { id: PERMISSIONS.MANAGE_EMPLOYEES, label: 'Manage Employees', desc: 'Can edit and suspend employees' },
      { id: PERMISSIONS.CREATE_EMPLOYEE, label: 'Create Employees', desc: 'Can onboard new employees' },
      { id: PERMISSIONS.DELETE_EMPLOYEE, label: 'Delete Employees', desc: 'Can permanently delete employees' },
      { id: PERMISSIONS.MANAGE_DEPARTMENTS, label: 'Manage Departments', desc: 'Can manage org charts and departments' },
    ]
  },
  {
    group: 'Payroll',
    permissions: [
      { id: PERMISSIONS.VIEW_PAYROLL, label: 'View Payroll', desc: 'Can view past payroll runs' },
      { id: PERMISSIONS.RUN_PAYROLL, label: 'Run Payroll', desc: 'Can initiate and process new payroll runs' },
      { id: PERMISSIONS.APPROVE_PAYROLL, label: 'Approve Payroll', desc: 'Can approve payroll for payout' },
    ]
  },
  {
    group: 'Time & Attendance',
    permissions: [
      { id: PERMISSIONS.VIEW_ATTENDANCE, label: 'View Attendance', desc: 'Can view company-wide attendance' },
      { id: PERMISSIONS.MANAGE_ATTENDANCE, label: 'Manage Attendance', desc: 'Can correct logs and change configs' },
      { id: PERMISSIONS.VIEW_LEAVES, label: 'View Leaves', desc: 'Can view company-wide leave requests' },
      { id: PERMISSIONS.MANAGE_LEAVES, label: 'Manage Leaves', desc: 'Can approve/reject leave requests' },
    ]
  },
  {
    group: 'Administration',
    permissions: [
      { id: PERMISSIONS.VIEW_SETTINGS, label: 'View Settings', desc: 'Can view company settings' },
      { id: PERMISSIONS.MANAGE_SETTINGS, label: 'Manage Settings', desc: 'Can modify company profile and policies' },
      { id: PERMISSIONS.MANAGE_ROLES, label: 'Manage Roles', desc: 'Can create and assign custom roles' },
      { id: PERMISSIONS.MANAGE_BILLING, label: 'Manage Billing', desc: 'Can view invoices and change subscription' },
    ]
  }
];
