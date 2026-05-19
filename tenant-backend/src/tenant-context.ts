import { AsyncLocalStorage } from 'async_hooks';

// This is our magical pocket that remembers the tenantId for the current request
export const tenantStorage = new AsyncLocalStorage<string>();
