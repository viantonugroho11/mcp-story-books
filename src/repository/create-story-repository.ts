import type { AppConfig } from "../config/config.js";
import type { StoryBookClient } from "../api/storybook-client.js";
import type { Cache } from "../cache/memory-cache.js";
import type { StoryRepository } from "./story-repository.js";
import { AuthenticatedStoryRepository } from "./authenticated-story-repository.js";
import { isStorybookStaticSite, StorybookStaticRepository } from "./storybook-static-repository.js";

export async function createStoryRepository(
  config: AppConfig,
  client: StoryBookClient,
  cache: Cache,
): Promise<StoryRepository> {
  const mode = config.dataSource ?? "auto";

  if (mode === "storybook-static") {
    return new StorybookStaticRepository(client, cache, config.cacheEnabled, config.cacheTtlSeconds);
  }

  if (mode === "rest-api") {
    return AuthenticatedStoryRepository.create(config, client, cache);
  }

  if (await isStorybookStaticSite(client)) {
    return new StorybookStaticRepository(client, cache, config.cacheEnabled, config.cacheTtlSeconds);
  }

  return AuthenticatedStoryRepository.create(config, client, cache);
}
