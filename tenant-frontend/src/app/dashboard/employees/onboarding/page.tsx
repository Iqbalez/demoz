"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useDashboard } from "../../../../context/DashboardContext";
import { toast } from "../../../../components/ui/toast";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../../../lib/api";

const ETHIOPIAN_BANKS = [
  { name: "Commercial Bank of Ethiopia (CBE)", prefix: "1000", minLength: 13, maxLength: 13, placeholder: "1000123456789" },
  { name: "Dashen Bank", prefix: "", minLength: 10, maxLength: 12, placeholder: "0012345678" },
  { name: "Awash Bank", prefix: "01", minLength: 10, maxLength: 13, placeholder: "013456789012" },
  { name: "Bank of Abyssinia", prefix: "", minLength: 8, maxLength: 15, placeholder: "12345678" },
  { name: "Cooperative Bank of Oromia", prefix: "1000", minLength: 13, maxLength: 13, placeholder: "1000123456789" },
  { name: "Hibret Bank", prefix: "", minLength: 10, maxLength: 13, placeholder: "1234567890" },
  { name: "Nib International Bank", prefix: "", minLength: 10, maxLength: 13, placeholder: "1234567890" },
  { name: "Zemen Bank", prefix: "", minLength: 10, maxLength: 13, placeholder: "1234567890" },
];

export default function OnboardingPage() {
  const { handleAddEmployee, stats } = useDashboard();
  const queryClient = useQueryClient();
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    employeeIdNumber: "",
    phoneNumber: "",
    baseSalary: "",
    paymentMethod: "BANK",
    bankName: ETHIOPIAN_BANKS[0].name,
    bankAccount: "",
    departmentName: "",
    hireDate: new Date().toISOString().slice(0, 10),
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ mobileAppPin?: string; firstName?: string } | null>(null);

  useEffect(() => {
    async function loadDepts() {
      try {
        const data = await apiRequest<{ id: string; name: string }[]>('/departments');
        setDepartments(data || []);
        if (data && data.length > 0) {
          setForm(prev => ({ ...prev, departmentName: data[0].name }));
        }
      } catch (err) {
        console.error("Failed to load departments", err);
      }
    }
    loadDepts();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'bankName') {
        updated.bankAccount = '';
      }
      return updated;
    });
  };

  const selectedBank = ETHIOPIAN_BANKS.find(b => b.name === form.bankName) || ETHIOPIAN_BANKS[0];

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.employeeIdNumber || !form.phoneNumber || !form.baseSalary) {
      toast.warning("Missing fields", "Please fill in all required fields.");
      return;
    }

    if (form.paymentMethod === "BANK") {
      if (!form.bankAccount) {
        toast.warning("Missing Bank Account", "Please enter a bank account number.");
        return;
      }
      if (selectedBank.prefix && !form.bankAccount.startsWith(selectedBank.prefix)) {
        toast.warning("Invalid Account", `Account for ${selectedBank.name} must start with ${selectedBank.prefix}.`);
        return;
      }
      if (form.bankAccount.length < selectedBank.minLength || form.bankAccount.length > selectedBank.maxLength) {
        toast.warning("Invalid Account Length", `Account for ${selectedBank.name} must be between ${selectedBank.minLength} and ${selectedBank.maxLength} digits.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await handleAddEmployee({
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
      } else {
        queryClient.invalidateQueries({ queryKey: ['employees'] });
        
        if (res && typeof res === "object" && "mobileAppPin" in res) {
          setResult(res as any);
          toast.success("Employee onboarded", `${form.firstName} has been added to the directory.`);
          setForm({
            firstName: "", lastName: "", employeeIdNumber: "", phoneNumber: "",
            baseSalary: "", paymentMethod: "BANK", bankName: ETHIOPIAN_BANKS[0].name, bankAccount: "",
            departmentName: departments.length > 0 ? departments[0].name : "", hireDate: new Date().toISOString().slice(0, 10),
          });
        } else {
          toast.success("Employee onboarded", `${form.firstName} has been added.`);
        }
      }
    } catch (err: any) {
      toast.error("Error", err.message || "Unexpected error.");
    } finally {
      setSubmitting(false);
    }
  }, [form, handleAddEmployee, selectedBank, departments, queryClient]);

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
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--text-primary)]">First Name *</label>
            <input name="firstName" type="text" value={form.firstName} onChange={handleChange} placeholder="Abebe" className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--brand-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--text-primary)]">Last Name *</label>
            <input name="lastName" type="text" value={form.lastName} onChange={handleChange} placeholder="Kebede" className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--brand-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--text-primary)]">Employee ID *</label>
            <input name="employeeIdNumber" type="text" value={form.employeeIdNumber} onChange={handleChange} placeholder="EMP-001" className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--brand-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--text-primary)]">Phone Number *</label>
            <input name="phoneNumber" type="text" value={form.phoneNumber} onChange={handleChange} placeholder="0911234567" className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--brand-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--text-primary)]">Base Salary (ETB) *</label>
            <input name="baseSalary" type="number" value={form.baseSalary} onChange={handleChange} placeholder="8000" className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--brand-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]" />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--text-primary)]">Department</label>
            {departments.length > 0 ? (
              <select name="departmentName" value={form.departmentName} onChange={handleChange} className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--brand-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]">
                {departments.map(d => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
            ) : (
              <input name="departmentName" type="text" value={form.departmentName} onChange={handleChange} placeholder="General" className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--brand-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]" />
            )}
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--text-primary)]">Payment Method</label>
            <select
              name="paymentMethod"
              value={form.paymentMethod}
              onChange={handleChange}
              className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--brand-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
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
              className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--brand-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
            />
          </div>

          {form.paymentMethod === 'BANK' && (
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--text-primary)]">Bank Name</label>
                <select name="bankName" value={form.bankName} onChange={handleChange} className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--brand-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]">
                  {ETHIOPIAN_BANKS.map(bank => (
                    <option key={bank.name} value={bank.name}>{bank.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--text-primary)]">Bank Account</label>
                <input name="bankAccount" type="text" value={form.bankAccount} onChange={handleChange} placeholder={selectedBank.placeholder} className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--brand-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]" />
              </div>
            </>
          )}

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
