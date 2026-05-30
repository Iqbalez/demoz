"use client";

import { useCallback, useState } from "react";

type Props = {
  open: boolean;
  employeeName: string;
  phoneNumber: string;
  mobileAppPin: string;
  onClose: () => void;
};

export function EmployeeMobilePinModal({
  open,
  employeeName,
  phoneNumber,
  mobileAppPin,
  onClose,
}: Props) {
  const [copied, setCopied] = useState(false);

  const copyAll = useCallback(async () => {
    const lines = [
      `Employee: ${employeeName}`,
      `Phone: ${phoneNumber}`,
      `Mobile app PIN: ${mobileAppPin}`,
      "",
      "The employee uses their phone number and this 4-digit PIN to sign in to the Demoz mobile app.",
      "Share these credentials securely. The PIN is not shown again after you close this dialog.",
    ];

    await navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [employeeName, mobileAppPin, phoneNumber]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="employee-pin-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-2xl">
        <h2 id="employee-pin-title" className="text-lg font-semibold text-[var(--text-primary)]">
          Employee mobile app credentials
        </h2>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Copy and send this once. The PIN is not shown again after you close this dialog.
        </p>

        <dl className="mt-4 space-y-3 rounded-xl bg-[var(--bg-base)] p-4 text-sm">
          <div>
            <dt className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Employee</dt>
            <dd className="font-medium text-[var(--text-primary)]">{employeeName}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Phone number</dt>
            <dd className="font-mono text-[var(--text-primary)]">{phoneNumber}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Mobile app PIN</dt>
            <dd className="font-mono text-2xl tracking-widest text-amber-400">{mobileAppPin}</dd>
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
