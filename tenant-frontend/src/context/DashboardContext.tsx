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
  handleTriggerDisbursement: (runId: string, totpCode: string) => Promise<void>;
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

      const [brnRes, auditRes] = await Promise.allSettled([
        apiRequest<Branch[]>("/branches"),
        apiRequest<AuditLog[]>("/dashboard/audit-logs"),
      ]);

      if (brnRes.status === "fulfilled") {
        setBranches(brnRes.value);
      }

      if (auditRes.status === "fulfilled") {
        setAuditLogs(auditRes.value);
      }

      if (
        brnRes.status === "fulfilled" ||
        auditRes.status === "fulfilled"
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
      
      setStats(prev => ({ ...prev, totalEmployees: prev.totalEmployees + 1, monthlyPayroll: prev.monthlyPayroll + (created.baseSalary ?? 0) }));
      const pinMsg = created.mobileAppPin
        ? ` Mobile app PIN: ${created.mobileAppPin} (share with employee; also sent by SMS if configured).`
        : "";
      return { success: true, message: "Employee registered." + pinMsg, mobileAppPin: created.mobileAppPin };
    } catch (e: any) {
      return { success: false, message: e.message || "Failed to add employee" };
    }
  };

  const handleUpdateEmployee = async (id: string, updates: Partial<Employee>): Promise<{ success: boolean; message: string }> => {
    try {
      const payload: any = { ...updates };
      if (updates.faydaNumber) payload.faydaNumber = updates.faydaNumber;
      await apiRequest<Employee>(`/employees/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      return { success: true, message: "Employee updated." };
    } catch (e: any) {
      return { success: false, message: e.message || "Failed to update employee." };
    }
  };

  const handleAddBranch = async (newBranch: Omit<Branch, "id">): Promise<{ success: boolean; message: string }> => {
    try {
      const created = await apiRequest<Branch>("/branches", { method: "POST", body: JSON.stringify(newBranch) });
      setBranches(prev => [...prev, created]);
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
      return { success: true, message: "Branch removed." };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not remove branch.";
      return { success: false, message: msg };
    }
  };

  const handleSimulateLog = (newLog: any): void => {
    // Logs are now managed by react-query in individual pages, not context.
    // This is kept as a no-op for interface compatibility.
    console.log('[DashboardContext] handleSimulateLog called — logs moved to react-query', newLog);
  };

  const handleTriggerDisbursement = async (runId: string, totpCode: string) => {
    try {
      await apiRequest(`/api/v1/finance/payroll/${runId}/approve`, {
        method: "POST",
        body: JSON.stringify({ totpToken: totpCode })
      });
      toast.success("Payroll Disbursed", "Successfully initiated payroll disbursement via Chapa.");
      await refreshTenantData();
    } catch (e: any) {
      toast.error("Disbursement Failed", e.message || "Failed to initiate payroll disbursement.");
      throw e;
    }
  };

  return (
    <DashboardContext.Provider value={{
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
