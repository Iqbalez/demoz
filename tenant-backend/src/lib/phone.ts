/** Normalize Ethiopian mobile numbers to 0XXXXXXXXX (10 digits). */
export function normalizeEthiopianPhone(phone: string): string {
  let p = (phone || '').replace(/\s+/g, '').replace(/-/g, '');
  if (p.startsWith('+')) p = p.slice(1);
  if (p.startsWith('251') && p.length >= 12) p = `0${p.slice(3)}`;
  if (p.length === 9 && p.startsWith('9')) p = `0${p}`;
  return p;
}

export function phoneLookupVariants(phone: string): string[] {
  const normalized = normalizeEthiopianPhone(phone);
  const variants = new Set<string>([normalized]);
  if (normalized.startsWith('0') && normalized.length === 10) {
    variants.add(normalized.slice(1));
    variants.add(`251${normalized.slice(1)}`);
  }
  return [...variants];
}
