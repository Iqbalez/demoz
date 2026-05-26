import * as crypto from 'crypto';

const UPPERCASE  = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE  = 'abcdefghijklmnopqrstuvwxyz';
const DIGITS     = '0123456789';
const SPECIALS   = '@#$%&';
const ALL_CHARS  = UPPERCASE + LOWERCASE + DIGITS + SPECIALS;

/**
 * Generates a cryptographically random 12-character password.
 * Guarantees at least one uppercase, one lowercase, one digit, one special char.
 */
export function generateTemporaryPassword(): string {
  const pick = (charset: string) =>
    charset[crypto.randomInt(0, charset.length)];

  const required = [
    pick(UPPERCASE),
    pick(LOWERCASE),
    pick(DIGITS),
    pick(SPECIALS),
  ];

  const rest = Array.from({ length: 8 }, () => pick(ALL_CHARS));

  // Shuffle the combined array using Fisher-Yates
  const combined = [...required, ...rest];
  for (let i = combined.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }

  return combined.join('');
}

/**
 * Generates a unique system email in the format:
 *   firstname.lastname@<tenantId-prefix>.demoz.local
 * Appends a counter if the base email is already taken.
 */
export function generateUniqueEmail(
  firstName: string,
  lastName: string,
  tenantId: string,
  existingEmails: Set<string>,
): string {
  const sanitise = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]/gi, '_')   // replace non-alphanumeric with underscore
      .replace(/_+/g, '_')            // collapse multiple underscores
      .replace(/^_|_$/g, '');         // trim leading/trailing underscores

  const first  = sanitise(firstName);
  const last   = sanitise(lastName);
  // Use the first 8 characters of tenantId to keep addresses short
  const domain = sanitise(tenantId.replace(/-/g, '').slice(0, 8));

  const base = `${first}.${last}@${domain}.demoz.local`;

  if (!existingEmails.has(base)) {
    existingEmails.add(base);
    return base;
  }

  let counter = 1;
  while (true) {
    const candidate = `${first}.${last}${counter}@${domain}.demoz.local`;
    if (!existingEmails.has(candidate)) {
      existingEmails.add(candidate);
      return candidate;
    }
    counter++;
  }
}
