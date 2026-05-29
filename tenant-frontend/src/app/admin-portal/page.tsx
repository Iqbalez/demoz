"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { ProvisionTenantForm } from "@/components/admin/ProvisionTenantForm";
import { TenantsTable, type TenantRow } from "@/components/admin/TenantsTable";

export default function AdminPortalPage() {
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTenants = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest<TenantRow[]>("/api/v1/internal/tenants");
      setTenants(data);
    } catch {
      setTenants([]);
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

      <ProvisionTenantForm onSuccess={loadTenants} />

      {loading ? (
        <p className="text-sm text-[#8e8983]">Loading tenants…</p>
      ) : (
        <TenantsTable tenants={tenants} onUpdated={loadTenants} />
      )}
    </>
  );
}
