const FAYDA_REGEX = /^\d{12}$/;

export type FaydaComplianceStatus =
  | "not_provided"
  | "invalid_format"
  | "on_file"
  | "verified_oidc";

export function getFaydaComplianceStatus(faydaNumber?: string | null): FaydaComplianceStatus {
  const raw = (faydaNumber || "").trim();
  if (!raw) return "not_provided";
  if (!FAYDA_REGEX.test(raw)) return "invalid_format";
  return "on_file";
}

export function faydaStatusLabel(status: FaydaComplianceStatus): string {
  switch (status) {
    case "not_provided":
      return "Not provided";
    case "invalid_format":
      return "Invalid (12 digits required)";
    case "on_file":
      return "FIN on file";
    case "verified_oidc":
      return "Verified via eSignet";
    default:
      return "Unknown";
  }
}

export function faydaBadgeClass(status: FaydaComplianceStatus): string {
  switch (status) {
    case "on_file":
    case "verified_oidc":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    case "invalid_format":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
    default:
      return "bg-slate-500/10 text-slate-500 dark:text-slate-400";
  }
}
