import { z } from "zod";

const EnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url().optional(),
  NEXT_PUBLIC_SOCKET_URL: z.string().url().optional(),
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string().optional(),
});

export const env = (() => {
  const apiRaw = process.env.NEXT_PUBLIC_API_URL;
  const socketRaw = process.env.NEXT_PUBLIC_SOCKET_URL;
  const googleId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const apiUrl = (apiRaw && apiRaw.trim() !== "") ? apiRaw : "http://localhost:3001";
  const socketUrl = (socketRaw && socketRaw.trim() !== "") ? socketRaw : "http://localhost:3001";

  const parsed = EnvSchema.safeParse({
    NEXT_PUBLIC_API_URL: apiUrl,
    NEXT_PUBLIC_SOCKET_URL: socketUrl,
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: googleId,
  });

  if (!parsed.success) {
    console.warn("Env parsing issues (using fallbacks):", parsed.error.issues);
  }

  return {
    NEXT_PUBLIC_API_URL: apiUrl,
    NEXT_PUBLIC_SOCKET_URL: socketUrl,
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: googleId,
  };
})();
