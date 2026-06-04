"use client";

import React, { Suspense } from "react";
import AttendanceTracker from "../../../features/attendance/AttendanceTracker";
import { useDashboard } from "../../../context/DashboardContext";
import { Skeleton } from "../../../components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../../../lib/api";
import { AttendanceLog } from "../../../features/attendance/AttendanceTracker";

function AttendancePageContent() {
  const { branches, handleAddBranch, handleUpdateBranch, handleDeleteBranch, refreshTenantData } =
    useDashboard();

  const { data: logs = [] } = useQuery({
    queryKey: ['attendanceLogs'],
    queryFn: async () => {
      const res = await apiRequest<{ data: AttendanceLog[] } | AttendanceLog[]>("/attendance/logs");
      return Array.isArray(res) ? res : res.data ?? [];
    }
  });

  return (
    <AttendanceTracker
      logs={logs}
      branches={branches}
      onAddBranch={handleAddBranch}
      onUpdateBranch={handleUpdateBranch}
      onDeleteBranch={handleDeleteBranch}
      onRefresh={refreshTenantData}
    />
  );
}

export default function AttendancePage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div className="h-20 bg-white dark:bg-slate-900 border dark:border-zinc-800 rounded-3xl animate-pulse" />
        <div className="h-60 bg-white dark:bg-slate-900 border dark:border-zinc-800 rounded-3xl animate-pulse" />
      </div>
    }>
      <AttendancePageContent />
    </Suspense>
  );
}
