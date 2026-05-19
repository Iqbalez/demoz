"use client";

import React, { Suspense } from "react";
import PayrollEngine from "../../../features/payroll/PayrollEngine";
import { useDashboard } from "../../../context/DashboardContext";
import { Skeleton } from "../../../components/ui/skeleton";

function PayrollPageContent() {
  const { employees, handleTriggerDisbursement } = useDashboard();

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
