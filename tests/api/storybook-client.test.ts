import { describe, expect, it, vi, afterEach } from "vitest";
import { createStoryBookClient } from "../../src/api/storybook-client.js";
import type { AppConfig } from "../../src/config/config.js";
import type { AuthProvider } from "../../src/auth/auth-provider.js";
import { StoryBookError } from "../../src/domain/errors.js";

const baseConfig: AppConfig = {
  baseUrl: "https://amt-fds-prod.vercel.app",
  authType: "none",
  requestTimeoutMs: 5000,
  maxResponseBytes: 1024,
  maxRetries: 1,
  cacheEnabled: false,
  cacheTtlSeconds: 300,
};

const authProvider: AuthProvider = {
  async getRequestHeaders() {
    return {};
  },
};

describe("storybook-client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("blocks absolute URLs (SSRF guard)", () => {
    const client = createStoryBookClient(baseConfig, authProvider);
    expect(() => client.resolveUrl("https://evil.example/secret")).toThrow(StoryBookError);
  });

  it("blocks off-origin resolved URLs", () => {
    const client = createStoryBookClient(baseConfig, authProvider);
    expect(() => client.resolveUrl("//evil.example/api")).toThrow(StoryBookError);
  });

  it("maps 401 to AUTHENTICATION_REQUIRED", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 401 })),
    );
    const client = createStoryBookClient(baseConfig, authProvider);
    await expect(client.requestText("/")).rejects.toMatchObject({ code: "AUTHENTICATION_REQUIRED" });
  });
});
