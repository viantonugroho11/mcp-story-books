import { assertAllowedBaseUrl, type AppConfig } from "../config/config.js";
import type { AuthProvider } from "../auth/auth-provider.js";
import { StoryBookError, mapHttpStatusToError } from "../domain/errors.js";
import { logInfo } from "../logging/logger.js";

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

export interface StoryBookClient {
  request<T>(path: string, options?: RequestInit): Promise<T>;
  requestText(path: string, options?: RequestInit): Promise<string>;
  resolveUrl(path: string): string;
}

export function createStoryBookClient(
  config: AppConfig,
  authProvider: AuthProvider,
): StoryBookClient {
  const base = assertAllowedBaseUrl(config.baseUrl);

  function resolveUrl(path: string): string {
    if (path.startsWith("http://") || path.startsWith("https://")) {
      throw new StoryBookError(
        "FORBIDDEN",
        "Absolute URLs are not allowed; use paths relative to STORYBOOK_BASE_URL",
      );
    }
    const normalized = path.startsWith("/") ? path : `/${path}`;
    const target = new URL(normalized, base);
    if (target.origin !== base.origin) {
      throw new StoryBookError("FORBIDDEN", "Request path must stay on configured STORYBOOK_BASE_URL");
    }
    return target.toString();
  }

  async function sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function requestText(path: string, options: RequestInit = {}): Promise<string> {
    const url = resolveUrl(path);
    let attempt = 0;

    while (true) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);
      const started = Date.now();

      try {
        const authHeaders = await authProvider.getRequestHeaders();
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            Accept: "application/json, text/html, text/plain, */*",
            ...authHeaders,
            ...(options.headers ?? {}),
          },
        });

        const buffer = await response.arrayBuffer();
        if (buffer.byteLength > config.maxResponseBytes) {
          throw new StoryBookError(
            "INVALID_RESPONSE",
            `Response exceeded max size (${config.maxResponseBytes} bytes)`,
            response.status,
          );
        }

        const text = new TextDecoder().decode(buffer);

        logInfo("upstream_request", {
          path,
          durationMs: Date.now() - started,
          status: response.status,
          bytes: buffer.byteLength,
        });

        if (!response.ok) {
          const err = mapHttpStatusToError(
            response.status,
            `Upstream request failed for ${path}: HTTP ${response.status}`,
          );
          if (RETRYABLE_STATUSES.has(response.status) && attempt < config.maxRetries) {
            attempt += 1;
            await sleep(Math.min(1000 * 2 ** attempt, 8000));
            continue;
          }
          throw err;
        }

        return text;
      } catch (error) {
        if (error instanceof StoryBookError) {
          throw error;
        }
        if (error instanceof Error && error.name === "AbortError") {
          throw new StoryBookError("TIMEOUT", `Request timed out after ${config.requestTimeoutMs}ms`);
        }
        throw new StoryBookError(
          "UPSTREAM_ERROR",
          error instanceof Error ? error.message : "Unknown upstream error",
        );
      } finally {
        clearTimeout(timeout);
      }
    }
  }

  async function request<T>(path: string, options?: RequestInit): Promise<T> {
    const text = await requestText(path, options);
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new StoryBookError("INVALID_RESPONSE", `Expected JSON response from ${path}`);
    }
  }

  return { request, requestText, resolveUrl };
}
