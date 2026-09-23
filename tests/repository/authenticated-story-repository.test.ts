import { describe, expect, it } from "vitest";
import { AuthenticatedStoryRepository } from "../../src/repository/authenticated-story-repository.js";
import { MemoryCache } from "../../src/cache/memory-cache.js";
import type { AppConfig } from "../../src/config/config.js";
import type { StoryBookClient } from "../../src/api/storybook-client.js";
import { StoryBookError } from "../../src/domain/errors.js";

const config: AppConfig = {
  baseUrl: "https://amt-fds-prod.vercel.app",
  authType: "none",
  requestTimeoutMs: 5000,
  maxResponseBytes: 1024 * 1024,
  maxRetries: 0,
  cacheEnabled: true,
  cacheTtlSeconds: 60,
  apiListStories: "/api/stories",
  apiGetStory: "/api/stories/{storyId}",
};

describe("AuthenticatedStoryRepository", () => {
  it("lists and searches stories from configured API", async () => {
    const client: StoryBookClient = {
      resolveUrl: (p) => p,
      requestText: async () => "",
      request: async (path) => {
        if (path === "/api/stories") {
          return {
            stories: [
              {
                id: "pay-retry",
                title: "Payment Retry",
                description: "Handles failed debit attempts",
                tags: ["payments"],
                sections: [{ id: "flow", title: "Retry Flow", content: "Retry after 24 hours" }],
              },
            ],
          };
        }
        throw new StoryBookError("NOT_FOUND", "missing");
      },
    };

    const repo = new AuthenticatedStoryRepository(config, client, new MemoryCache());
    const list = await repo.listStories();
    expect(list).toHaveLength(1);
    expect(list[0]?.content).toBeUndefined();

    const results = await repo.searchStories("retry flow");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.storyId).toBe("pay-retry");
  });

  it("throws configuration error when endpoints missing", async () => {
    const client: StoryBookClient = {
      resolveUrl: (p) => p,
      requestText: async () => "",
      request: async () => ({}),
    };
    const repo = new AuthenticatedStoryRepository(
      { ...config, apiListStories: undefined, apiGetStory: undefined },
      client,
      new MemoryCache(),
    );
    await expect(repo.listStories()).rejects.toMatchObject({ code: "CONFIGURATION_ERROR" });
  });
});
