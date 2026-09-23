import { z } from "zod";

const authTypeSchema = z.enum(["basic", "bearer", "cookie", "oauth", "none"]);
const dataSourceSchema = z.enum(["auto", "storybook-static", "rest-api"]);

const configSchema = z
  .object({
    baseUrl: z.string().url(),
    authType: authTypeSchema,
    basicAuthUsername: z.string().optional(),
    basicAuthPassword: z.string().optional(),
    accessToken: z.string().optional(),
    sessionCookie: z.string().optional(),
    oauthClientId: z.string().optional(),
    oauthClientSecret: z.string().optional(),
    oauthRefreshToken: z.string().optional(),
    requestTimeoutMs: z.coerce.number().int().positive().default(30_000),
    maxResponseBytes: z.coerce.number().int().positive().default(5_242_880),
    maxRetries: z.coerce.number().int().min(0).max(10).default(3),
    cacheEnabled: z.coerce.boolean().default(true),
    cacheTtlSeconds: z.coerce.number().int().positive().default(300),
    discoveryPath: z.string().optional(),
    apiListStories: z.string().optional(),
    apiGetStory: z.string().optional(),
    apiSearch: z.string().optional(),
    dataSource: dataSourceSchema.default("auto"),
  })
  .superRefine((value, ctx) => {
    if (value.authType === "basic") {
      if (!value.basicAuthUsername || !value.basicAuthPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "STORYBOOK_BASIC_AUTH_USERNAME and STORYBOOK_BASIC_AUTH_PASSWORD are required when STORYBOOK_AUTH_TYPE=basic",
        });
      }
    }
    if (value.authType === "bearer" && !value.accessToken) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "STORYBOOK_ACCESS_TOKEN is required when STORYBOOK_AUTH_TYPE=bearer",
      });
    }
    if (value.authType === "cookie" && !value.sessionCookie) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "STORYBOOK_SESSION_COOKIE is required when STORYBOOK_AUTH_TYPE=cookie",
      });
    }
    if (value.authType === "oauth") {
      if (!value.oauthClientId || !value.oauthClientSecret) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "STORYBOOK_CLIENT_ID and STORYBOOK_CLIENT_SECRET are required when STORYBOOK_AUTH_TYPE=oauth",
        });
      }
    }
  });

export type AppConfig = z.infer<typeof configSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = configSchema.safeParse({
    baseUrl: env.STORYBOOK_BASE_URL,
    authType: env.STORYBOOK_AUTH_TYPE ?? "none",
    basicAuthUsername: env.STORYBOOK_BASIC_AUTH_USERNAME,
    basicAuthPassword: env.STORYBOOK_BASIC_AUTH_PASSWORD,
    accessToken: env.STORYBOOK_ACCESS_TOKEN,
    sessionCookie: env.STORYBOOK_SESSION_COOKIE,
    oauthClientId: env.STORYBOOK_CLIENT_ID,
    oauthClientSecret: env.STORYBOOK_CLIENT_SECRET,
    oauthRefreshToken: env.STORYBOOK_REFRESH_TOKEN,
    requestTimeoutMs: env.STORYBOOK_REQUEST_TIMEOUT_MS,
    maxResponseBytes: env.STORYBOOK_MAX_RESPONSE_BYTES,
    maxRetries: env.STORYBOOK_MAX_RETRIES,
    cacheEnabled: env.CACHE_ENABLED,
    cacheTtlSeconds: env.CACHE_TTL,
    discoveryPath: env.STORYBOOK_DISCOVERY_PATH,
    apiListStories: env.STORYBOOK_API_LIST_STORIES,
    apiGetStory: env.STORYBOOK_API_GET_STORY,
    apiSearch: env.STORYBOOK_API_SEARCH,
    dataSource: env.STORYBOOK_DATA_SOURCE,
  });

  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join("; ");
    throw new Error(`Invalid configuration: ${message}`);
  }

  return parsed.data;
}

export function assertAllowedBaseUrl(baseUrl: string): URL {
  const url = new URL(baseUrl);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("STORYBOOK_BASE_URL must use http or https");
  }
  if (url.username || url.password) {
    throw new Error("Credentials must not be embedded in STORYBOOK_BASE_URL");
  }
  return url;
}
