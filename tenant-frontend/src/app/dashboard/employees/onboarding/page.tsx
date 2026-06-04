"use client";

import React, { useState, useCallback } from "react";
import { useDashboard } from "../../../../context/DashboardContext";
import { toast } from "../../../../components/ui/toast";

export default function OnboardingPage() {
  const { handleAddEmployee, stats } = useDashboard();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    employeeIdNumber: "",
    phoneNumber: "",
    baseSalary: "",
    paymentMethod: "BANK",
    bankName: "",
    bankAccount: "",
    departmentName: "",
    hireDate: new Date().toISOString().slice(0, 10),
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ mobileAppPin?: string; firstName?: string } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.employeeIdNumber || !form.phoneNumber || !form.baseSalary) {
      toast.warning("Missing fields", "Please fill in all required fields.");
      return;
    }
    setSubmitting(true);
    try {
      const res = handleAddEmployee({
        firstName: form.firstName,
        lastName: form.lastName,
        employeeIdNumber: form.employeeIdNumber,
        phoneNumber: form.phoneNumber,
        baseSalary: Number(form.baseSalary),
        paymentMethod: form.paymentMethod as "BANK" | "CHAPA_WALLET",
        bankName: form.bankName || undefined,
        bankAccount: form.bankAccount || undefined,
        departmentName: form.departmentName || undefined,
        hireDate: form.hireDate,
        status: "ACTIVE",
      } as any);
      if (res && typeof res === "object" && "success" in res && !res.success) {
        toast.error("Onboarding failed", (res as any).message || "Could not onboard employee.");
      } else if (res && typeof res === "object" && "mobileAppPin" in res) {
        setResult(res as any);
        toast.success("Employee onboarded", `${form.firstName} has been added to the directory.`);
        setForm({
          firstName: "", lastName: "", employeeIdNumber: "", phoneNumber: "",
          baseSalary: "", paymentMethod: "BANK", bankName: "", bankAccount: "",
          departmentName: "", hireDate: new Date().toISOString().slice(0, 10),
        });
      } else {
        toast.success("Employee onboarded", `${form.firstName} has been added.`);
      }
    } catch (err: any) {
      toast.error("Error", err.message || "Unexpected error.");
    } finally {
      setSubmitting(false);
    }
  }, [form, handleAddEmployee, toast]);

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Onboard New Employee</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Add a new team member to your workspace. Seats used: {stats.totalEmployees}/{stats.maxEmployees}.
        </p>
      </div>

      {result?.mobileAppPin && (
        <div className="rounded-xl border-2 border-green-300 bg-green-50 p-5 space-y-2">
          <h3 className="text-base font-semibold text-green-800">✅ Credentials for {result.firstName}</h3>
          <p className="text-sm text-green-700">
            Mobile App PIN: <span className="font-mono font-bold text-lg tracking-widest">{result.mobileAppPin}</span>
          </p>
          <p className="text-xs text-green-600">Share this PIN securely with the employee. It will not be shown again.</p>
          <div className="pt-2 flex gap-3">
            <button onClick={() => setResult(null)} className="text-xs font-semibold px-3 py-1.5 bg-white text-green-700 hover:bg-green-100 rounded-md border border-green-200 transition-colors">Dismiss</button>
            <a href="/dashboard/employees" className="text-xs font-semibold px-3 py-1.5 bg-green-600 text-white hover:bg-green-500 rounded-md transition-colors">Return to Directory</a>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[
            { name: "firstName", label: "First Name *", type: "text", placeholder: "Abebe" },
            { name: "lastName", label: "Last Name *", type: "text", placeholder: "Kebede" },
            { name: "employeeIdNumber", label: "Employee ID *", type: "text", placeholder: "EMP-001" },
            { name: "phoneNumber", label: "Phone Number *", type: "text", placeholder: "0911234567" },
            { name: "baseSalary", label: "Base Salary (ETB) *", type: "number", placeholder: "8000" },
            { name: "departmentName", label: "Department", type: "text", placeholder: "Engineering" },
            { name: "bankName", label: "Bank Name", type: "text", placeholder: "Commercial Bank of Ethiopia" },
            { name: "bankAccount", label: "Bank Account", type: "text", placeholder: "100012345678" },
          ].map(field => (
            <div key={field.name} className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--text-primary)]">{field.label}</label>
              <input
                name={field.name}
                type={field.type}
                value={(form as any)[field.name]}
                onChange={handleChange}
                placeholder={field.placeholder}
                className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--brand-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
              />
            </div>
          ))}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--text-primary)]">Payment Method</label>
            <select
              name="paymentMethod"
              value={form.paymentMethod}
              onChange={handleChange}
              className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
            >
              <option value="BANK">Bank Transfer</option>
              <option value="CHAPA_WALLET">Chapa Wallet</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--text-primary)]">Hire Date</label>
            <input
              name="hireDate"
              type="date"
              value={form.hireDate}
              onChange={handleChange}
              className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-[var(--border)]">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 bg-[var(--brand-primary)] text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {submitting ? "Onboarding…" : "Onboard Employee"}
          </button>
        </div>
      </form>
    </div>
  );
}
