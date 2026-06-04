"use client";

import React, { Suspense } from "react";
import PayrollEngine from "../../../features/payroll/PayrollEngine";
import { useDashboard } from "../../../context/DashboardContext";
import { Skeleton } from "../../../components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../../../lib/api";
import { Employee } from "../../../features/employees/HRDirectory";

function PayrollPageContent() {
  const { handleTriggerDisbursement } = useDashboard();

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const res = await apiRequest<{ data: Employee[] } | Employee[]>("/employees?page=1&limit=500");
      return Array.isArray(res) ? res : res.data ?? [];
    }
  });

  return (
    <PayrollEngine
      employees={employees}
      onTriggerDisbursement={handleTriggerDisbursement}
    />
  );
}

export default function PayrollPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div className="h-20 bg-white dark:bg-slate-900 border dark:border-zinc-800 rounded-3xl animate-pulse" />
        <div className="h-60 bg-white dark:bg-slate-900 border dark:border-zinc-800 rounded-3xl animate-pulse" />
      </div>
    }>
      <PayrollPageContent />
    </Suspense>
  );
}
