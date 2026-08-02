/**
 * fetch() has no built-in timeout - a stalled connection (dropped network
 * mid-request, or a server that accepts a connection but never responds)
 * leaves the promise unresolved forever with no error, which is what made
 * screens across this app look permanently stuck loading with no way to
 * recover. This wraps fetch() with an AbortController so every call
 * eventually fails instead of hanging indefinitely.
 */
export async function fetchWithTimeout(url: string, options?: RequestInit, timeoutMs = 25000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}
