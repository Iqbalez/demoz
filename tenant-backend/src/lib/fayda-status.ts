/** Fayda FIN (Fayda Identification Number) is 12 numeric digits in Ethiopia. */
const FAYDA_REGEX = /^\d{12}$/;

export type FaydaComplianceStatus =
  | 'not_provided'
  | 'invalid_format'
  | 'on_file'
  | 'verified_oidc';

export function getFaydaComplianceStatus(faydaNumber?: string | null): FaydaComplianceStatus {
  const raw = (faydaNumber || '').trim();
  if (!raw) return 'not_provided';
  if (!FAYDA_REGEX.test(raw)) return 'invalid_format';
  return 'on_file';
}

export function faydaStatusLabel(status: FaydaComplianceStatus): string {
  switch (status) {
    case 'not_provided':
      return 'Not provided';
    case 'invalid_format':
      return 'Invalid format (need 12 digits)';
    case 'on_file':
      return '12-digit FIN on file';
    case 'verified_oidc':
      return 'Verified via Fayda eSignet';
    default:
      return 'Unknown';
  }
}
