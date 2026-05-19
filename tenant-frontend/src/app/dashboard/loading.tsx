"use client";

import React from "react";
import { Skeleton } from "../../components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse select-none">
      
      {/* Banner Skeleton */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#0c1424] border border-slate-100 dark:border-zinc-800/80 h-20 flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-72" />
        </div>
        <Skeleton className="h-6 w-28 rounded-full" />
      </div>

      {/* KPI Grid Skeletons */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="p-5 rounded-3xl bg-white dark:bg-[#0c1424] border border-slate-100 dark:border-zinc-800/80 h-32 flex flex-col justify-between">
            <div className="flex justify-between items-center">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-6 rounded-lg" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
          </div>
        ))}
      </div>

      {/* Data grids Skeletons */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-5 rounded-3xl bg-white dark:bg-[#0c1424] border border-slate-100 dark:border-zinc-800/80 h-80 space-y-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
          <div className="flex items-end justify-between h-48 border-b pb-2">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="flex gap-1 items-end h-full">
                <Skeleton className="h-[60%] w-4 rounded-t" />
                <Skeleton className="h-[20%] w-4 rounded-t" />
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-[#0c1424] border border-slate-100 dark:border-zinc-800/80 h-80 space-y-4">
          <Skeleton className="h-4 w-32" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="flex gap-3 items-center">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-2 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
