"use client";

import { useState } from "react";
import { apiRequest } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import { CredentialsModal } from "./CredentialsModal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type TenantRow = {
  id: string;
  name: string;
  companyCode: string;
  subscription_status: "ACTIVE" | "PAST_DUE" | "SUSPENDED";
  planTier?: string;
  maxEmployees?: number;
  created_at: string;
  admin_users: { email: string; isActive: boolean }[];
};

const STATUSES: TenantRow["subscription_status"][] = ["ACTIVE", "PAST_DUE", "SUSPENDED"];

export function TenantsTable({
  tenants,
  onUpdated,
}: {
  tenants: TenantRow[];
  onUpdated: () => void;
}) {
  const [credentials, setCredentials] = useState<{
    companyName: string;
    adminEmail: string;
    provisionalPassword: string;
    companyCode?: string;
  } | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);

  const setStatus = async (id: string, subscription_status: TenantRow["subscription_status"]) => {
    try {
      await apiRequest(`/api/v1/internal/tenants/${id}/billing`, {
        method: "PATCH",
        body: JSON.stringify({ subscription_status }),
      });
      toast.success("Updated", `Status set to ${subscription_status}`);
      onUpdated();
    } catch (err: unknown) {
      toast.error("Error", err instanceof Error ? err.message : "Update failed");
    }
  };

  const resetPassword = async (tenant: TenantRow) => {
    if (!confirm(`Reset owner password for ${tenant.name}?`)) return;
    setResettingId(tenant.id);
    try {
      const result = await apiRequest<{
        adminEmail: string;
        provisionalPassword: string;
      }>(`/api/v1/internal/tenants/${tenant.id}/reset-admin-password`, { method: "POST" });
      setCredentials({
        companyName: tenant.name,
        companyCode: tenant.companyCode,
        adminEmail: result.adminEmail,
        provisionalPassword: result.provisionalPassword,
      });
      toast.success("Password reset", "Share the new password once with the client.");
    } catch (err: unknown) {
      toast.error("Error", err instanceof Error ? err.message : "Reset failed");
    } finally {
      setResettingId(null);
    }
  };

  return (
    <>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-[var(--text-muted)]">
                  No tenants yet. Provision your first client above.
                </TableCell>
              </TableRow>
            ) : (
              tenants.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium text-[var(--text-primary)]">{t.name}</TableCell>
                  <TableCell className="font-mono text-xs">{t.companyCode}</TableCell>
                  <TableCell className="text-xs text-[var(--text-secondary)]">
                    {(t.planTier || "FREE").toUpperCase()}
                    {t.maxEmployees != null ? ` · ${t.maxEmployees} seats` : ""}
                  </TableCell>
                  <TableCell className="text-xs text-[var(--text-secondary)]">
                    {t.admin_users[0]?.email ?? "None"}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        t.subscription_status === "ACTIVE"
                          ? "bg-emerald-500/15 text-emerald-400"
                          : t.subscription_status === "PAST_DUE"
                            ? "bg-amber-500/15 text-amber-400"
                            : "bg-red-500/15 text-red-400"
                      }`}
                    >
                      {t.subscription_status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end gap-1">
                      <button
                        type="button"
                        disabled={resettingId === t.id}
                        onClick={() => resetPassword(t)}
                        className="rounded border border-[var(--border)] px-2 py-1 text-[10px] hover:bg-[var(--bg-base)] disabled:opacity-40"
                      >
                        {resettingId === t.id ? "Resetting…" : "Reset admin password"}
                      </button>
                      <div className="flex justify-end gap-1">
                        {STATUSES.map((s) => (
                          <button
                            key={s}
                            type="button"
                            disabled={t.subscription_status === s}
                            onClick={() => setStatus(t.id, s)}
                            className="rounded border border-[var(--border)] px-2 py-1 text-[10px] hover:bg-[var(--bg-base)] disabled:opacity-40"
                          >
                            {s === "ACTIVE" ? "Active" : s === "PAST_DUE" ? "Past due" : "Suspend"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CredentialsModal
        open={!!credentials}
        title="New admin password"
        companyName={credentials?.companyName}
        companyCode={credentials?.companyCode}
        adminEmail={credentials?.adminEmail ?? ""}
        provisionalPassword={credentials?.provisionalPassword ?? ""}
        onClose={() => setCredentials(null)}
      />
    </>
  );
}
