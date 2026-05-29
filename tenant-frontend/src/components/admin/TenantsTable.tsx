"use client";

import { apiRequest } from "@/lib/api";
import { toast } from "@/components/ui/toast";
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

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Company</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Admin</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tenants.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-[var(--text-muted)]">
                No tenants yet. Provision your first client above.
              </TableCell>
            </TableRow>
          ) : (
            tenants.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium text-[var(--text-primary)]">{t.name}</TableCell>
                <TableCell className="font-mono text-xs">{t.companyCode}</TableCell>
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
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
