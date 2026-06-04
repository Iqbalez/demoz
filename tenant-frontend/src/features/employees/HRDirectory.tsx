"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Skeleton } from "../../components/ui/skeleton";
import { toast } from "../../components/ui/toast";
import {
  faydaBadgeClass,
  faydaStatusLabel,
  getFaydaComplianceStatus,
} from "../../lib/fayda-status";
import { EmployeeMobilePinModal } from "../../components/employees/EmployeeMobilePinModal";

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  employeeIdNumber: string;
  phoneNumber: string;
  departmentName: string;
  baseSalary?: number;
  faydaNumber?: string;
  status: "ACTIVE" | "SUSPENDED";
  hireDate: string;
  faydaVerified?: boolean;
}

export interface HRDirectoryProps {
  employees: Employee[];
  maxEmployees: number;
  onAddEmployee: (employee: Omit<Employee, "id" | "hireDate" | "faydaVerified">) => Promise<{ success: boolean; message: string; mobileAppPin?: string }>;
  onUpdateEmployee: (id: string, updates: Partial<Employee>) => Promise<{ success: boolean; message: string }>;
}

export default function HRDirectory({
  employees,
  maxEmployees,
  onAddEmployee,
  onUpdateEmployee,
}: HRDirectoryProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  
  // Local optimistic state for employees list
  const [localEmployees, setLocalEmployees] = useState<Employee[]>(employees);

  useEffect(() => {
    setLocalEmployees(employees);
  }, [employees]);

  // Onboarding Wizard steps: 1 (Personal) | 2 (Financial) | 3 (Biometrics & Review)
  const [wizardStep, setWizardStep] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Form States (for onboarding and updates)
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [empId, setEmpId] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("Operations");
  const [salary, setSalary] = useState("15000");
  const [fayda, setFayda] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "SUSPENDED">("ACTIVE");
  const [mobilePinCredentials, setMobilePinCredentials] = useState<{
    employeeName: string;
    phoneNumber: string;
    mobileAppPin: string;
  } | null>(null);

  // Suspension Modal State
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [suspendDate, setSuspendDate] = useState(new Date().toISOString().slice(0, 10));
  const [finalPayOwed, setFinalPayOwed] = useState("");

  // Local URL filter inputs
  const currentSearch = searchParams.get("search") || "";
  const currentStatus = searchParams.get("status") || "ALL";
  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const itemsPerPage = 3;

  const [searchInput, setSearchInput] = useState(currentSearch);

  // Sync search parameters to the router URL
  const updateUrlParams = (newParams: Record<string, string | number>) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(newParams).forEach(([key, val]) => {
        if (val === "" || val === "ALL") {
          params.delete(key);
        } else {
          params.set(key, String(val));
        }
      });
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  // Perform search input query updates
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchInput !== currentSearch) {
        updateUrlParams({ search: searchInput, page: 1 });
      }
    }, 450);
    return () => clearTimeout(delayDebounce);
  }, [searchInput]);

  // Filter & Paginate
  const filteredEmployees = localEmployees.filter((emp) => {
    const matchesSearch =
      `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(currentSearch.toLowerCase()) ||
      emp.employeeIdNumber.toLowerCase().includes(currentSearch.toLowerCase()) ||
      emp.phoneNumber.includes(currentSearch);

    const matchesStatus = currentStatus === "ALL" || emp.status === currentStatus;

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const paginatedEmployees = filteredEmployees.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleOpenAddModal = () => {
    if (localEmployees.length >= maxEmployees) {
      toast.error(
        "Plan seat limit reached!",
        `You have used ${employees.length}/${maxEmployees} seats. Upgrade plan to expand.`
      );
      return;
    }
    router.push("/dashboard/employees/onboarding");
  };

  const handleOpenSuspendModal = (emp: Employee) => {
    setSelectedEmployee(emp);
    setSuspendReason("");
    setSuspendDate(new Date().toISOString().slice(0, 10));
    setFinalPayOwed("");
    setShowSuspendModal(true);
  };

  const handleSuspendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    if (!suspendReason || !suspendDate) {
      toast.warning("Incomplete Fields", "Please provide a reason and effective date for the suspension.");
      return;
    }

    const previousEmployees = [...localEmployees];

    const updatedEmployee: Employee = {
      ...selectedEmployee,
      status: "SUSPENDED",
    };

    setLocalEmployees((prev) =>
      prev.map((emp) => (emp.id === selectedEmployee.id ? updatedEmployee : emp))
    );
    setShowSuspendModal(false);

    try {
      const result = await onUpdateEmployee(selectedEmployee.id, {
        status: "SUSPENDED",
        // Pass extra metadata if the backend DTO supports it
        ...( { suspensionReason: suspendReason, suspensionDate: suspendDate, finalPayInfo: { owed: finalPayOwed } } as any )
      });

      if (!result.success) {
        setLocalEmployees(previousEmployees);
        toast.error("Registry Sync Failed", `${result.message || "A constraint breach was detected."}. Rollback performed.`);
      } else {
        toast.success("Employee Suspended", `${selectedEmployee.firstName} has been officially suspended.`);
      }
    } catch (err: any) {
      setLocalEmployees(previousEmployees);
      toast.error("Sync Network Error", `Synchronization failed. Registry state rolled back.`);
    }
  };

  const handleOpenEditModal = (emp: Employee) => {
    setSelectedEmployee(emp);
    setFirstName(emp.firstName);
    setLastName(emp.lastName);
    setEmpId(emp.employeeIdNumber);
    setPhone(emp.phoneNumber);
    setDepartment(emp.departmentName);
    setSalary(emp.baseSalary?.toString() ?? "");
    setFayda(emp.faydaNumber || "");
    setStatus(emp.status);
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    if (!firstName || !lastName || !phone || !salary) {
      toast.warning("Incomplete Fields", "Please populate all mandatory fields.");
      return;
    }

    // Capture previous state for rollback
    const previousEmployees = [...localEmployees];

    // 1. Optimistic Update (Immediate 0ms response)
    const updatedEmployee: Employee = {
      ...selectedEmployee,
      firstName,
      lastName,
      phoneNumber: phone,
      departmentName: department,
      baseSalary: parseFloat(salary),
      faydaNumber: fayda || undefined,
      status: status,
      faydaVerified: /^\d{12}$/.test(fayda.trim()),
    };

    setLocalEmployees((prev) =>
      prev.map((emp) => (emp.id === selectedEmployee.id ? updatedEmployee : emp))
    );
    setShowEditModal(false);

    // 2. Dispatch to server in background
    try {
      const result = await onUpdateEmployee(selectedEmployee.id, {
        firstName,
        lastName,
        phoneNumber: phone,
        departmentName: department,
        baseSalary: parseFloat(salary),
        ...(fayda.trim() ? { faydaNumber: fayda.trim() } : {}),
        status: status,
      });

      if (!result.success) {
        // Rollback
        setLocalEmployees(previousEmployees);
        toast.error("Registry Sync Failed", `${result.message || "A constraint breach was detected."}. Rollback performed.`);
      } else {
        toast.success("Profile Updated", `${firstName}'s settings are synchronized.`);
      }
    } catch (err: any) {
      // Rollback on exception
      setLocalEmployees(previousEmployees);
      toast.error("Sync Network Error", `SRE Synchronization failed. Registry state rolled back.`);
    }
  };

  return (
    <div className="space-y-6 animate-slide-up select-none">
      
      {/* 2. REFINED MODULAR DATA CARDS: Upper Panel Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#0c1424] p-6 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/60 shadow-sm transition-all duration-200 hover:border-zinc-300 dark:hover:border-zinc-700/80">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-50 font-outfit tracking-tight">Employee Directory</h2>
          <p className="text-xs text-slate-400 dark:text-zinc-500 font-medium">
            Onboard enterprise staff, register biometric Fayda National IDs, and manage compliance.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-4.5 py-3 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white rounded-xl shadow-md shadow-[var(--brand-primary)]/20 font-bold text-xs transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center gap-2"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Onboard Biometric Employee
        </button>
      </div>

      {/* Grid Filters Panel */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-[#0c1424] p-4 rounded-xl border border-zinc-200/50 dark:border-zinc-800/60 shadow-sm">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            placeholder="Search by worker name, employee ID, phone..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-zinc-200/50 dark:border-zinc-800/80 rounded-lg text-xs focus:outline-none text-slate-800 dark:text-zinc-100 focus:border-emerald-500 dark:focus:border-emerald-500 transition-all duration-200 font-medium"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 text-xs">🔍</span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-extrabold uppercase tracking-wider shrink-0 select-none">Status:</span>
          <select
            value={currentStatus}
            onChange={(e) => updateUrlParams({ status: e.target.value, page: 1 })}
            className="w-full sm:w-auto px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-zinc-200/50 dark:border-zinc-800/80 rounded-lg text-xs font-bold text-slate-700 dark:text-zinc-300 focus:outline-none cursor-pointer transition-all duration-200 hover:border-zinc-300 dark:hover:border-zinc-700"
          >
            <option value="ALL">All States</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="SUSPENDED">SUSPENDED</option>
          </select>
        </div>
      </div>

      {/* 3. SEMANTIC COLOR CODING & TABULAR REFINEMENT */}
      <div className="rounded-2xl bg-white dark:bg-[#0c1424] overflow-hidden border border-zinc-200/50 dark:border-zinc-800/60 shadow-sm relative transition-all duration-200 hover:border-zinc-300 dark:hover:border-zinc-700/80">
        
        {/* Dynamic Transition Loader Overlay */}
        {isPending && (
          <div className="absolute inset-0 bg-slate-100/20 dark:bg-black/10 backdrop-blur-[1px] z-10 flex items-center justify-center animate-fade-in" />
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-zinc-900/15 text-slate-400 dark:text-zinc-500 text-[10px] font-extrabold uppercase tracking-wider border-b border-zinc-200/40 dark:border-zinc-800/60">
                <th className="py-4 px-6 text-left">Employee Registry</th>
                <th className="py-4 px-5 text-left">Enterprise ID</th>
                <th className="py-4 px-5 text-left">Department Allocation</th>
                {/* Rule 3: financial columns strictly right-aligned */}
                <th className="py-4 px-5 text-right">Basic Salary (ETB)</th>
                <th className="py-4 px-5 text-left">Fayda National Validation</th>
                <th className="py-4 px-5 text-center">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/40 text-xs">
              
              {/* Render Transition Skeleton States */}
              {isPending ? (
                Array.from({ length: itemsPerPage }).map((_, idx) => (
                  <tr key={idx} className="border-b dark:border-zinc-800/40">
                    <td className="py-4 px-6 flex items-center gap-3">
                      <Skeleton className="w-8 h-8 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-3.5 w-24" />
                        <Skeleton className="h-2.5 w-20" />
                      </div>
                    </td>
                    <td className="py-4 px-5"><Skeleton className="h-3 w-16" /></td>
                    <td className="py-4 px-5"><Skeleton className="h-3.5 w-20" /></td>
                    <td className="py-4 px-5 text-right"><Skeleton className="h-3.5 w-16 ml-auto" /></td>
                    <td className="py-4 px-5"><Skeleton className="h-3 w-28" /></td>
                    <td className="py-4 px-5 text-center"><Skeleton className="h-4 w-12 rounded-full mx-auto" /></td>
                    <td className="py-4 px-6 text-right"><Skeleton className="h-7 w-16 rounded-lg ml-auto" /></td>
                  </tr>
                ))
              ) : paginatedEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-zinc-500 font-medium">
                    No active corporate employee records found matching query filters.
                  </td>
                </tr>
              ) : (
                paginatedEmployees.map((emp) => (
                  <tr
                    key={emp.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/10 transition-all duration-150 text-slate-700 dark:text-zinc-200 border-b border-zinc-100 dark:border-zinc-800/20 active:bg-slate-50/80 dark:active:bg-zinc-900/20"
                  >
                    {/* Employee Profile */}
                    <td className="py-4 px-6 flex items-center gap-3">
                      <div className="w-8.5 h-8.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-extrabold text-xs select-none">
                        {emp.firstName[0]}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-zinc-100">
                          {emp.firstName} {emp.lastName}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono mt-0.5">{emp.phoneNumber}</div>
                      </div>
                    </td>
                    {/* ID */}
                    <td className="py-4 px-5 font-mono text-[10px] font-bold text-slate-800 dark:text-zinc-400">
                      {emp.employeeIdNumber}
                    </td>
                    {/* Department */}
                    <td className="py-4 px-5 font-semibold text-slate-600 dark:text-zinc-300">{emp.departmentName}</td>
                    {/* Salary (Rule 3: RIGHT-ALIGNED stacking decimals perfectly) */}
                    <td className="py-4 px-5 text-right font-mono font-bold text-slate-900 dark:text-zinc-100">
                      {emp.baseSalary !== undefined && emp.baseSalary !== null ? (
                        `${emp.baseSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB`
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100/60 dark:bg-amber-900/10 text-amber-800 dark:text-amber-500 font-sans font-semibold border border-amber-200/20">Hidden for privacy</span>
                      )}
                    </td>
                    {/* Fayda National Biometrics */}
                    <td className="py-4 px-5">
                      <div className="flex flex-col gap-1">
                        <span className="font-mono text-[10px] text-slate-500 dark:text-zinc-400 font-bold">
                          {emp.faydaNumber ? (
                            emp.faydaNumber
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100/60 dark:bg-amber-900/10 text-amber-800 dark:text-amber-400 font-sans font-semibold border border-amber-200/20">Hidden for privacy</span>
                          )}
                        </span>
                        {(() => {
                          const st = getFaydaComplianceStatus(emp.faydaNumber);
                          return (
                            <span
                              className={`inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${faydaBadgeClass(st)}`}
                            >
                              {faydaStatusLabel(st)}
                            </span>
                          );
                        })()}
                      </div>
                    </td>
                    {/* Status */}
                    <td className="py-4 px-5 text-center">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${
                          emp.status === "ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                        }`}
                      >
                        {emp.status}
                      </span>
                    </td>
                    {/* Actions */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditModal(emp)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-600 hover:text-white dark:bg-zinc-800 dark:hover:bg-emerald-600 dark:hover:text-white text-slate-600 dark:text-zinc-300 rounded-lg text-[10px] font-bold transition-all duration-200 hover:scale-[1.04] active:scale-[0.96] cursor-pointer shadow-sm border border-zinc-200/30 dark:border-zinc-800/40"
                        >
                          Settings
                        </button>
                        {emp.status === "ACTIVE" && (
                          <button
                            onClick={() => handleOpenSuspendModal(emp)}
                            className="px-3 py-1.5 bg-red-50 hover:bg-red-600 hover:text-white dark:bg-red-900/20 dark:hover:bg-red-600 dark:hover:text-white text-red-600 dark:text-red-400 rounded-lg text-[10px] font-bold transition-all duration-200 hover:scale-[1.04] active:scale-[0.96] cursor-pointer shadow-sm border border-red-200/30 dark:border-red-900/40"
                          >
                            Suspend
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Server-Side Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center px-6 py-4 bg-slate-50/50 dark:bg-zinc-900/15 border-t border-zinc-200/40 dark:border-zinc-800/60 text-xs">
            <span className="text-slate-400 dark:text-zinc-500 font-semibold">
              Showing page {currentPage} of {totalPages} ({filteredEmployees.length} filtered results)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1 || isPending}
                onClick={() => updateUrlParams({ page: currentPage - 1 })}
                className="px-3.5 py-1.5 bg-white dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-850 rounded-lg font-bold text-slate-600 dark:text-zinc-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-900 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                disabled={currentPage === totalPages || isPending}
                onClick={() => updateUrlParams({ page: currentPage + 1 })}
                className="px-3.5 py-1.5 bg-white dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-850 rounded-lg font-bold text-slate-600 dark:text-zinc-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-900 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>



      {/* EDIT PROFILE MODAL */}
      {showEditModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden animate-slide-up">
            
            <div className="p-5 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center bg-slate-50 dark:bg-zinc-950/20">
              <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-50 font-outfit">Update Employee settings</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-zinc-100 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none dark:text-zinc-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none dark:text-zinc-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none dark:text-zinc-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Base Salary (ETB)</label>
                  <input
                    type="number"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none dark:text-zinc-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none font-semibold cursor-pointer"
                  >
                    <option value="Operations">Operations</option>
                    <option value="Tech / Engineering">Tech / Engineering</option>
                    <option value="Finance">Finance</option>
                    <option value="HR / Admin">HR / Admin</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as "ACTIVE" | "SUSPENDED")}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none font-semibold cursor-pointer"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Fayda FIN (12 digits)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={12}
                    value={fayda}
                    onChange={(e) => setFayda(e.target.value.replace(/\D/g, "").slice(0, 12))}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-mono focus:outline-none dark:text-zinc-100"
                    placeholder="109283746501"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 font-semibold rounded-xl text-xs cursor-pointer active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md active:scale-95"
                >
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* SUSPEND EMPLOYEE MODAL */}
      {showSuspendModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden animate-slide-up">
            <div className="p-5 border-b border-red-100 dark:border-red-900/30 flex justify-between items-center bg-red-50 dark:bg-red-950/20">
              <h3 className="text-sm font-bold text-red-800 dark:text-red-400 font-outfit">Suspend Employee</h3>
              <button onClick={() => setShowSuspendModal(false)} className="text-red-400 hover:text-red-600 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSuspendSubmit} className="p-5 space-y-4">
              <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-2xl">
                <p className="text-[10px] text-red-600 dark:text-red-400 leading-relaxed font-semibold">
                  You are about to suspend <span className="font-bold">{selectedEmployee.firstName} {selectedEmployee.lastName}</span>.
                  This will remove them from active payroll and directory views.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Suspension Reason</label>
                <input
                  type="text"
                  required
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="e.g., Extended unpaid leave, Disciplinary, Resignation..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none dark:text-zinc-100 focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Effective Date</label>
                  <input
                    type="date"
                    required
                    value={suspendDate}
                    onChange={(e) => setSuspendDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none dark:text-zinc-100 focus:border-red-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Final Pay / Owed (ETB)</label>
                  <input
                    type="number"
                    value={finalPayOwed}
                    onChange={(e) => setFinalPayOwed(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none dark:text-zinc-100 focus:border-red-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowSuspendModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 font-semibold rounded-xl text-xs cursor-pointer active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md active:scale-95"
                >
                  Confirm Suspension
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <EmployeeMobilePinModal
        open={!!mobilePinCredentials}
        employeeName={mobilePinCredentials?.employeeName ?? ""}
        phoneNumber={mobilePinCredentials?.phoneNumber ?? ""}
        mobileAppPin={mobilePinCredentials?.mobileAppPin ?? ""}
        onClose={() => setMobilePinCredentials(null)}
      />
    </div>
  );
}
