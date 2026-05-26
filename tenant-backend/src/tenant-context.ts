import { AsyncLocalStorage } from 'async_hooks';

// This is our magical pocket that remembers the tenantId for the current request
export const tenantStorage = new AsyncLocalStorage<string>();

/**
 * Retrieve the tenant ID bound to the current async context.
 * Returns `undefined` when called outside a tenant-scoped request
 * (e.g. health-checks, USSD bootstrap, or super-admin operations).
 */
export function getTenantId(): string | undefined {
  return tenantStorage.getStore();
}

/**
 * Convenience wrapper used primarily by TenantMiddleware to bind
 * the tenant ID for the lifetime of a request.
 *
 * Prefer `tenantStorage.run(id, callback)` when you need to execute
 * a callback inside the context; this function is for imperative use.
 */
export function setTenantId(tenantId: string, fn: () => void): void {
  tenantStorage.run(tenantId, fn);
}

/**
 * Execute `fn` **outside** any tenant context so the Prisma isolation
 * layer will NOT inject automatic `tenantId` filters.
 *
 * ⚠️  SECURITY: Only use for authenticated super-admin / platform-level
 * queries. Never expose to user-facing endpoints.
 *
 * @example
 * const allTenants = await withoutTenantIsolation(() =>
 *   prisma.tenant.findMany()
 * );
 */
export function withoutTenantIsolation<T>(fn: () => Promise<T>): Promise<T> {
  // Running with `undefined` as the store makes getTenantId() return undefined,
  // which causes the isolation layer to skip filtering.
  return new Promise((resolve, reject) => {
    tenantStorage.run(undefined as any, () => {
      fn().then(resolve).catch(reject);
    });
  });
}
