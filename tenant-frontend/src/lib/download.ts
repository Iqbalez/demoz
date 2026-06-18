import { env } from "./env";

/** Download a file from the API using the HttpOnly session cookie. */
export async function downloadWithSession(
  path: string,
  filename: string,
  options?: { openHtmlInNewTab?: boolean },
): Promise<void> {
  const baseUrl = env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const response = await fetch(`${baseUrl}${path}`, { credentials: "include" });

  if (!response.ok) {
    let message = `Download failed (${response.status})`;
    try {
      const text = await response.text();
      try {
        const body = JSON.parse(text) as { message?: string };
        if (body.message) message = body.message;
      } catch {
        if (text) message = text;
      }
    } catch {
      // body unreadable
    }
    throw new Error(message);
  }

  if (options?.openHtmlInNewTab) {
    const html = await response.text();
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
