"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Employee } from "../features/employees/HRDirectory";
import { AttendanceLog, Branch } from "../features/attendance/AttendanceTracker";
import { toast } from "../components/ui/toast";
import { apiRequest } from "../lib/api";
import { useAuth } from "./AuthContext";

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
  handleUpdateBranch: (id: string, updates: Omit<Branch, "id">) => Promise<{ success: boolean; message: string }>;
  handleDeleteBranch: (id: string) => Promise<{ success: boolean; message: string }>;
  refreshTenantData: () => Promise<void>;
  handleSimulateLog: (newLog: any) => void;
  handleUpgradePlan: (plan: string, maxEmp: number) => void;
  handleTriggerDisbursement: () => void;
}

const DashboardContext = createContext<DashboardContextProps | undefined>(undefined);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
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

  // Workspace name and plan from authenticated session (real tenant from DB)
  useEffect(() => {
    if (authLoading || !user || user.role === "SUPER_ADMIN") return;

    setStats((prev) => ({
      ...prev,
      companyName: user.companyName?.trim() || prev.companyName,
      planTier: user.planTier ?? prev.planTier,
      maxEmployees: user.maxEmployees ?? prev.maxEmployees,
    }));

    if (user.companyName && typeof window !== "undefined") {
      localStorage.setItem("demoz_company", user.companyName);
    }
    if (user.planTier && typeof window !== "undefined") {
      localStorage.setItem("demoz_tier", user.planTier);
    }
  }, [user, authLoading]);

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

  // Load tenant data when logged in (HttpOnly cookie session)
  const refreshTenantData = React.useCallback(async () => {
    if (authLoading || !user || user.role === "SUPER_ADMIN") return;

    try {
      await apiRequest("/workspace/bootstrap").catch(() => undefined);

      const [empRes, brnRes, attRes] = await Promise.allSettled([
        apiRequest<{ data: Employee[] } | Employee[]>("/employees?page=1&limit=500"),
        apiRequest<Branch[]>("/branches"),
        apiRequest<AttendanceLog[]>("/api/v1/attendance/logs"),
      ]);

      if (empRes.status === "fulfilled") {
        const emp = Array.isArray(empRes.value) ? empRes.value : empRes.value.data ?? [];
        setEmployees(emp);
        const totalSalary = emp.reduce((sum: number, e: Employee) => sum + (e.baseSalary ?? 0), 0);
        setStats((prev) => ({
          ...prev,
          totalEmployees: emp.length,
          monthlyPayroll: totalSalary,
        }));
      }

      if (brnRes.status === "fulfilled") {
        setBranches(brnRes.value);
      }

      if (attRes.status === "fulfilled") {
        const att = attRes.value;
        setLogs(att);
        setStats((prev) => ({
          ...prev,
          attendanceRate:
            prev.totalEmployees > 0
              ? Math.min(100, Math.round((att.length / (prev.totalEmployees * 30)) * 100))
              : 0,
        }));
      }

      if (
        empRes.status === "fulfilled" ||
        brnRes.status === "fulfilled" ||
        attRes.status === "fulfilled"
      ) {
        setBackendStatus("CONNECTED");
      }
    } catch (e) {
      console.error("Failed to load tenant data", e);
    }
  }, [user, authLoading]);

  useEffect(() => {
    refreshTenantData();
    const poll = setInterval(refreshTenantData, 20000);
    return () => clearInterval(poll);
  }, [refreshTenantData, backendStatus]);

  // Theme toggle
  useEffect(() => {
    const root = window.document.documentElement;
    if (isThemeDark) root.classList.add("dark");
    else root.classList.remove("dark");
  }, [isThemeDark]);

  // CRUD helpers – talk to API
  const handleAddEmployee = async (newEmp: Omit<Employee, "id" | "hireDate" | "faydaVerified">): Promise<{ success: boolean; message: string; mobileAppPin?: string }> => {
    if (employees.length >= stats.maxEmployees) return { success: false, message: "Seat capacity limit reached." };
    try {
      const payload = {
        firstName: newEmp.firstName,
        lastName: newEmp.lastName,
        employeeIdNumber: newEmp.employeeIdNumber,
        phoneNumber: newEmp.phoneNumber,
        baseSalary: newEmp.baseSalary ?? 0,
        departmentName: newEmp.departmentName || "General",
        status: newEmp.status || "ACTIVE",
        hireDate: new Date().toISOString().split("T")[0],
        ...(newEmp.faydaNumber ? { faydaNumber: newEmp.faydaNumber } : {}),
      };
      const created = await apiRequest<Employee & { mobileAppPin?: string }>("/employees", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const normalized: Employee = {
        ...created,
        departmentName: created.departmentName || newEmp.departmentName || "General",
        baseSalary: created.baseSalary ?? newEmp.baseSalary,
        faydaNumber: created.faydaNumber ?? newEmp.faydaNumber,
        faydaVerified: /^\d{12}$/.test(String(created.faydaNumber ?? newEmp.faydaNumber ?? "").trim()),
      };
      setEmployees(prev => [...prev, normalized]);
      const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setAuditLogs(prev => [{
        id: `act-${Date.now()}`,
        timestamp: time,
        user: "HR Operator",
        action: `onboarded employee ${normalized.firstName} ${normalized.lastName}`,
        type: "success",
      }, ...prev]);
      setStats(prev => ({ ...prev, totalEmployees: prev.totalEmployees + 1, monthlyPayroll: prev.monthlyPayroll + (normalized.baseSalary ?? 0) }));
      const pinMsg = created.mobileAppPin
        ? ` Mobile app PIN: ${created.mobileAppPin} (share with employee; also sent by SMS if configured).`
        : "";
      return { success: true, message: `Employee added.${pinMsg}`, mobileAppPin: created.mobileAppPin };
    } catch (e: any) {
      // Offline fallback
      const id = `emp-${Math.floor(1000 + Math.random() * 9000)}`;
      const created: Employee = {
        ...newEmp,
        id,
        hireDate: new Date().toISOString().split("T")[0],
        faydaVerified: /^\d{12}$/.test((newEmp.faydaNumber || "").trim()),
      };
      setEmployees(prev => [...prev, created]);
      const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setAuditLogs(prev => [{
        id: `act-${Date.now()}`,
        timestamp: time,
        user: "HR Operator",
        action: `onboarded employee ${created.firstName} ${created.lastName} (Offline)`,
        type: "success",
      }, ...prev]);
      setStats(prev => ({ ...prev, totalEmployees: prev.totalEmployees + 1, monthlyPayroll: prev.monthlyPayroll + (created.baseSalary ?? 0) }));
      return { success: true, message: "Employee added (Offline)." };
    }
  };

  const handleUpdateEmployee = async (id: string, updates: Partial<Employee>): Promise<{ success: boolean; message: string }> => {
    try {
      const updated = await apiRequest<Employee>(`/employees/${id}`, { method: "PATCH", body: JSON.stringify(updates) });
      setEmployees(prev => prev.map(e => (e.id === id ? updated : e)));
      const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setAuditLogs(prev => [{
        id: `act-${Date.now()}`,
        timestamp: time,
        user: "HR Operator",
        action: `updated employee ${updated.firstName} ${updated.lastName}`,
        type: "warning" as const,
      }, ...prev]);
        if (updates.baseSalary !== undefined) {
          const original = employees.find(e => e.id === id)?.baseSalary ?? 0;
          const newSalary = updates.baseSalary;
          setStats(prev => ({ ...prev, monthlyPayroll: prev.monthlyPayroll - original + newSalary }));
        }
      return { success: true, message: "Employee updated." };
    } catch (e: any) {
      // Offline fallback
      setEmployees(prev => prev.map(e => (e.id === id ? { ...e, ...updates } as Employee : e)));
      const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const targetEmp = employees.find(e => e.id === id);
      if (targetEmp) {
        setAuditLogs(prev => [{
          id: `act-${Date.now()}`,
          timestamp: time,
          user: "HR Operator",
          action: `updated employee ${targetEmp.firstName} ${targetEmp.lastName} (Offline)`,
          type: "warning" as const,
        }, ...prev]);
      }
      if (updates.baseSalary !== undefined) {
        const original = employees.find(e => e.id === id)?.baseSalary ?? 0;
        const newSalary = updates.baseSalary;
        setStats(prev => ({ ...prev, monthlyPayroll: prev.monthlyPayroll - original + newSalary }));
      }
      return { success: true, message: "Employee updated (Offline)." };
    }
  };

  const handleAddBranch = async (newBranch: Omit<Branch, "id">): Promise<{ success: boolean; message: string }> => {
    try {
      const created = await apiRequest<Branch>("/branches", { method: "POST", body: JSON.stringify(newBranch) });
      setBranches(prev => [...prev, created]);
      const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setAuditLogs(prev => [{
        id: `act-${Date.now()}`,
        timestamp: time,
        user: "HR Operator",
        action: `setup geofenced branch: ${created.name} (Radius: ${created.geofenceRadiusMeters}m)`,
        type: "success" as const,
      }, ...prev]);
      return { success: true, message: "Branch added." };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not save branch to the server.";
      return { success: false, message: msg };
    }
  };

  const handleUpdateBranch = async (
    id: string,
    updates: Omit<Branch, "id">,
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const updated = await apiRequest<Branch>(`/branches/${id}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
      setBranches((prev) => prev.map((b) => (b.id === id ? updated : b)));
      const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setAuditLogs((prev) => [{
        id: `act-${Date.now()}`,
        timestamp: time,
        user: "HR Operator",
        action: `updated branch ${updated.name}`,
        type: "warning" as const,
      }, ...prev]);
      return { success: true, message: "Branch updated." };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not update branch.";
      return { success: false, message: msg };
    }
  };

  const handleDeleteBranch = async (id: string): Promise<{ success: boolean; message: string }> => {
    try {
      const removed = branches.find((b) => b.id === id);
      await apiRequest(`/branches/${id}`, { method: "DELETE" });
      setBranches((prev) => prev.filter((b) => b.id !== id));
      const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setAuditLogs((prev) => [{
        id: `act-${Date.now()}`,
        timestamp: time,
        user: "HR Operator",
        action: `removed branch ${removed?.name ?? id}`,
        type: "warning" as const,
      }, ...prev]);
      return { success: true, message: "Branch removed." };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not remove branch.";
      return { success: false, message: msg };
    }
  };

  const handleSimulateLog = (newLog: Partial<AttendanceLog> & Pick<AttendanceLog, "employeeName" | "type" | "source">): void => {
    const logId = `log-${Date.now()}`;
    const added: AttendanceLog = {
      id: logId,
      timestamp: new Date().toISOString(),
      phoneNumber: newLog.phoneNumber ?? "",
      latitude: newLog.latitude ?? null,
      longitude: newLog.longitude ?? null,
      isAnomaly: newLog.isAnomaly ?? false,
      anomalyReason: newLog.anomalyReason ?? null,
      ...newLog,
    };
    setLogs(prev => [added, ...prev]);
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const actionDesc = newLog.source === "USSD"
      ? `${newLog.type.toLowerCase().replace("_", " ")} via USSD mobile gateway`
      : newLog.source === "WEB_PWA"
      ? `${newLog.type.toLowerCase().replace("_", " ")} via Web PWA browser GPS`
      : `${newLog.type.toLowerCase().replace("_", " ")} via native app`;
    const newAct: AuditLog = {
      id: `act-${Date.now()}`,
      timestamp: time,
      user: newLog.employeeName,
      action: newLog.isAnomaly ? `${actionDesc} (GEOFENCE INFRACTION)` : actionDesc,
      type: newLog.isAnomaly ? "warning" as const : "success" as const,
    };
    setAuditLogs(prev => [newAct, ...prev]);
    if (newLog.type === "CLOCK_IN") setStats(prev => ({ ...prev, attendanceRate: Math.min(prev.attendanceRate + 2, 100) }));
  };
  const handleUpgradePlan = (plan: string, maxEmp: number) => {
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setStats(prev => ({ ...prev, planTier: plan, maxEmployees: maxEmp }));
    setAuditLogs(prev => [{ id: `act-${Date.now()}`, timestamp: time, user: "Owner", action: `upgraded subscription to ${plan} (seat limit ${maxEmp})`, type: "success" }, ...prev]);
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
      handleUpdateBranch,
      handleDeleteBranch,
      refreshTenantData,
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
