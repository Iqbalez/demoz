// src/lib/api.ts
import { env } from "./env";

export class ApiError extends Error {
  status: number;
  errorCode?: string;

  constructor(status: number, message: string, errorCode?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errorCode = errorCode;
  }
}

let refreshInFlight: Promise<boolean> | null = null;

async function tryRefreshSession(baseUrl: string): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const response = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      return response.ok;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

function shouldAttemptRefresh(endpoint: string, status: number, retried: boolean) {
  if (retried || status !== 401) return false;
  if (endpoint.includes("/auth/login") || endpoint.includes("/auth/google")) return false;
  if (endpoint.includes("/auth/refresh")) return false;
  if (endpoint.includes("/auth/employee-login")) return false;
  return true;
}

export async function apiRequest<T>(
  endpoint: string,
  init?: RequestInit,
  retried = false,
): Promise<T> {
  const baseUrl = env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
  const response = await fetch(`${baseUrl}${endpoint}`, {
    credentials: "include",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (
    !response.ok &&
    shouldAttemptRefresh(endpoint, response.status, retried)
  ) {
    const refreshed = await tryRefreshSession(baseUrl);
    if (refreshed) {
      return apiRequest<T>(endpoint, init, true);
    }
  }

  if (!response.ok) {
    let message = `API error ${response.status}`;
    let errorCode: string | undefined;
    try {
      const body = (await response.json()) as { message?: string; errorCode?: string };
      if (body.message) message = body.message;
      errorCode = body.errorCode;
    } catch {
      const text = await response.text();
      if (text) message = text;
    }

    if (response.status === 401 && !retried) {
      message = "Your session expired. Please sign out and sign in again.";
    }

    throw new ApiError(response.status, message, errorCode);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function getAuthToken(): string | null {
  return null;
}
