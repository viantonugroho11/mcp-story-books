import type { AppConfig } from "../config/config.js";

export interface AuthHeaders {
  Authorization?: string;
  Cookie?: string;
}

export interface AuthProvider {
  getRequestHeaders(): Promise<AuthHeaders>;
}

export function createAuthProvider(config: AppConfig): AuthProvider {
  switch (config.authType) {
    case "basic":
      return {
        async getRequestHeaders() {
          const token = Buffer.from(
            `${config.basicAuthUsername}:${config.basicAuthPassword}`,
            "utf8",
          ).toString("base64");
          return { Authorization: `Basic ${token}` };
        },
      };
    case "bearer":
      return {
        async getRequestHeaders() {
          return { Authorization: `Bearer ${config.accessToken}` };
        },
      };
    case "cookie":
      return {
        async getRequestHeaders() {
          return { Cookie: config.sessionCookie ?? "" };
        },
      };
    case "oauth":
      return {
        async getRequestHeaders() {
          if (config.oauthRefreshToken) {
            return { Authorization: `Bearer ${config.oauthRefreshToken}` };
          }
          throw new Error("OAuth token refresh is not configured");
        },
      };
    case "none":
      return {
        async getRequestHeaders() {
          return {};
        },
      };
    default: {
      const _exhaustive: never = config.authType;
      throw new Error(`Unsupported auth type: ${String(_exhaustive)}`);
    }
  }
}
