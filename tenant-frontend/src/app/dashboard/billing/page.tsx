"use client";

import React, { Suspense } from "react";
import BillingPortal from "../../../components/BillingPortal";
import { useDashboard } from "../../../context/DashboardContext";
import { Skeleton } from "../../../components/ui/skeleton";

function BillingPageContent() {
  return (
    <BillingPortal />
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div className="h-20 bg-white dark:bg-slate-900 border dark:border-zinc-800 rounded-3xl animate-pulse" />
        <div className="h-60 bg-white dark:bg-slate-900 border dark:border-zinc-800 rounded-3xl animate-pulse" />
      </div>
    }>
      <BillingPageContent />
    </Suspense>
  );
}
