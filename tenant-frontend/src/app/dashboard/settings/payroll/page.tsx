'use client';

import React, { useState, useEffect } from 'react';
import { useSettings } from '@/context/SettingsContext';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { usePermission } from '@/hooks/usePermission';
import { toast } from '@/components/ui/toast';

export default function PayrollSettingsPage() {
  const { settings, loading, updateSettings } = useSettings();
  const { hasPermission } = usePermission();
  const canManage = hasPermission('manage_payroll');
  
  const [form, setForm] = useState<any>({});
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const { showUnsavedModal, confirmNavigation, cancelNavigation } = useUnsavedChanges(isDirty);

  useEffect(() => {
    if (settings?.payroll && !isDirty) {
      setForm({
        pensionEmployee: settings.payroll.pensionEmployee ?? 7,
        pensionEmployer: settings.payroll.pensionEmployer ?? 11,
        pensionCap: settings.payroll.pensionCap ?? 5000,
        payFrequency: settings.payroll.payFrequency ?? 'MONTHLY',
        cutoffDay: settings.payroll.cutoffDay ?? 25,
        payDate: settings.payroll.payDate ?? 28,
        overtimeRate: settings.payroll.overtimeRate ?? 1.25,
        nightShiftRate: settings.payroll.nightShiftRate ?? 0,
        nightShiftEnabled: settings.payroll.nightShiftEnabled ?? false,
        payslipTemplate: settings.payroll.payslipTemplate ?? {},
        allowanceTypes: settings.payroll.allowanceTypes ?? [],
        deductionTypes: settings.payroll.deductionTypes ?? [],
      });
    }
  }, [settings, isDirty]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setForm({ ...form, [e.target.name]: value });
    setIsDirty(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    setSaving(true);
    try {
      await updateSettings('payroll', {
        ...form,
        pensionEmployee: parseFloat(form.pensionEmployee),
        pensionEmployer: parseFloat(form.pensionEmployer),
        pensionCap: parseFloat(form.pensionCap),
        cutoffDay: parseInt(form.cutoffDay),
        payDate: parseInt(form.payDate),
        overtimeRate: parseFloat(form.overtimeRate),
        nightShiftRate: parseFloat(form.nightShiftRate),
      });
      setIsDirty(false);
      toast.success('Settings Saved', 'Payroll configurations updated successfully.');
    } catch (err: any) {
      toast.error('Save Failed', err.message || 'Could not save payroll settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-[var(--bg-subtle)] rounded-lg"></div>
        <div className="h-64 bg-[var(--bg-subtle)] rounded-xl"></div>
      </div>
    );
  }

  const showWarning = form.pensionEmployee !== 7 || form.pensionEmployer !== 11;

  return (
    <>
      <div className="space-y-8 max-w-4xl pb-10">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Payroll Configuration</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Manage tax rules, schedules, and custom pay types.</p>
        </div>
        
        <form onSubmit={handleSave} className="space-y-8">
          
          {/* SECTION: Ethiopian Tax Reference */}
          <div className="rounded-xl border border-[var(--border)] bg-white shadow-sm overflow-hidden">
            <div className="p-5 border-b border-[var(--border)] bg-[var(--bg-subtle)]/50 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">Ethiopian Tax Reference</h3>
                <p className="text-xs text-[var(--text-muted)] mt-1">Proclamation No. 1395/2025 (Schedule A)</p>
              </div>
              <span className="text-xs text-[var(--text-muted)]">Last updated: July 2025</span>
            </div>
            <div className="p-5">
              <div className="bg-yellow-50 text-yellow-800 text-xs p-3 rounded-md mb-4 border border-yellow-200">
                <strong>Note:</strong> Brackets are legally mandated and read-only. Contact support to report discrepancies.
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-[var(--bg-subtle)] text-[var(--text-secondary)] text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3 rounded-tl-lg">Income Range (ETB)</th>
                      <th className="px-4 py-3">Rate (%)</th>
                      <th className="px-4 py-3 rounded-tr-lg">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    <tr><td className="px-4 py-3">0 – 2,000</td><td className="px-4 py-3">0%</td><td className="px-4 py-3 text-[var(--text-muted)]">Tax exempt</td></tr>
                    <tr><td className="px-4 py-3">2,001 – 4,000</td><td className="px-4 py-3">15%</td><td className="px-4 py-3 text-[var(--text-muted)]">Deduct 300 ETB</td></tr>
                    <tr><td className="px-4 py-3">4,001 – 7,000</td><td className="px-4 py-3">20%</td><td className="px-4 py-3 text-[var(--text-muted)]">Deduct 500 ETB</td></tr>
                    <tr><td className="px-4 py-3">7,001 – 10,000</td><td className="px-4 py-3">25%</td><td className="px-4 py-3 text-[var(--text-muted)]">Deduct 850 ETB</td></tr>
                    <tr><td className="px-4 py-3">10,001 – 14,000</td><td className="px-4 py-3">30%</td><td className="px-4 py-3 text-[var(--text-muted)]">Deduct 1,350 ETB</td></tr>
                    <tr><td className="px-4 py-3">Over 14,000</td><td className="px-4 py-3">35%</td><td className="px-4 py-3 text-[var(--text-muted)]">Deduct 2,050 ETB</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* SECTION: Pension Configuration */}
          <div className="rounded-xl border border-[var(--border)] bg-white shadow-sm overflow-hidden">
            <div className="p-5 border-b border-[var(--border)] bg-[var(--bg-subtle)]/50">
              <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">Pension Configuration</h3>
            </div>
            <div className="p-5 space-y-5">
              {showWarning && (
                <div className="bg-yellow-50 text-yellow-800 text-sm p-4 rounded-md border border-yellow-200">
                  <strong>Warning:</strong> These rates deviate from Labour Proclamation 1156/2019 defaults. Ensure this complies with your PSSSA agreement before running payroll.
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--text-primary)]">Employee Rate (%)</label>
                  <input disabled={!canManage} required name="pensionEmployee" type="number" step="0.5" min="0" max="100" value={form.pensionEmployee || ''} onChange={handleChange} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm disabled:bg-gray-100" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--text-primary)]">Employer Rate (%)</label>
                  <input disabled={!canManage} required name="pensionEmployer" type="number" step="0.5" min="0" max="100" value={form.pensionEmployer || ''} onChange={handleChange} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm disabled:bg-gray-100" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--text-primary)]">Contribution Cap (ETB)</label>
                  <input disabled={!canManage} required name="pensionCap" type="number" step="100" min="0" value={form.pensionCap || ''} onChange={handleChange} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm disabled:bg-gray-100" />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION: Pay Schedule */}
          <div className="rounded-xl border border-[var(--border)] bg-white shadow-sm overflow-hidden">
            <div className="p-5 border-b border-[var(--border)] bg-[var(--bg-subtle)]/50">
              <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">Pay Schedule</h3>
            </div>
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--text-primary)]">Pay Frequency</label>
                  <select disabled={!canManage} name="payFrequency" value={form.payFrequency || 'MONTHLY'} onChange={handleChange} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm disabled:bg-gray-100">
                    <option value="MONTHLY">Monthly</option>
                    <option value="BIWEEKLY">Bi-weekly</option>
                    <option value="WEEKLY">Weekly</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--text-primary)]">Payroll Cutoff Day</label>
                  <input disabled={!canManage} required name="cutoffDay" type="number" min="1" max="28" value={form.cutoffDay || ''} onChange={handleChange} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm disabled:bg-gray-100" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--text-primary)]">Pay Date</label>
                  <input disabled={!canManage} required name="payDate" type="number" min="1" max="28" value={form.payDate || ''} onChange={handleChange} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm disabled:bg-gray-100" />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--text-primary)]">Overtime Multiplier</label>
                  <input disabled={!canManage} required name="overtimeRate" type="number" step="0.05" min="1" value={form.overtimeRate || ''} onChange={handleChange} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm disabled:bg-gray-100" />
                </div>
                
                <div className="space-y-1.5 col-span-2 border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-[var(--text-primary)]">Night Shift Allowance</h4>
                      <p className="text-xs text-[var(--text-muted)]">Enable special rates for night shifts</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input disabled={!canManage} type="checkbox" name="nightShiftEnabled" checked={form.nightShiftEnabled || false} onChange={handleChange} className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--brand-primary)]"></div>
                    </label>
                  </div>
                  {form.nightShiftEnabled && (
                    <div className="mt-3">
                      <label className="text-xs text-[var(--text-primary)] block mb-1">Night Shift Rate (ETB)</label>
                      <input disabled={!canManage} required name="nightShiftRate" type="number" step="1" min="0" value={form.nightShiftRate || ''} onChange={handleChange} className="w-full md:w-1/2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm disabled:bg-gray-100" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION: Allowance & Deduction Builders */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl border border-[var(--border)] bg-white shadow-sm overflow-hidden flex flex-col">
              <div className="p-5 border-b border-[var(--border)] bg-[var(--bg-subtle)]/50 flex justify-between items-center">
                <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">Custom Allowances</h3>
                {canManage && (
                  <button 
                    type="button" 
                    onClick={() => {
                      setForm({
                        ...form,
                        allowanceTypes: [...(form.allowanceTypes || []), { id: crypto.randomUUID(), name: '', isTaxable: true, isPensionable: false }]
                      });
                      setIsDirty(true);
                    }}
                    className="text-xs font-semibold text-[var(--brand-primary)] hover:text-[var(--brand-primary-dark)] bg-blue-50 px-3 py-1 rounded-full"
                  >
                    + Add Allowance
                  </button>
                )}
              </div>
              <div className="p-5 flex-1 bg-gray-50/50">
                {!form.allowanceTypes || form.allowanceTypes.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)] text-center py-6">No custom allowances configured.</p>
                ) : (
                  <div className="space-y-3">
                    {form.allowanceTypes.map((allowance: any, index: number) => (
                      <div key={allowance.id} className="bg-white p-3 rounded-lg border border-[var(--border)] flex items-start gap-3">
                        <input 
                          disabled={!canManage}
                          type="text" 
                          required
                          placeholder="e.g., Transport Allowance" 
                          value={allowance.name}
                          onChange={(e) => {
                            const newTypes = [...form.allowanceTypes];
                            newTypes[index].name = e.target.value;
                            setForm({ ...form, allowanceTypes: newTypes });
                            setIsDirty(true);
                          }}
                          className="flex-1 rounded-md border border-[var(--border)] px-3 py-1.5 text-sm disabled:bg-gray-100"
                        />
                        <div className="flex flex-col gap-2">
                          <label className="flex items-center space-x-2">
                            <input disabled={!canManage} type="checkbox" checked={allowance.isTaxable} onChange={(e) => {
                              const newTypes = [...form.allowanceTypes];
                              newTypes[index].isTaxable = e.target.checked;
                              setForm({ ...form, allowanceTypes: newTypes });
                              setIsDirty(true);
                            }} className="rounded text-[var(--brand-primary)]" />
                            <span className="text-xs text-[var(--text-secondary)]">Taxable</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input disabled={!canManage} type="checkbox" checked={allowance.isPensionable} onChange={(e) => {
                              const newTypes = [...form.allowanceTypes];
                              newTypes[index].isPensionable = e.target.checked;
                              setForm({ ...form, allowanceTypes: newTypes });
                              setIsDirty(true);
                            }} className="rounded text-[var(--brand-primary)]" />
                            <span className="text-xs text-[var(--text-secondary)]">Pensionable</span>
                          </label>
                        </div>
                        {canManage && (
                          <button 
                            type="button" 
                            onClick={() => {
                              const newTypes = form.allowanceTypes.filter((_: any, i: number) => i !== index);
                              setForm({ ...form, allowanceTypes: newTypes });
                              setIsDirty(true);
                            }}
                            className="text-[var(--text-muted)] hover:text-red-500 p-1"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-white shadow-sm overflow-hidden flex flex-col">
              <div className="p-5 border-b border-[var(--border)] bg-[var(--bg-subtle)]/50 flex justify-between items-center">
                <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">Custom Deductions</h3>
                {canManage && (
                  <button 
                    type="button" 
                    onClick={() => {
                      setForm({
                        ...form,
                        deductionTypes: [...(form.deductionTypes || []), { id: crypto.randomUUID(), name: '', isPreTax: false }]
                      });
                      setIsDirty(true);
                    }}
                    className="text-xs font-semibold text-[var(--brand-primary)] hover:text-[var(--brand-primary-dark)] bg-blue-50 px-3 py-1 rounded-full"
                  >
                    + Add Deduction
                  </button>
                )}
              </div>
              <div className="p-5 flex-1 bg-gray-50/50">
                {!form.deductionTypes || form.deductionTypes.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)] text-center py-6">No custom deductions configured.</p>
                ) : (
                  <div className="space-y-3">
                    {form.deductionTypes.map((deduction: any, index: number) => (
                      <div key={deduction.id} className="bg-white p-3 rounded-lg border border-[var(--border)] flex items-start gap-3">
                        <input 
                          disabled={!canManage}
                          type="text" 
                          required
                          placeholder="e.g., Staff Loan Repayment" 
                          value={deduction.name}
                          onChange={(e) => {
                            const newTypes = [...form.deductionTypes];
                            newTypes[index].name = e.target.value;
                            setForm({ ...form, deductionTypes: newTypes });
                            setIsDirty(true);
                          }}
                          className="flex-1 rounded-md border border-[var(--border)] px-3 py-1.5 text-sm disabled:bg-gray-100"
                        />
                        <div className="flex flex-col gap-2">
                          <label className="flex items-center space-x-2">
                            <input disabled={!canManage} type="checkbox" checked={deduction.isPreTax} onChange={(e) => {
                              const newTypes = [...form.deductionTypes];
                              newTypes[index].isPreTax = e.target.checked;
                              setForm({ ...form, deductionTypes: newTypes });
                              setIsDirty(true);
                            }} className="rounded text-[var(--brand-primary)]" />
                            <span className="text-xs text-[var(--text-secondary)]">Pre-Tax Deduction</span>
                          </label>
                        </div>
                        {canManage && (
                          <button 
                            type="button" 
                            onClick={() => {
                              const newTypes = form.deductionTypes.filter((_: any, i: number) => i !== index);
                              setForm({ ...form, deductionTypes: newTypes });
                              setIsDirty(true);
                            }}
                            className="text-[var(--text-muted)] hover:text-red-500 p-1"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION: Payslip Template */}
          <div className="rounded-xl border border-[var(--border)] bg-white shadow-sm overflow-hidden">
            <div className="p-5 border-b border-[var(--border)] bg-[var(--bg-subtle)]/50">
              <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">Payslip Template Options</h3>
            </div>
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-xs font-semibold text-[var(--text-secondary)] mb-3 uppercase">Visibility</h4>
                  <div className="space-y-2">
                    {['showBasicSalary', 'showAllowances', 'showDeductions', 'showPension', 'showIncomeTax', 'showNetPay', 'showBankAccount', 'showEmployeeId', 'showDepartment', 'showPosition'].map((field) => (
                      <label key={field} className="flex items-center space-x-2">
                        <input 
                          disabled={!canManage}
                          type="checkbox" 
                          checked={form.payslipTemplate?.[field] ?? true}
                          onChange={(e) => {
                            setForm({
                              ...form,
                              payslipTemplate: { ...form.payslipTemplate, [field]: e.target.checked }
                            });
                            setIsDirty(true);
                          }}
                          className="rounded text-[var(--brand-primary)] focus:ring-[var(--brand-primary)] disabled:opacity-50"
                        />
                        <span className="text-sm text-[var(--text-primary)]">
                          {field.replace('show', '').replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-[var(--text-secondary)] mb-2 uppercase block">Logo Position</label>
                    <div className="flex gap-4">
                      <label className="flex items-center space-x-2">
                        <input disabled={!canManage} type="radio" name="logoPosition" value="TOP_LEFT" checked={form.payslipTemplate?.logoPosition === 'TOP_LEFT' || !form.payslipTemplate?.logoPosition} onChange={(e) => { setForm({ ...form, payslipTemplate: { ...form.payslipTemplate, logoPosition: e.target.value } }); setIsDirty(true); }} className="text-[var(--brand-primary)] focus:ring-[var(--brand-primary)] disabled:opacity-50" />
                        <span className="text-sm text-[var(--text-primary)]">Top Left</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input disabled={!canManage} type="radio" name="logoPosition" value="TOP_CENTER" checked={form.payslipTemplate?.logoPosition === 'TOP_CENTER'} onChange={(e) => { setForm({ ...form, payslipTemplate: { ...form.payslipTemplate, logoPosition: e.target.value } }); setIsDirty(true); }} className="text-[var(--brand-primary)] focus:ring-[var(--brand-primary)] disabled:opacity-50" />
                        <span className="text-sm text-[var(--text-primary)]">Top Center</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[var(--text-secondary)] mb-2 uppercase block">Language</label>
                    <div className="flex gap-4">
                      <label className="flex items-center space-x-2">
                        <input disabled={!canManage} type="radio" name="language" value="ENGLISH" checked={form.payslipTemplate?.language === 'ENGLISH' || !form.payslipTemplate?.language} onChange={(e) => { setForm({ ...form, payslipTemplate: { ...form.payslipTemplate, language: e.target.value } }); setIsDirty(true); }} className="text-[var(--brand-primary)] focus:ring-[var(--brand-primary)] disabled:opacity-50" />
                        <span className="text-sm text-[var(--text-primary)]">English</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input disabled={!canManage} type="radio" name="language" value="AMHARIC" checked={form.payslipTemplate?.language === 'AMHARIC'} onChange={(e) => { setForm({ ...form, payslipTemplate: { ...form.payslipTemplate, language: e.target.value } }); setIsDirty(true); }} className="text-[var(--brand-primary)] focus:ring-[var(--brand-primary)] disabled:opacity-50" />
                        <span className="text-sm text-[var(--text-primary)]">Amharic</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input disabled={!canManage} type="radio" name="language" value="BOTH" checked={form.payslipTemplate?.language === 'BOTH'} onChange={(e) => { setForm({ ...form, payslipTemplate: { ...form.payslipTemplate, language: e.target.value } }); setIsDirty(true); }} className="text-[var(--brand-primary)] focus:ring-[var(--brand-primary)] disabled:opacity-50" />
                        <span className="text-sm text-[var(--text-primary)]">Both</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[var(--text-secondary)] mb-2 uppercase block">Footer Text</label>
                    <textarea 
                      disabled={!canManage}
                      value={form.payslipTemplate?.footerText || ''}
                      maxLength={200}
                      onChange={(e) => {
                        setForm({
                          ...form,
                          payslipTemplate: { ...form.payslipTemplate, footerText: e.target.value }
                        });
                        setIsDirty(true);
                      }}
                      className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm disabled:bg-gray-100"
                      rows={3}
                      placeholder="e.g., This is a system generated document."
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {canManage && (
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
              <button 
                type="button" 
                disabled={!isDirty || saving}
                onClick={() => {
                  setForm(settings?.payroll || {});
                  setIsDirty(false);
                }}
                className="px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] bg-[var(--bg-subtle)] hover:bg-[var(--border)] rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={!isDirty || saving}
                className="px-6 py-2 text-sm font-semibold text-white bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          )}
        </form>
      </div>

      {showUnsavedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Unsaved Changes</h3>
            <p className="text-sm text-gray-600">You have unsaved changes. Are you sure you want to leave?</p>
            <div className="flex justify-end gap-3">
              <button onClick={cancelNavigation} className="px-4 py-2 text-sm font-medium bg-gray-100 rounded-lg hover:bg-gray-200">Stay</button>
              <button onClick={confirmNavigation} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">Discard</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
