// src/lib/api.ts
/**
 * Centralised helper for making HTTP requests to the NestJS backend.
 * It automatically prefixes the base URL from NEXT_PUBLIC_API_URL (or defaults to localhost).
 * Returns a typed Promise for the caller.
 */
export async function apiRequest<T>(endpoint: string, init?: RequestInit): Promise<T> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
  const response = await fetch(`${baseUrl}${endpoint}`, {
    credentials: "include",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API error ${response.status}: ${text}`);
  }

  // Assume JSON response for most endpoints
  return (await response.json()) as T;
}

/**
 * Retrieves the JWT or auth token stored by the login flow.
 * Returns null if not present (e.g., before login or on server‑side rendering).
 */
export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("demoz_auth_token");
}
