// src/lib/api.ts
/**
 * Centralised helper for making HTTP requests to the NestJS backend.
 * It automatically prefixes the base URL from NEXT_PUBLIC_API_URL (or defaults to localhost).
 * 
 * SECURITY: Credentials are sent via HttpOnly cookies — NOT localStorage.
 * The browser automatically attaches the cookie on every request via `credentials: "include"`.
 */
import { env } from "./env";

export async function apiRequest<T>(endpoint: string, init?: RequestInit): Promise<T> {
  const baseUrl = env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
  const response = await fetch(`${baseUrl}${endpoint}`, {
    credentials: "include", // Automatically sends HttpOnly cookies
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
 * Auth token is now managed via HttpOnly cookies set by the backend.
 * This function exists only for backward compatibility with components
 * that may still call it — it always returns null because tokens
 * are no longer stored client-side.
 */
export function getAuthToken(): string | null {
  return null;
}
