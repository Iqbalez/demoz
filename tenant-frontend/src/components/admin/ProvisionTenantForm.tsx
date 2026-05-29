"use client";

import { useState } from "react";
import { apiRequest } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import { CredentialsModal } from "./CredentialsModal";
import { PLAN_TIERS, type PlanTierKey } from "@/lib/plan-tiers";

type ProvisionResult = {
  tenant: { id: string; name: string; companyCode: string };
  admin: { email: string };
  provisionalPassword?: string;
  message: string;
};

const PLAN_OPTIONS: PlanTierKey[] = ["GROWTH", "BASIC", "ENTERPRISE", "FREE"];

export function ProvisionTenantForm({ onSuccess }: { onSuccess: () => void }) {
  const [companyName, setCompanyName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [planTier, setPlanTier] = useState<PlanTierKey>("GROWTH");
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState<{
    companyName: string;
    companyCode: string;
    adminEmail: string;
    provisionalPassword: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await apiRequest<ProvisionResult>("/api/v1/internal/tenants", {
        method: "POST",
        body: JSON.stringify({
          companyName,
          adminEmail,
          planTier,
          ...(adminPhone ? { adminPhone } : {}),
        }),
      });
      toast.success("Tenant created", `${result.tenant.name} is ready.`);
      if (result.provisionalPassword) {
        setCredentials({
          companyName: result.tenant.name,
          companyCode: result.tenant.companyCode,
          adminEmail: result.admin.email,
          provisionalPassword: result.provisionalPassword,
        });
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

  const selectedPlan = PLAN_TIERS[planTier];

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-6"
      >
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
          <label className="block text-xs">
            <span className="mb-1 block text-[var(--text-muted)]">Plan tier</span>
            <select
              value={planTier}
              onChange={(e) => setPlanTier(e.target.value as PlanTierKey)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-base)] px-3 py-2 text-sm"
            >
              {PLAN_OPTIONS.map((key) => (
                <option key={key} value={key}>
                  {PLAN_TIERS[key].label} — {PLAN_TIERS[key].maxEmployees} seats,{" "}
                  {PLAN_TIERS[key].monthlyPriceEtb.toLocaleString()} ETB/mo
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs">
            <span className="mb-1 block text-[var(--text-muted)]">Admin phone (optional)</span>
            <input
              value={adminPhone}
              onChange={(e) => setAdminPhone(e.target.value)}
              placeholder="0911000000"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-base)] px-3 py-2 text-sm"
            />
          </label>
        </div>
        <p className="text-[10px] text-[var(--text-muted)]">
          Selected: up to {selectedPlan.maxEmployees} employees,{" "}
          {selectedPlan.monthlyPriceEtb.toLocaleString()} ETB/month (stored on tenant record).
        </p>
        <button type="submit" disabled={loading} className="btn-primary text-sm disabled:opacity-50">
          {loading ? "Creating…" : "Create tenant"}
        </button>
      </form>

      <CredentialsModal
        open={!!credentials}
        title="Client login credentials"
        companyName={credentials?.companyName}
        companyCode={credentials?.companyCode}
        adminEmail={credentials?.adminEmail ?? ""}
        provisionalPassword={credentials?.provisionalPassword ?? ""}
        onClose={() => setCredentials(null)}
      />
    </>
  );
}
