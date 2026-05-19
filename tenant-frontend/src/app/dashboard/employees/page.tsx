"use client";

import React, { Suspense } from "react";
import HRDirectory from "../../../features/employees/HRDirectory";
import { useDashboard } from "../../../context/DashboardContext";
import { Skeleton } from "../../../components/ui/skeleton";

function EmployeesPageContent() {
  const { employees, stats, handleAddEmployee, handleUpdateEmployee } = useDashboard();

  return (
    <HRDirectory
      employees={employees}
      maxEmployees={stats.maxEmployees}
      onAddEmployee={handleAddEmployee}
      onUpdateEmployee={handleUpdateEmployee}
    />
  );
}

export default function EmployeesPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div className="h-20 bg-white dark:bg-slate-900 border dark:border-zinc-800 rounded-3xl animate-pulse" />
        <div className="h-60 bg-white dark:bg-slate-900 border dark:border-zinc-800 rounded-3xl animate-pulse" />
      </div>
    }>
      <EmployeesPageContent />
    </Suspense>
  );
}
