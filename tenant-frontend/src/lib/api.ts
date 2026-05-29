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

export async function apiRequest<T>(endpoint: string, init?: RequestInit): Promise<T> {
  const baseUrl = env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
  const response = await fetch(`${baseUrl}${endpoint}`, {
    credentials: "include",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

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
