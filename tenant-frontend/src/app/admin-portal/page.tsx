"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { ProvisionTenantForm } from "@/components/admin/ProvisionTenantForm";
import { TenantsTable, type TenantRow } from "@/components/admin/TenantsTable";

type PlatformStats = {
  tenantCount: number;
  userCount: number;
  employeeCount: number;
  activeTenants: number;
};

export default function AdminPortalPage() {
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadTenants = useCallback(async () => {
    setLoading(true);
    try {
      const [data, platformStats] = await Promise.all([
        apiRequest<TenantRow[]>("/api/v1/internal/tenants"),
        apiRequest<PlatformStats>("/api/v1/internal/stats"),
      ]);
      setTenants(data);
      setStats(platformStats);
    } catch {
      setTenants([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTenants();
  }, [loadTenants]);

  return (
    <>
      <div>
        <h2 className="text-2xl font-semibold text-[#f3efe6]">Client workspaces</h2>
        <p className="mt-1 text-sm text-[#8e8983]">
          Invite-only provisioning. Create companies here; they sign in with Google or the password you share once.
        </p>
      </div>

      {stats && (
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            { label: "Tenants", value: stats.tenantCount },
            { label: "Active", value: stats.activeTenants },
            { label: "Users", value: stats.userCount },
            { label: "Employees", value: stats.employeeCount },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3"
            >
              <p className="text-[10px] font-bold uppercase text-[var(--text-muted)]">{card.label}</p>
              <p className="text-2xl font-semibold text-[var(--text-primary)]">{card.value}</p>
            </div>
          ))}
        </div>
      )}

      <ProvisionTenantForm onSuccess={loadTenants} />

      {loading ? (
        <p className="text-sm text-[#8e8983]">Loading tenants…</p>
      ) : (
        <TenantsTable tenants={tenants} onUpdated={loadTenants} />
      )}
    </>
  );
}
