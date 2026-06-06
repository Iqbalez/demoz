export const PERMISSIONS = {
  // HR
  VIEW_DIRECTORY: 'view_directory',
  MANAGE_EMPLOYEES: 'manage_employees',
  MANAGE_DEPARTMENTS: 'manage_departments',
  
  // Payroll
  VIEW_PAYROLL: 'view_payroll',
  MANAGE_PAYROLL: 'manage_payroll',
  RUN_PAYROLL: 'run_payroll',
  APPROVE_PAYROLL: 'approve_payroll',
  
  // Leave
  VIEW_LEAVES: 'view_leaves',
  MANAGE_LEAVES: 'manage_leaves',
  EDIT_LEAVE_POLICY: 'edit_leave_policy',
  
  // Attendance
  VIEW_ATTENDANCE: 'view_attendance',
  MANAGE_ATTENDANCE: 'manage_attendance',
  EDIT_ATTENDANCE: 'edit_attendance',
  
  // Settings & Admin
  VIEW_SETTINGS: 'view_settings',
  MANAGE_SETTINGS: 'manage_settings',
  EDIT_COMPANY: 'edit_company',
  MANAGE_ROLES: 'manage_roles',
  VIEW_AUDIT_LOG: 'view_audit_log',
  
  // Billing
  VIEW_BILLING: 'view_billing',
  MANAGE_BILLING: 'manage_billing',
  MANAGE_SUBSCRIPTION: 'manage_subscription',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

export const DEFAULT_ROLE_PERMISSIONS: Record<string, Permission[]> = {
  SUPER_ADMIN: Object.values(PERMISSIONS),
  OWNER: Object.values(PERMISSIONS),
  HR: [
    PERMISSIONS.VIEW_DIRECTORY,
    PERMISSIONS.MANAGE_EMPLOYEES,
    PERMISSIONS.MANAGE_DEPARTMENTS,
    PERMISSIONS.VIEW_PAYROLL,
    PERMISSIONS.MANAGE_PAYROLL,
    PERMISSIONS.VIEW_LEAVES,
    PERMISSIONS.MANAGE_LEAVES,
    PERMISSIONS.EDIT_LEAVE_POLICY,
    PERMISSIONS.VIEW_ATTENDANCE,
    PERMISSIONS.MANAGE_ATTENDANCE,
    PERMISSIONS.EDIT_ATTENDANCE,
    PERMISSIONS.VIEW_SETTINGS,
    PERMISSIONS.MANAGE_SETTINGS,
    PERMISSIONS.EDIT_COMPANY,
    PERMISSIONS.VIEW_AUDIT_LOG,
  ],
  EMPLOYEE: [
    PERMISSIONS.VIEW_DIRECTORY,
  ],
};

export const PERMISSION_GROUPS = [
  {
    group: 'Human Resources',
    permissions: [
      { id: PERMISSIONS.VIEW_DIRECTORY, label: 'View Directory', desc: 'Can see the employee directory' },
      { id: PERMISSIONS.MANAGE_EMPLOYEES, label: 'Manage Employees', desc: 'Can create, edit, and suspend employees' },
      { id: PERMISSIONS.MANAGE_DEPARTMENTS, label: 'Manage Departments', desc: 'Can manage org charts and departments' },
    ]
  },
  {
    group: 'Payroll',
    permissions: [
      { id: PERMISSIONS.VIEW_PAYROLL, label: 'View Payroll', desc: 'Can view past payroll runs' },
      { id: PERMISSIONS.MANAGE_PAYROLL, label: 'Manage Payroll', desc: 'Can configure payroll settings' },
      { id: PERMISSIONS.RUN_PAYROLL, label: 'Run Payroll', desc: 'Can initiate and process new payroll runs' },
      { id: PERMISSIONS.APPROVE_PAYROLL, label: 'Approve Payroll', desc: 'Can approve payroll for payout' },
    ]
  },
  {
    group: 'Time & Attendance',
    permissions: [
      { id: PERMISSIONS.VIEW_ATTENDANCE, label: 'View Attendance', desc: 'Can view company-wide attendance' },
      { id: PERMISSIONS.MANAGE_ATTENDANCE, label: 'Manage Attendance', desc: 'Can correct logs and change configs' },
      { id: PERMISSIONS.EDIT_ATTENDANCE, label: 'Edit Attendance Config', desc: 'Can modify attendance settings' },
      { id: PERMISSIONS.VIEW_LEAVES, label: 'View Leaves', desc: 'Can view company-wide leave requests' },
      { id: PERMISSIONS.MANAGE_LEAVES, label: 'Manage Leaves', desc: 'Can approve/reject leave requests' },
      { id: PERMISSIONS.EDIT_LEAVE_POLICY, label: 'Edit Leave Policy', desc: 'Can modify leave types and policies' },
    ]
  },
  {
    group: 'Administration',
    permissions: [
      { id: PERMISSIONS.VIEW_SETTINGS, label: 'View Settings', desc: 'Can view company settings' },
      { id: PERMISSIONS.MANAGE_SETTINGS, label: 'Manage Settings', desc: 'Can modify company profile and policies' },
      { id: PERMISSIONS.EDIT_COMPANY, label: 'Edit Company Profile', desc: 'Can modify company information' },
      { id: PERMISSIONS.MANAGE_ROLES, label: 'Manage Roles', desc: 'Can create and assign custom roles' },
      { id: PERMISSIONS.VIEW_AUDIT_LOG, label: 'View Audit Log', desc: 'Can view system audit trail' },
      { id: PERMISSIONS.VIEW_BILLING, label: 'View Billing', desc: 'Can view invoices and subscription' },
      { id: PERMISSIONS.MANAGE_BILLING, label: 'Manage Billing', desc: 'Can view invoices and change subscription' },
      { id: PERMISSIONS.MANAGE_SUBSCRIPTION, label: 'Manage Subscription', desc: 'Can upgrade, downgrade, or cancel subscription' },
    ]
  }
];
