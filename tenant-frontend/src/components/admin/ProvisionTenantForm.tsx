"use client";

import { useState } from "react";
import { apiRequest } from "@/lib/api";
import { toast } from "@/components/ui/toast";

type ProvisionResult = {
  tenant: { id: string; name: string; companyCode: string };
  admin: { email: string };
  provisionalPassword?: string;
  message: string;
};

export function ProvisionTenantForm({ onSuccess }: { onSuccess: () => void }) {
  const [companyName, setCompanyName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await apiRequest<ProvisionResult>("/api/v1/internal/tenants", {
        method: "POST",
        body: JSON.stringify({
          companyName,
          adminEmail,
          ...(adminPhone ? { adminPhone } : {}),
        }),
      });
      toast.success("Tenant created", `${result.tenant.name} is ready.`);
      if (result.provisionalPassword) {
        toast.warning(
          "Handoff password",
          `Share once with client: ${result.provisionalPassword}`,
        );
      }
      setCompanyName("");
      setAdminEmail("");
      setAdminPhone("");
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Provisioning failed";
      toast.error("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-6">
      <h2 className="text-sm font-semibold text-[var(--text-primary)]">Provision new company</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-xs">
          <span className="mb-1 block text-[var(--text-muted)]">Company name</span>
          <input
            required
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-base)] px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-xs">
          <span className="mb-1 block text-[var(--text-muted)]">Admin email</span>
          <input
            type="email"
            required
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-base)] px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-xs sm:col-span-2">
          <span className="mb-1 block text-[var(--text-muted)]">Admin phone (optional)</span>
          <input
            value={adminPhone}
            onChange={(e) => setAdminPhone(e.target.value)}
            placeholder="0911000000"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-base)] px-3 py-2 text-sm"
          />
        </label>
      </div>
      <button type="submit" disabled={loading} className="btn-primary text-sm disabled:opacity-50">
        {loading ? "Creating…" : "Create tenant"}
      </button>
    </form>
  );
}
