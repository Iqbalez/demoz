"use client";

import React, { Suspense } from "react";
import HRDirectory from "../../../features/employees/HRDirectory";
import { useDashboard } from "../../../context/DashboardContext";
import { Skeleton } from "../../../components/ui/skeleton";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../../lib/api";
import { Employee } from "../../../features/employees/HRDirectory";

function EmployeesPageContent() {
  const { stats, handleAddEmployee, handleUpdateEmployee } = useDashboard();
  const queryClient = useQueryClient();

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const res = await apiRequest<{ data: Employee[] } | Employee[]>("/employees?page=1&limit=500");
      return Array.isArray(res) ? res : res.data ?? [];
    }
  });

  if (isLoading) {
    return <div className="space-y-6"><div className="h-20 bg-white dark:bg-slate-900 border dark:border-zinc-800 rounded-3xl animate-pulse" /></div>;
  }

  const addMutation = async (newEmp: any) => {
    const res = await handleAddEmployee(newEmp);
    if (res.success) queryClient.invalidateQueries({ queryKey: ['employees'] });
    return res;
  };

  const updateMutation = async (id: string, updates: any) => {
    const res = await handleUpdateEmployee(id, updates);
    if (res.success) queryClient.invalidateQueries({ queryKey: ['employees'] });
    return res;
  };

  return (
    <HRDirectory
      employees={employees}
      maxEmployees={stats.maxEmployees}
      onAddEmployee={addMutation}
      onUpdateEmployee={updateMutation}
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
