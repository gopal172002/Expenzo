import { API_BASE } from "../api/config";

/** Point stored receipt URLs at the current API origin (Vite proxy or remote API). */
export function receiptSrc(url?: string | null): string | undefined {
  if (!url) return undefined;
  const match = url.match(/\/api\/receipts\/([a-f0-9]{32})/i);
  if (match) {
    const base = API_BASE.replace(/\/$/, "");
    return `${base}/receipts/${match[1]}`;
  }
  return url;
}
