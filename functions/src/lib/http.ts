import * as logger from "firebase-functions/logger";

/**
 * Every outbound call in this codebase goes through these helpers.
 *
 * The VM that hosts OpenWA is deallocated outside business hours, so a
 * request can hang against a half-woken host indefinitely. Node's fetch has
 * no default timeout, and a hung request inside a Cloud Function burns the
 * full timeoutSeconds budget before failing — which is exactly how a paid
 * invoice ends up with no WhatsApp message and no error anyone can see.
 */
export const DEFAULT_TIMEOUT_MS = 15000;

export class HttpTimeoutError extends Error {
  constructor(url: string, timeoutMs: number) {
    super(`Request to ${url} timed out after ${timeoutMs}ms`);
    this.name = "HttpTimeoutError";
  }
}

export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {...options, signal: controller.signal});
  } catch (error: any) {
    if (error?.name === "AbortError") {
      throw new HttpTimeoutError(url, timeoutMs);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export interface RetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  label?: string;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retries a transient failure with exponential backoff and jitter.
 *
 * Jitter matters here: when the VM wakes, several queued deliveries retry at
 * once, and a fixed backoff would make them all hit the freshly booted
 * service in the same instant.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const attempts = options.attempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 1000;
  const maxDelayMs = options.maxDelayMs ?? 8000;
  const label = options.label ?? "operation";

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      if (error?.permanent === true || attempt === attempts) break;
      const backoff = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
      const delay = backoff / 2 + Math.random() * (backoff / 2);
      logger.warn(`${label} failed, retrying`, {
        attempt,
        attempts,
        delayMs: Math.round(delay),
        error: error?.message || String(error),
      });
      await sleep(delay);
    }
  }
  throw lastError;
}

/** Marks an error as non-retryable so withRetry gives up immediately. */
export function permanent<E extends Error>(error: E): E {
  (error as any).permanent = true;
  return error;
}

/**
 * Reads a response body defensively. OpenWA returns JSON on success but a
 * plain-text proxy error while the VM is still coming up, and calling
 * res.json() on that throws a parse error that hides the real status.
 */
export async function readBody(res: Response): Promise<any> {
  const text = await res.text().catch(() => "");
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {message: text.slice(0, 500)};
  }
}
