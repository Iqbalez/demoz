"use client";


import { Employee } from "../features/employees/HRDirectory";
import { AttendanceLog, Branch } from "../features/attendance/AttendanceTracker";
import { toast } from "../components/ui/toast";
import { apiRequest, getAuthToken } from "../lib/api";

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  type: "info" | "success" | "warning";
}

interface DashboardContextProps {
  employees: Employee[];
  logs: AttendanceLog[];
  branches: Branch[];
  auditLogs: AuditLog[];
  stats: {
    totalEmployees: number;
    maxEmployees: number;
    attendanceRate: number;
    monthlyPayroll: number;
    planTier: string;
    companyName: string;
  };
  backendStatus: "CONNECTED" | "MOCK";
  isThemeDark: boolean;
  setIsThemeDark: React.Dispatch<React.SetStateAction<boolean>>;
  handleAddEmployee: (newEmp: Omit<Employee, "id" | "hireDate" | "faydaVerified">) => Promise<{ success: boolean; message: string }>;
  handleUpdateEmployee: (id: string, updates: Partial<Employee>) => Promise<{ success: boolean; message: string }>;
  handleAddBranch: (newBranch: Omit<Branch, "id">) => Promise<{ success: boolean; message: string }>;
  handleSimulateLog: (newLog: any) => void;
  handleUpgradePlan: (plan: string, maxEmp: number) => void;
  handleTriggerDisbursement: () => void;
}

const DashboardContext = createContext<DashboardContextProps | undefined>(undefined);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [backendStatus, setBackendStatus] = useState<"CONNECTED" | "MOCK">("MOCK");
  const [isThemeDark, setIsThemeDark] = useState(false);

  const [stats, setStats] = useState({
    totalEmployees: 0,
    maxEmployees: 10,
    attendanceRate: 0,
    monthlyPayroll: 0,
    planTier: "GROWTH",
    companyName: "Your Company",
  });

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Check backend connectivity
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/company-data/login-test`,
          { method: "GET" }
        );
        if (res.ok) setBackendStatus("CONNECTED");
      } catch (err) {
        setBackendStatus("MOCK");
      }
    };
    checkBackend();
  }, []);

  // Load tenant data once JWT is available
  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;
    const loadData = async () => {
      try {
        const [emp, brn, att] = await Promise.all([
          apiRequest<Employee[]>("/employees"),
          apiRequest<Branch[]>("/branches"),
          apiRequest<AttendanceLog[]>("/attendance/logs"),
        ]);
        setEmployees(emp);
        setBranches(brn);
        setLogs(att);
        const totalSalary = emp.reduce((sum, e) => sum + e.baseSalary, 0);
        setStats(prev => ({
          ...prev,
          totalEmployees: emp.length,
          monthlyPayroll: totalSalary,
          attendanceRate: Math.min(100, Math.round((att.length / (emp.length * 30)) * 100)),
        }));
      } catch (e) {
        console.error("Failed to load tenant data", e);
      }
    };
    loadData();
  }, [backendStatus]);

  // Theme toggle
  useEffect(() => {
    const root = window.document.documentElement;
    if (isThemeDark) root.classList.add("dark");
    else root.classList.remove("dark");
  }, [isThemeDark]);

  // CRUD helpers – talk to API
  const handleAddEmployee = async (newEmp) => {
    if (employees.length >= stats.maxEmployees) return { success: false, message: "Seat capacity limit reached." };
    try {
      const created = await apiRequest<Employee>("/employees", { method: "POST", body: JSON.stringify(newEmp) });
      setEmployees(prev => [...prev, created]);
      const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setAuditLogs(prev => [{
        id: `act-${Date.now()}`,
        timestamp: time,
        user: "HR Operator",
        action: `onboarded employee ${created.firstName} ${created.lastName}`,
        type: "success",
      }, ...prev]);
      setStats(prev => ({ ...prev, totalEmployees: prev.totalEmployees + 1, monthlyPayroll: prev.monthlyPayroll + created.baseSalary }));
      return { success: true, message: "Employee added." };
    } catch (e) {
      return { success: false, message: e?.message ?? "Failed to add employee." };
    }
  };

  const handleUpdateEmployee = async (id, updates) => {
    try {
      const updated = await apiRequest<Employee>(`/employees/${id}`, { method: "PATCH", body: JSON.stringify(updates) });
      setEmployees(prev => prev.map(e => (e.id === id ? updated : e)));
      const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setAuditLogs(prev => [{
        id: `act-${Date.now()}`,
        timestamp: time,
        user: "HR Operator",
        action: `updated employee ${updated.firstName} ${updated.lastName}`,
        type: "warning",
      }, ...prev]);
      if (updates.baseSalary) {
        const original = employees.find(e => e.id === id)?.baseSalary ?? 0;
        setStats(prev => ({ ...prev, monthlyPayroll: prev.monthlyPayroll - original + updates.baseSalary }));
      }
      return { success: true, message: "Employee updated." };
    } catch (e) {
      return { success: false, message: e?.message ?? "Failed to update employee." };
    }
  };

  const handleAddBranch = async (newBranch) => {
    try {
      const created = await apiRequest<Branch>("/branches", { method: "POST", body: JSON.stringify(newBranch) });
      setBranches(prev => [...prev, created]);
      const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setAuditLogs(prev => [{
        id: `act-${Date.now()}`,
        timestamp: time,
        user: "HR Operator",
        action: `setup geofenced branch: ${created.name} (Radius: ${created.geofenceRadiusMeters}m)`,
        type: "success",
      }, ...prev]);
      return { success: true, message: "Branch added." };
    } catch (e) {
      return { success: false, message: e?.message ?? "Failed to add branch." };
    }
  };

  const handleSimulateLog = async (newLog) => {
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const logId = `log-${Date.now()}`;
    const added = { id: logId, timestamp: time.slice(0, 8), ...newLog };
    setLogs(prev => [added, ...prev]);
    try { await apiRequest("/attendance/logs", { method: "POST", body: JSON.stringify(added) }); } catch {}
    const actionDesc = newLog.source === "USSD"
      ? `${newLog.type.toLowerCase().replace("_", " ")} via USSD mobile gateway`
      : newLog.source === "WEB_PWA"
      ? `${newLog.type.toLowerCase().replace("_", " ")} via Web PWA browser GPS`
      : `${newLog.type.toLowerCase().replace("_", " ")} via native app`;
    const newAct = {
      id: `act-${Date.now()}`,
      timestamp: time,
      user: newLog.employeeName,
      action: newLog.isAnomaly ? `${actionDesc} (GEOFENCE INFRACTION)` : actionDesc,
      type: newLog.isAnomaly ? "warning" : "success",
    };
    setAuditLogs(prev => [newAct, ...prev]);
    if (newLog.type === "CLOCK_IN") setStats(prev => ({ ...prev, attendanceRate: Math.min(prev.attendanceRate + 2, 100) }));
  };

  const handleUpgradePlan = (plan, maxEmp) => {
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setStats(prev => ({ ...prev, planTier: plan, maxEmployees: maxEmp }));
    setAuditLogs(prev => [{
      id: `act-${Date.now()}`,
      timestamp: time,
      user: "Owner",
      action: `upgraded subscription to ${plan} (seat limit ${maxEmp})`,
      type: "success",
    }, ...prev]);
  };

  const handleTriggerDisbursement = () => {
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setAuditLogs(prev => [{
      id: `act-${Date.now()}`,
      timestamp: time,
      user: "Owner Finance",
      action: `executed bulk disbursement of ${stats.monthlyPayroll.toLocaleString()} ETB via Chapa gateway.`,
      type: "success",
    }, ...prev]);
  };

  return (
    <DashboardContext.Provider value={{
      employees,
      logs,
      branches,
      auditLogs,
      stats,
      backendStatus,
      isThemeDark,
      setIsThemeDark,
      handleAddEmployee,
      handleUpdateEmployee,
      handleAddBranch,
      handleSimulateLog,
      handleUpgradePlan,
      handleTriggerDisbursement,
    }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used inside a DashboardProvider");
  return ctx;
}


/*

import { AttendanceLog, Branch } from "../features/attendance/AttendanceTracker";
import { toast } from "../components/ui/toast";

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  type: "info" | "success" | "warning";
}

interface DashboardContextProps {
  employees: Employee[];
  logs: AttendanceLog[];
  branches: Branch[];
  auditLogs: AuditLog[];
  stats: {
    totalEmployees: number;
    maxEmployees: number;
    attendanceRate: number;
    monthlyPayroll: number;
    planTier: string;
    companyName: string;
  };
  backendStatus: "CONNECTED" | "MOCK";
  isThemeDark: boolean;
  setIsThemeDark: React.Dispatch<React.SetStateAction<boolean>>;
  handleAddEmployee: (newEmp: Omit<Employee, "id" | "hireDate" | "faydaVerified">) => { success: boolean; message: string };
  handleUpdateEmployee: (id: string, updates: Partial<Employee>) => { success: boolean; message: string };
  handleAddBranch: (newBranch: Omit<Branch, "id">) => { success: boolean; message: string };
  handleSimulateLog: (newLog: any) => void;
  handleUpgradePlan: (plan: string, maxEmp: number) => void;
  handleTriggerDisbursement: () => void;
}

const DashboardContext = createContext<DashboardContextProps | undefined>(undefined);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [backendStatus, setBackendStatus] = useState<"CONNECTED" | "MOCK">("MOCK");
  const [isThemeDark, setIsThemeDark] = useState(false);

  // Stats State
  const [stats, setStats] = useState({
    totalEmployees: 4,
    maxEmployees: 10,
    attendanceRate: 92,
    monthlyPayroll: 97500,
    planTier: "GROWTH",
    companyName: "qali",
  });

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedTier = localStorage.getItem("demoz_tier");
      const storedCompany = localStorage.getItem("demoz_company");
      if (storedTier || storedCompany) {
        setStats(prev => ({
          ...prev,
          planTier: storedTier || prev.planTier,
          companyName: storedCompany || prev.companyName,
          maxEmployees: storedTier === "ENTERPRISE" ? 1000 : storedTier === "GROWTH" ? 50 : 10
        }));
      }
    }
  }, []);

  // Seed Employees
  const [employees, setEmployees] = useState<Employee[]>([
    {
      id: "emp-1",
      firstName: "Ramzi",
      lastName: "Amin",
      employeeIdNumber: "EMP-4820",
      phoneNumber: "0911000001",
      departmentName: "HR / Admin",
      baseSalary: 25000,
      faydaNumber: "192837465012",
      status: "ACTIVE",
      hireDate: "2024-01-15",
      faydaVerified: true,
    },
    {
      id: "emp-2",
      firstName: "Selam",
      lastName: "Tesfaye",
      employeeIdNumber: "EMP-9281",
      phoneNumber: "0911000002",
      departmentName: "Tech / Engineering",
      baseSalary: 38000,
      faydaNumber: "827364510293",
      status: "ACTIVE",
      hireDate: "2024-03-10",
      faydaVerified: true,
    },
    {
      id: "emp-3",
      firstName: "Almaz",
      lastName: "Bekele",
      employeeIdNumber: "EMP-1082",
      phoneNumber: "0911000003",
      departmentName: "Finance",
      baseSalary: 18500,
      faydaNumber: "473829104829",
      status: "ACTIVE",
      hireDate: "2024-06-20",
      faydaVerified: true,
    },
    {
      id: "emp-4",
      firstName: "Yosef",
      lastName: "Girma",
      employeeIdNumber: "EMP-3942",
      phoneNumber: "0911000004",
      departmentName: "Operations",
      baseSalary: 16000,
      faydaNumber: "384910293847",
      status: "ACTIVE",
      hireDate: "2025-02-01",
      faydaVerified: false,
    },
  ]);

  // Seed Attendance Logs
  const [logs, setLogs] = useState<AttendanceLog[]>([
    {
      id: "log-1",
      employeeName: "Ramzi Amin",
      phoneNumber: "0911000001",
      timestamp: "08:32 AM",
      type: "CLOCK_IN",
      source: "USSD",
      latitude: null,
      longitude: null,
      isAnomaly: false,
      anomalyReason: null,
    },
    {
      id: "log-2",
      employeeName: "Selam Tesfaye",
      phoneNumber: "0911000002",
      timestamp: "08:45 AM",
      type: "CLOCK_IN",
      source: "WEB_PWA",
      latitude: 9.0305,
      longitude: 38.7405,
      isAnomaly: false,
      anomalyReason: null,
    },
    {
      id: "log-3",
      employeeName: "Almaz Bekele",
      phoneNumber: "0911000003",
      timestamp: "09:02 AM",
      type: "CLOCK_IN",
      source: "USSD",
      latitude: null,
      longitude: null,
      isAnomaly: false,
      anomalyReason: null,
    },
  ]);

  // Seed Branches
  const [branches, setBranches] = useState<Branch[]>([
    {
      id: "branch-1",
      name: "Head Office",
      location: "Addis Ababa, Piazza",
      latitude: 9.0300,
      longitude: 38.7400,
      geofenceRadiusMeters: 100,
    },
    {
      id: "branch-2",
      name: "Bole Branch",
      location: "Addis Ababa, Bole Medhanialem",
      latitude: 9.0010,
      longitude: 38.7830,
      geofenceRadiusMeters: 150,
    },
  ]);

  // Appendix Corporate Audit Trails
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([
    { id: "act-1", timestamp: "08:32 AM", user: "Ramzi Amin", action: "clocked in via USSD Cell-Tower (Head Office)", type: "info" },
    { id: "act-2", timestamp: "08:45 AM", user: "Selam Tesfaye", action: "clocked in via Web PWA (Compliant GPS)", type: "success" },
    { id: "act-3", timestamp: "09:02 AM", user: "Almaz Bekele", action: "clocked in via USSD Cell-Tower (Bole Branch)", type: "info" },
    { id: "act-4", timestamp: "09:05 AM", user: "System", action: "Active satellite GPS link synchronized.", type: "success" },
  ]);

  // Verify backend on mount
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}`}/company-data/login-test`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        if (res.ok) {
          setBackendStatus("CONNECTED");
        }
      } catch (err) {
        setBackendStatus("MOCK");
      }
    };
    checkBackend();
  }, []);

  // Update theme tag
  useEffect(() => {
    const root = window.document.documentElement;
    if (isThemeDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [isThemeDark]);

  // Onboard Employee
  const handleAddEmployee = (newEmp: Omit<Employee, "id" | "hireDate" | "faydaVerified">) => {
    if (employees.length >= stats.maxEmployees) {
      return { success: false, message: "Onboarding blocked: seat capacity limit reached." };
    }

    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const id = `emp-${Math.floor(1000 + Math.random() * 9000)}`;
    const addedEmployee: Employee = {
      ...newEmp,
      id,
      hireDate: new Date().toISOString().split("T")[0],
      faydaVerified: true,
    };

    setEmployees((prev) => [...prev, addedEmployee]);

    // Log activity
    const newAct = {
      id: `act-${Math.floor(10000 + Math.random() * 90000)}`,
      timestamp: timeStr,
      user: "HR Operator",
      action: `onboarded employee ${newEmp.firstName} ${newEmp.lastName} (Fayda Verified)`,
      type: "success" as const,
    };
    setAuditLogs((prev) => [newAct, ...prev]);

    // Update stats
    setStats((prev) => ({
      ...prev,
      totalEmployees: prev.totalEmployees + 1,
      monthlyPayroll: prev.monthlyPayroll + newEmp.baseSalary,
    }));

    return { success: true, message: "Onboarding successful!" };
  };

  // Update Employee Profile
  const handleUpdateEmployee = (id: string, updates: Partial<Employee>) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    let originalSalary = 0;
    let newSalary = updates.baseSalary || 0;

    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id === id) {
          originalSalary = emp.baseSalary;
          return { ...emp, ...updates } as Employee;
        }
        return emp;
      })
    );

    // Log activity
    const targetEmp = employees.find((e) => e.id === id);
    if (targetEmp) {
      const newAct = {
        id: `act-${Math.floor(10000 + Math.random() * 90000)}`,
        timestamp: timeStr,
        user: "HR Operator",
        action: `updated settings for employee ${targetEmp.firstName} ${targetEmp.lastName}`,
        type: "warning" as const,
      };
      setAuditLogs((prev) => [newAct, ...prev]);
    }

    // Adjust monthly payroll sums
    if (newSalary && originalSalary) {
      setStats((prev) => ({
        ...prev,
        monthlyPayroll: prev.monthlyPayroll - originalSalary + newSalary,
      }));
    }

    return { success: true, message: "Profile updated!" };
  };

  // Add geofenced office node
  const handleAddBranch = (newBranch: Omit<Branch, "id">) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const id = `branch-${Math.floor(1000 + Math.random() * 9000)}`;
    const addedBranch: Branch = {
      ...newBranch,
      id,
    };

    setBranches((prev) => [...prev, addedBranch]);

    // Append to logs
    const newAct = {
      id: `act-${Math.floor(10000 + Math.random() * 90000)}`,
      timestamp: timeStr,
      user: "HR Operator",
      action: `setup geofenced branch: ${newBranch.name} (Radius: ${newBranch.geofenceRadiusMeters}m)`,
      type: "success" as const,
    };
    setAuditLogs((prev) => [newAct, ...prev]);

    return { success: true, message: "Branch geofence synchronized!" };
  };

  // Simulate logs
  const handleSimulateLog = (newLog: any) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const logId = `log-${Math.floor(10000 + Math.random() * 90000)}`;

    const added: AttendanceLog = {
      id: logId,
      timestamp: timeStr.slice(0, 8),
      ...newLog,
    };

    setLogs((prev) => [added, ...prev]);

    let actionDesc = "";
    if (newLog.source === "USSD") {
      actionDesc = `${newLog.type.toLowerCase().replace("_", " ")} via USSD mobile gateway`;
    } else if (newLog.source === "WEB_PWA") {
      actionDesc = `${newLog.type.toLowerCase().replace("_", " ")} via Web PWA browser GPS`;
    } else {
      actionDesc = `${newLog.type.toLowerCase().replace("_", " ")} via secure Expo Native App`;
    }

    if (newLog.isAnomaly) {
      actionDesc += ` (GEOFENCE INFRACTION REGISTRY)`;
    }

    const actId = `act-${Math.floor(10000 + Math.random() * 90000)}`;
    const newAct: AuditLog = {
      id: actId,
      timestamp: timeStr,
      user: newLog.employeeName,
      action: actionDesc,
      type: newLog.isAnomaly ? "warning" : "success",
    };

    setAuditLogs((prev) => [newAct, ...prev]);

    if (newLog.type === "CLOCK_IN") {
      setStats((prev) => ({
        ...prev,
        attendanceRate: Math.min(prev.attendanceRate + 2, 100),
      }));
    }
  };

  const handleUpgradePlan = (plan: string, maxEmp: number) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    setStats((prev) => ({
      ...prev,
      planTier: plan,
      maxEmployees: maxEmp,
    }));

    const newAct = {
      id: `act-${Math.floor(10000 + Math.random() * 90000)}`,
      timestamp: timeStr,
      user: "Owner",
      action: `upgraded subscription package to ${plan} (Employee limit set to ${maxEmp} seats)`,
      type: "success" as const,
    };
    setAuditLogs((prev) => [newAct, ...prev]);
  };

  const handleTriggerDisbursement = () => {
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const newAct = {
      id: `act-${Math.floor(10000 + Math.random() * 90000)}`,
      timestamp: timeStr,
      user: "Owner Finance",
      action: `executed bulk disbursement of ${stats.monthlyPayroll.toLocaleString()} ETB via secure Chapa gateway.`,
      type: "success" as const,
    };
    setAuditLogs((prev) => [newAct, ...prev]);
  };

  return (
    <DashboardContext.Provider
      value={{
        employees,
        logs,
        branches,
        auditLogs,
        stats,
        backendStatus,
        isThemeDark,
        setIsThemeDark,
        handleAddEmployee,
        handleUpdateEmployee,
        handleAddBranch,
        handleSimulateLog,
        handleUpgradePlan,
        handleTriggerDisbursement,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard must be used inside a DashboardProvider");
  }
  return context;
}
*/
