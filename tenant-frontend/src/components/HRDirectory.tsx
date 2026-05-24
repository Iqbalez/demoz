"use client";

import React, { useState } from "react";

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
  faydaVerified?: boolean; // Added biometric verification check status
}

export interface HRDirectoryProps {
  employees: Employee[];
  maxEmployees: number;
  onAddEmployee: (employee: Omit<Employee, "id" | "hireDate" | "faydaVerified">) => { success: boolean; message: string };
  onUpdateEmployee: (id: string, updates: Partial<Employee>) => { success: boolean; message: string };
}

export default function HRDirectory({ employees, maxEmployees, onAddEmployee, onUpdateEmployee }: HRDirectoryProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Form states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [empId, setEmpId] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("Operations");
  const [salary, setSalary] = useState("");
  const [fayda, setFayda] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "SUSPENDED">("ACTIVE");
  const [faydaVerified, setFaydaVerified] = useState(true);

  const [formError, setFormError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleOpenAddModal = () => {
    if (employees.length >= maxEmployees) {
      setFormError(`Plan seat capacity limit reached! You are currently using ${employees.length}/${maxEmployees} seats. Please upgrade your subscription package to add more employees.`);
      setShowAddModal(true);
      return;
    }
    setFormError("");
    setFirstName("");
    setLastName("");
    setEmpId(`EMP-${Math.floor(1000 + Math.random() * 9000)}`);
    setPhone("09");
    setSalary("15000");
    setFayda("");
    setShowAddModal(true);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (employees.length >= maxEmployees) return;

    if (!firstName || !lastName || !empId || !phone || !salary) {
      setFormError("Please fill in all required fields.");
      return;
    }

    const result = onAddEmployee({
      firstName,
      lastName,
      employeeIdNumber: empId,
      phoneNumber: phone,
      departmentName: department,
      baseSalary: parseFloat(salary),
      faydaNumber: fayda || `FYD-${Math.floor(100000 + Math.random() * 900000)}`,
      status: "ACTIVE",
    });

    if (result.success) {
      setSuccessMsg("Employee onboarded successfully!");
      setTimeout(() => {
        setSuccessMsg("");
        setShowAddModal(false);
      }, 1000);
    } else {
      setFormError(result.message);
    }
  };

  const handleOpenEditModal = (emp: Employee) => {
    setSelectedEmployee(emp);
    setFirstName(emp.firstName);
    setLastName(emp.lastName);
    setEmpId(emp.employeeIdNumber);
    setPhone(emp.phoneNumber);
    setDepartment(emp.departmentName);
    setSalary(emp.baseSalary.toString());
    setFayda(emp.faydaNumber || "");
    setStatus(emp.status);
    setFaydaVerified(emp.faydaVerified !== false);
    setFormError("");
    setShowEditModal(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    if (!firstName || !lastName || !phone || !salary) {
      setFormError("Please fill in all required fields.");
      return;
    }

    const result = onUpdateEmployee(selectedEmployee.id, {
      firstName,
      lastName,
      phoneNumber: phone,
      departmentName: department,
      baseSalary: parseFloat(salary),
      faydaNumber: fayda,
      status: status,
      faydaVerified: faydaVerified,
    });

    if (result.success) {
      setSuccessMsg("Employee details updated!");
      setTimeout(() => {
        setSuccessMsg("");
        setShowEditModal(false);
      }, 1000);
    } else {
      setFormError(result.message);
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-zinc-50 font-outfit">Employee Onboarding</h2>
          <p className="text-sm text-slate-400">Onboard staff, record national Fayda IDs, and manage compliance.</p>
        </div>
        
        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-900/10 font-semibold text-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Onboard Employee
        </button>
      </div>

      {/* Directory Table */}
      <div className="rounded-2xl glass-card overflow-hidden shadow-sm border border-slate-100 dark:border-zinc-800/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-zinc-900/30 text-slate-400 dark:text-zinc-500 text-[10px] font-extrabold uppercase tracking-wider border-b border-slate-100 dark:border-zinc-800/80">
                <th className="py-4 px-5">Employee Info</th>
                <th className="py-4 px-5">Demoz ID</th>
                <th className="py-4 px-5">Department</th>
                <th className="py-4 px-5">Base Salary (ETB)</th>
                <th className="py-4 px-5">Fayda Verification</th>
                <th className="py-4 px-5 text-center">Status</th>
                <th className="py-4 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/40 text-xs">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/10 text-slate-700 dark:text-zinc-200">
                  {/* Name */}
                  <td className="py-4 px-5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs select-none">
                      {emp.firstName[0]}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-zinc-100">{emp.firstName} {emp.lastName}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{emp.phoneNumber}</div>
                    </div>
                  </td>
                  {/* ID */}
                  <td className="py-4 px-5 font-mono text-[10px] font-bold">{emp.employeeIdNumber}</td>
                  {/* Department */}
                  <td className="py-4 px-5 font-medium">{emp.departmentName}</td>
                  {/* Salary */}
                  <td className="py-4 px-5 font-mono font-semibold text-slate-900 dark:text-zinc-100">
                    {emp.baseSalary !== undefined && emp.baseSalary !== null ? (
                      `${emp.baseSalary.toLocaleString()} ETB`
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100/60 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400 font-sans font-normal border border-amber-200/30">Hidden for privacy</span>
                    )}
                  </td>
                  {/* Fayda ID and Badge */}
                  <td className="py-4 px-5">
                    <div className="flex flex-col gap-1">
                      <span className="font-mono text-[10px] text-slate-500 dark:text-zinc-400">
                        {emp.faydaNumber ? (
                          emp.faydaNumber
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100/60 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400 font-sans font-normal border border-amber-200/30">Hidden for privacy</span>
                        )}
                      </span>
                      {emp.faydaVerified !== false ? (
                        <span className="inline-flex items-center gap-1 text-[8px] font-bold text-emerald-500 uppercase">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-slow"></span>
                          ✓ Biometrics verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[8px] font-bold text-amber-500 uppercase">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          ● Verification pending
                        </span>
                      )}
                    </div>
                  </td>
                  {/* Status */}
                  <td className="py-4 px-5 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                      emp.status === "ACTIVE" 
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                        : "bg-red-500/10 text-red-600 border-red-500/20"
                    }`}>
                      {emp.status}
                    </span>
                  </td>
                  {/* Edit Actions */}
                  <td className="py-4 px-5 text-right">
                    <button
                      onClick={() => handleOpenEditModal(emp)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-600 hover:text-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 rounded-lg text-[10px] font-bold transition-all active:scale-95 cursor-pointer shadow-sm border border-slate-200/40 dark:border-zinc-800/40"
                    >
                      Update
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD EMPLOYEE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden animate-slide-up">
            
            <div className="p-5 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center bg-slate-50 dark:bg-zinc-950/20">
              <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-50 font-outfit">Onboard New Employee</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-zinc-100 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/25 text-red-600 rounded-xl text-xs">
                  ⚠️ {formError}
                </div>
              )}
              {successMsg && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 rounded-xl text-xs font-semibold">
                  ✓ {successMsg}
                </div>
              )}

              {employees.length < maxEmployees && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">First Name</label>
                      <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs dark:text-zinc-100 focus:outline-none focus:border-emerald-500" placeholder="Abebe" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Last Name</label>
                      <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs dark:text-zinc-100 focus:outline-none focus:border-emerald-500" placeholder="Kebede" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Employee ID</label>
                      <input type="text" value={empId} onChange={(e) => setEmpId(e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-mono font-semibold focus:outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Phone</label>
                      <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none placeholder-zinc-500" placeholder="0911000000" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Department</label>
                      <select value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none">
                        <option value="Operations">Operations</option>
                        <option value="Tech">Tech / Engineering</option>
                        <option value="Finance">Finance</option>
                        <option value="HR">HR / Admin</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Base Salary (ETB)</label>
                      <input type="number" value={salary} onChange={(e) => setSalary(e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Fayda National ID</label>
                    <input type="text" value={fayda} onChange={(e) => setFayda(e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-mono focus:outline-none" placeholder="FYD-192837..." />
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex gap-2 justify-end">
                    <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 bg-slate-100 dark:bg-zinc-850 text-slate-600 dark:text-zinc-300 font-semibold rounded-xl text-xs cursor-pointer active:scale-95">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs cursor-pointer shadow-md active:scale-95">Onboard</button>
                  </div>
                </>
              )}

              {employees.length >= maxEmployees && (
                <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex gap-2 justify-end">
                  <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 bg-slate-100 dark:bg-zinc-855 text-slate-600 dark:text-zinc-300 font-semibold rounded-xl text-xs cursor-pointer">Close</button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* EDIT EMPLOYEE MODAL */}
      {showEditModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden animate-slide-up">
            
            <div className="p-5 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center bg-slate-50 dark:bg-zinc-950/20">
              <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-50 font-outfit">Edit Employee Profile</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-zinc-100 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
              {formError && <div className="p-3 bg-red-500/10 border border-red-500/25 text-red-600 rounded-xl text-xs">⚠️ {formError}</div>}
              {successMsg && <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 rounded-xl text-xs font-semibold">✓ {successMsg}</div>}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">First Name</label>
                  <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Last Name</label>
                  <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Phone</label>
                  <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Base Salary (ETB)</label>
                  <input type="number" value={salary} onChange={(e) => setSalary(e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Department</label>
                  <select value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none">
                    <option value="Operations">Operations</option>
                    <option value="Tech">Tech / Engineering</option>
                    <option value="Finance">Finance</option>
                    <option value="HR">HR / Admin</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Biometrics Match</label>
                  <select value={faydaVerified ? "true" : "false"} onChange={(e) => setFaydaVerified(e.target.value === "true")} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none">
                    <option value="true">Fayda Biometrics Matched</option>
                    <option value="false">Unverified Biometrics</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Status</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value as "ACTIVE" | "SUSPENDED")} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none">
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Fayda Number</label>
                  <input type="text" value={fayda} onChange={(e) => setFayda(e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-mono focus:outline-none" />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex gap-2 justify-end">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 font-semibold rounded-xl text-xs cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white font-semibold rounded-xl text-xs cursor-pointer shadow-md hover:bg-emerald-500">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
