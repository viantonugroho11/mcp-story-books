import { describe, expect, it } from "vitest";
import { createAuthProvider } from "../../src/auth/auth-provider.js";
import type { AppConfig } from "../../src/config/config.js";

describe("createAuthProvider", () => {
  it("builds basic auth header", async () => {
    const config: AppConfig = {
      baseUrl: "https://amt-fds-prod.vercel.app",
      authType: "basic",
      basicAuthUsername: "user",
      basicAuthPassword: "pass",
      requestTimeoutMs: 1000,
      maxResponseBytes: 1000,
      maxRetries: 0,
      cacheEnabled: false,
      cacheTtlSeconds: 60,
    };
    const provider = createAuthProvider(config);
    const headers = await provider.getRequestHeaders();
    expect(headers.Authorization).toBe(`Basic ${Buffer.from("user:pass").toString("base64")}`);
    expect(JSON.stringify(headers)).not.toContain("pass");
  });
});
