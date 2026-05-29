"use client";

import { useCallback, useState } from "react";

type Props = {
  open: boolean;
  title: string;
  companyName?: string;
  adminEmail: string;
  provisionalPassword: string;
  companyCode?: string;
  onClose: () => void;
};

export function CredentialsModal({
  open,
  title,
  companyName,
  adminEmail,
  provisionalPassword,
  companyCode,
  onClose,
}: Props) {
  const [copied, setCopied] = useState(false);

  const copyAll = useCallback(async () => {
    const lines = [
      companyName ? `Company: ${companyName}` : null,
      companyCode ? `Company code: ${companyCode}` : null,
      `Admin email: ${adminEmail}`,
      `Temporary password: ${provisionalPassword}`,
      "",
      "Sign in at your Demoz workspace URL with Google or this email + password.",
      "Change the password after first login.",
    ].filter(Boolean);

    await navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [adminEmail, companyCode, companyName, provisionalPassword]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="credentials-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-2xl">
        <h2 id="credentials-title" className="text-lg font-semibold text-[var(--text-primary)]">
          {title}
        </h2>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Copy and send this once. The password is not shown again after you close this dialog.
        </p>

        <dl className="mt-4 space-y-3 rounded-xl bg-[var(--bg-base)] p-4 text-sm">
          {companyName && (
            <div>
              <dt className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Company</dt>
              <dd className="font-medium text-[var(--text-primary)]">{companyName}</dd>
            </div>
          )}
          {companyCode && (
            <div>
              <dt className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Company code</dt>
              <dd className="font-mono text-[var(--text-primary)]">{companyCode}</dd>
            </div>
          )}
          <div>
            <dt className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Admin email</dt>
            <dd className="font-mono text-[var(--text-primary)]">{adminEmail}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Temporary password</dt>
            <dd className="break-all font-mono text-amber-400">{provisionalPassword}</dd>
          </div>
        </dl>

        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" onClick={copyAll} className="btn-primary flex-1 text-sm">
            {copied ? "Copied" : "Copy all"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-base)]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
