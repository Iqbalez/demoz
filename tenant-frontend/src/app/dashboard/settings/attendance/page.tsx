'use client';

import React, { useState, useEffect } from 'react';
import { useSettings } from '@/context/SettingsContext';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { usePermission } from '@/hooks/usePermission';
import { toast } from '@/components/ui/toast';

const DAYS_OF_WEEK = [
  { val: 'MON', label: 'Monday' },
  { val: 'TUE', label: 'Tuesday' },
  { val: 'WED', label: 'Wednesday' },
  { val: 'THU', label: 'Thursday' },
  { val: 'FRI', label: 'Friday' },
  { val: 'SAT', label: 'Saturday' },
  { val: 'SUN', label: 'Sunday' },
];

export default function AttendanceSettingsPage() {
  const { settings, loading, updateSettings } = useSettings();
  const { hasPermission } = usePermission();
  const canEdit = hasPermission('edit_attendance');
  
  const [form, setForm] = useState<any>({});
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const { showUnsavedModal, confirmNavigation, cancelNavigation } = useUnsavedChanges(isDirty);

  useEffect(() => {
    if (settings?.attendance && !isDirty) {
      setForm({
        workHoursPerDay: settings.attendance.workHoursPerDay || 8,
        workDays: settings.attendance.workDays || ["MON","TUE","WED","THU","FRI","SAT"],
        dailyOvertimeThresh: settings.attendance.dailyOvertimeThresh || 8,
        weeklyOvertimeThresh: settings.attendance.weeklyOvertimeThresh || 48,
        gracePeriodMins: settings.attendance.gracePeriodMins || 15,
        autoAbsentMins: settings.attendance.autoAbsentMins || 120,
        offlineSync: settings.attendance.offlineSync ?? true,
        shifts: settings.attendance.shifts || [],
      });
    }
  }, [settings, isDirty]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      if (name === 'offlineSync') {
        setForm({ ...form, [name]: checked });
      }
    } else {
      setForm({ ...form, [name]: value });
    }
    setIsDirty(true);
  };

  const handleDayToggle = (day: string) => {
    const currentDays: string[] = form.workDays || [];
    let newDays;
    if (currentDays.includes(day)) {
      newDays = currentDays.filter(d => d !== day);
    } else {
      newDays = [...currentDays, day];
    }
    setForm({ ...form, workDays: newDays });
    setIsDirty(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    if (form.workDays?.length === 0) {
      toast.warning('Validation Error', 'You must select at least one work day.');
      return;
    }

    setSaving(true);
    try {
      await updateSettings('attendance', {
        ...form,
        workHoursPerDay: parseFloat(form.workHoursPerDay),
        dailyOvertimeThresh: parseFloat(form.dailyOvertimeThresh),
        weeklyOvertimeThresh: parseFloat(form.weeklyOvertimeThresh),
        gracePeriodMins: parseInt(form.gracePeriodMins, 10),
        autoAbsentMins: parseInt(form.autoAbsentMins, 10),
      });
      setIsDirty(false);
      toast.success('Settings Saved', 'Attendance configurations updated successfully.');
    } catch (err: any) {
      toast.error('Save Failed', err.message || 'Could not save attendance settings.');
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

  return (
    <>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Time & Attendance</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Configure standard working hours, thresholds, and mobile sync rules.</p>
        </div>
        
        <form onSubmit={handleSave} className="space-y-6">
          <div className="rounded-xl border border-[var(--border)] bg-white shadow-sm overflow-hidden">
            <div className="p-5 border-b border-[var(--border)] bg-[var(--bg-subtle)]/50">
              <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">Standard Work Schedule</h3>
            </div>
            <div className="p-5 space-y-5">
              <div className="space-y-2.5">
                <label className="text-sm font-medium text-[var(--text-primary)]">Standard Work Days</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map(day => {
                    const isSelected = (form.workDays || []).includes(day.val);
                    return (
                      <button
                        key={day.val}
                        type="button"
                        onClick={() => handleDayToggle(day.val)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
                          isSelected 
                            ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]' 
                            : 'bg-white text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--bg-subtle)]'
                        }`}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-3 border-t border-[var(--border)]">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--text-primary)]">Standard Work Hours / Day</label>
                  <input disabled={!canEdit} required name="workHoursPerDay" type="number" step="0.5" min="1" max="24" value={form.workHoursPerDay} onChange={handleChange} className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm focus:border-[var(--brand-primary)] focus:outline-none disabled:bg-gray-100" />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-white shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-[var(--border)] bg-[var(--bg-subtle)]/50 flex justify-between items-center">
              <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">Custom Shifts</h3>
              {canEdit && (
                <button 
                  type="button" 
                  onClick={() => {
                    setForm({
                      ...form,
                      shifts: [...(form.shifts || []), { id: crypto.randomUUID(), name: '', startTime: '08:00', endTime: '17:00' }]
                    });
                    setIsDirty(true);
                  }}
                  className="text-xs font-semibold text-[var(--brand-primary)] hover:text-[var(--brand-primary-dark)] bg-blue-50 px-3 py-1 rounded-full"
                >
                  + Add Shift
                </button>
              )}
            </div>
            <div className="p-5 flex-1 bg-gray-50/50">
              {!form.shifts || form.shifts.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)] text-center py-6">No custom shifts configured. Standard hours apply.</p>
              ) : (
                <div className="space-y-3">
                  {form.shifts.map((shift: any, index: number) => (
                    <div key={shift.id} className="bg-white p-3 rounded-lg border border-[var(--border)] flex items-start sm:items-center gap-3 flex-col sm:flex-row">
                      <input 
                        disabled={!canEdit}
                        type="text" 
                        required
                        placeholder="e.g., Night Shift" 
                        value={shift.name}
                        onChange={(e) => {
                          const newShifts = [...form.shifts];
                          newShifts[index].name = e.target.value;
                          setForm({ ...form, shifts: newShifts });
                          setIsDirty(true);
                        }}
                        className="flex-1 rounded-md border border-[var(--border)] px-3 py-1.5 text-sm disabled:bg-gray-100 w-full"
                      />
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <input disabled={!canEdit} type="time" required value={shift.startTime} onChange={(e) => {
                            const newShifts = [...form.shifts];
                            newShifts[index].startTime = e.target.value;
                            setForm({ ...form, shifts: newShifts });
                            setIsDirty(true);
                        }} className="rounded-md border border-[var(--border)] px-2 py-1.5 text-sm disabled:bg-gray-100" />
                        <span className="text-[var(--text-muted)] text-sm">to</span>
                        <input disabled={!canEdit} type="time" required value={shift.endTime} onChange={(e) => {
                            const newShifts = [...form.shifts];
                            newShifts[index].endTime = e.target.value;
                            setForm({ ...form, shifts: newShifts });
                            setIsDirty(true);
                        }} className="rounded-md border border-[var(--border)] px-2 py-1.5 text-sm disabled:bg-gray-100" />
                      </div>
                      {canEdit && (
                        <button 
                          type="button" 
                          onClick={() => {
                            const newShifts = form.shifts.filter((_: any, i: number) => i !== index);
                            setForm({ ...form, shifts: newShifts });
                            setIsDirty(true);
                          }}
                          className="text-[var(--text-muted)] hover:text-red-500 p-1 self-end sm:self-auto"
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

          <div className="rounded-xl border border-[var(--border)] bg-white shadow-sm overflow-hidden">
            <div className="p-5 border-b border-[var(--border)] bg-[var(--bg-subtle)]/50">
              <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">Lateness & Absence Rules</h3>
            </div>
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--text-primary)]">Grace Period (Minutes)</label>
                  <input disabled={!canEdit} required name="gracePeriodMins" type="number" step="1" min="0" value={form.gracePeriodMins} onChange={handleChange} className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm focus:border-[var(--brand-primary)] focus:outline-none disabled:bg-gray-100" />
                  <p className="text-xs text-[var(--text-muted)]">Allowed buffer before marking as Late.</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--text-primary)]">Auto-Absent After (Minutes)</label>
                  <input disabled={!canEdit} required name="autoAbsentMins" type="number" step="1" min="0" value={form.autoAbsentMins} onChange={handleChange} className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm focus:border-[var(--brand-primary)] focus:outline-none disabled:bg-gray-100" />
                  <p className="text-xs text-[var(--text-muted)]">Mark absent if employee arrives this late.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-white shadow-sm overflow-hidden">
            <div className="p-5 border-b border-[var(--border)] bg-[var(--bg-subtle)]/50">
              <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">Overtime Thresholds</h3>
              <p className="text-xs text-[var(--text-muted)] mt-1">Hours logged beyond these limits will be calculated as overtime.</p>
            </div>
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--text-primary)]">Daily Overtime Threshold</label>
                  <input disabled={!canEdit} required name="dailyOvertimeThresh" type="number" step="0.5" min="0" max="24" value={form.dailyOvertimeThresh} onChange={handleChange} className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm focus:border-[var(--brand-primary)] focus:outline-none disabled:bg-gray-100" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--text-primary)]">Weekly Overtime Threshold</label>
                  <input disabled={!canEdit} required name="weeklyOvertimeThresh" type="number" step="1" min="0" max="168" value={form.weeklyOvertimeThresh} onChange={handleChange} className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm focus:border-[var(--brand-primary)] focus:outline-none disabled:bg-gray-100" />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-white shadow-sm overflow-hidden">
            <div className="p-5 border-b border-[var(--border)] bg-[var(--bg-subtle)]/50">
              <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">Mobile App Settings</h3>
            </div>
            <div className="p-5">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative flex items-center">
                  <input disabled={!canEdit} type="checkbox" name="offlineSync" checked={form.offlineSync} onChange={handleChange} className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-gray-300 checked:border-[var(--brand-primary)] checked:bg-[var(--brand-primary)] transition-all disabled:opacity-50" />
                  <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] transition-colors">Enable Offline Clock-In</p>
                  <p className="text-xs text-[var(--text-muted)]">Allow the mobile app to cache punches when internet is unavailable and sync later.</p>
                </div>
              </label>
            </div>
          </div>

          {canEdit && (
            <div className="flex justify-end gap-3 pt-2">
              <button 
                type="button" 
                disabled={!isDirty || saving}
                onClick={() => {
                  setForm(settings?.attendance || {});
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
                {saving ? 'Saving...' : 'Save Attendance Settings'}
              </button>
            </div>
          )}
        </form>
      </div>

      {showUnsavedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Unsaved Changes</h3>
            <p className="text-sm text-gray-600">You have unsaved changes to your attendance settings. Are you sure you want to leave this page?</p>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={cancelNavigation} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                Stay on Page
              </button>
              <button onClick={confirmNavigation} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
