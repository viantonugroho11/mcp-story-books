import type { AppConfig } from "../config/config.js";
import type { StoryBookClient } from "../api/storybook-client.js";
import type { Cache } from "../cache/memory-cache.js";
import type {
  SearchOptions,
  Story,
  StoryFilter,
  StoryMetadata,
  StorySearchResult,
  StorySection,
} from "../domain/story.js";
import { StoryBookError } from "../domain/errors.js";
import type { StoryRepository } from "./story-repository.js";
import {
  normalizeStory,
  normalizeStoryList,
  toMetadata,
  truncateContent,
} from "./story-mapper.js";
import { readFileSync } from "node:fs";
import { discoveryReportSchema, type DiscoveryReport } from "../discovery/types.js";

interface ApiEndpoints {
  listStories?: string;
  getStory?: string;
  search?: string;
}

function interpolate(pathTemplate: string, params: Record<string, string>): string {
  return pathTemplate.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = params[key];
    if (!value) {
      throw new StoryBookError("CONFIGURATION_ERROR", `Missing path parameter: ${key}`);
    }
    return encodeURIComponent(value);
  });
}

function loadDiscovery(config: AppConfig): DiscoveryReport | undefined {
  if (!config.discoveryPath) {
    return undefined;
  }
  try {
    const raw = readFileSync(config.discoveryPath, "utf8");
    return discoveryReportSchema.parse(JSON.parse(raw));
  } catch (error) {
    throw new StoryBookError(
      "CONFIGURATION_ERROR",
      error instanceof Error ? error.message : "Failed to load discovery file",
    );
  }
}

function resolveEndpoints(config: AppConfig, discovery?: DiscoveryReport): ApiEndpoints {
  return {
    listStories: config.apiListStories ?? discovery?.endpoints.listStories,
    getStory: config.apiGetStory ?? discovery?.endpoints.getStory,
    search: config.apiSearch ?? discovery?.endpoints.search,
  };
}

function assertConfiguredEndpoints(endpoints: ApiEndpoints): void {
  if (!endpoints.listStories || !endpoints.getStory) {
    throw new StoryBookError(
      "CONFIGURATION_ERROR",
      "Story Book API endpoints are not configured. Run `npm run discover` with valid credentials, then set STORYBOOK_DISCOVERY_PATH or STORYBOOK_API_* env vars.",
    );
  }
}

function scoreMatch(haystack: string, needle: string): number {
  const text = haystack.toLowerCase();
  const q = needle.toLowerCase().trim();
  if (!q) {
    return 0;
  }
  if (text.includes(q)) {
    return 1;
  }
  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return 0;
  }
  const hits = tokens.filter((t) => text.includes(t)).length;
  return hits / tokens.length;
}

export class AuthenticatedStoryRepository implements StoryRepository {
  private readonly endpoints: ApiEndpoints;
  private readonly listCacheKey = "stories:all";

  constructor(
    private readonly config: AppConfig,
    private readonly client: StoryBookClient,
    private readonly cache: Cache,
    discovery?: DiscoveryReport,
  ) {
    this.endpoints = resolveEndpoints(config, discovery);
  }

  static create(
    config: AppConfig,
    client: StoryBookClient,
    cache: Cache,
  ): AuthenticatedStoryRepository {
    const discovery = loadDiscovery(config);
    return new AuthenticatedStoryRepository(config, client, cache, discovery);
  }

  private async fetchAllStories(): Promise<Story[]> {
    assertConfiguredEndpoints(this.endpoints);
    if (this.config.cacheEnabled) {
      const cached = this.cache.get<Story[]>(this.listCacheKey);
      if (cached) {
        return cached;
      }
    }

    const payload = await this.client.request<unknown>(this.endpoints.listStories!);
    const stories = normalizeStoryList(payload);

    if (this.config.cacheEnabled) {
      this.cache.set(this.listCacheKey, stories, this.config.cacheTtlSeconds);
    }

    return stories;
  }

  async listStories(filter: StoryFilter = {}): Promise<Story[]> {
    let stories = await this.fetchAllStories();

    if (filter.category) {
      stories = stories.filter((s) => s.category === filter.category);
    }
    if (filter.tags?.length) {
      stories = stories.filter((s) => filter.tags!.every((tag) => s.tags.includes(tag)));
    }
    if (filter.query) {
      const q = filter.query;
      stories = stories.filter(
        (s) =>
          scoreMatch(`${s.title} ${s.description ?? ""} ${s.tags.join(" ")}`, q) > 0,
      );
    }

    const offset = filter.offset ?? 0;
    const limit = filter.limit ?? 50;
    return stories.slice(offset, offset + limit).map((story) => ({
      ...story,
      content: undefined,
      sections: story.sections.map((section) => ({ ...section, content: "" })),
    }));
  }

  async getStory(storyId: string): Promise<Story> {
    assertConfiguredEndpoints(this.endpoints);
    const cacheKey = `story:${storyId}`;
    if (this.config.cacheEnabled) {
      const cached = this.cache.get<Story>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const path = interpolate(this.endpoints.getStory!, { storyId });
    let story: Story;
    try {
      const payload = await this.client.request<unknown>(path);
      story = normalizeStory(payload, storyId);
    } catch (error) {
      if (error instanceof StoryBookError && error.code === "NOT_FOUND") {
        const stories = await this.fetchAllStories();
        const found = stories.find((s) => s.id === storyId || s.slug === storyId);
        if (!found) {
          throw error;
        }
        story = found;
      } else if (error instanceof StoryBookError && error.code === "INVALID_RESPONSE") {
        const stories = await this.fetchAllStories();
        const found = stories.find((s) => s.id === storyId || s.slug === storyId);
        if (!found) {
          throw error;
        }
        story = found;
      } else {
        throw error;
      }
    }

    if (this.config.cacheEnabled) {
      this.cache.set(cacheKey, story, this.config.cacheTtlSeconds);
    }
    return story;
  }

  async searchStories(query: string, options: SearchOptions = {}): Promise<StorySearchResult[]> {
    const limit = options.limit ?? 20;

    if (this.endpoints.search) {
      const cacheKey = `search:${query}:${limit}`;
      if (this.config.cacheEnabled) {
        const cached = this.cache.get<StorySearchResult[]>(cacheKey);
        if (cached) {
          return cached;
        }
      }

      const path = `${this.endpoints.search}?q=${encodeURIComponent(query)}&limit=${limit}`;
      try {
        const payload = await this.client.request<{ results?: StorySearchResult[] } | StorySearchResult[]>(
          path,
        );
        const results = Array.isArray(payload) ? payload : (payload.results ?? []);
        if (this.config.cacheEnabled) {
          this.cache.set(cacheKey, results, this.config.cacheTtlSeconds);
        }
        return results.slice(0, limit);
      } catch (error) {
        if (!(error instanceof StoryBookError) || error.code === "NOT_FOUND") {
          // fall through to local search
        } else if (error.code !== "INVALID_RESPONSE") {
          throw error;
        }
      }
    }

    const stories = await this.fetchAllStories();
    const results: StorySearchResult[] = [];

    for (const story of stories) {
      const storyHaystack = `${story.title} ${story.description ?? ""} ${story.content ?? ""} ${story.tags.join(" ")}`;
      const storyScore = scoreMatch(storyHaystack, query);
      if (storyScore > 0) {
        results.push({
          storyId: story.id,
          storyTitle: story.title,
          snippet: truncateContent(story.description ?? story.content ?? story.title, 240),
          score: storyScore,
        });
      }

      for (const section of story.sections) {
        const sectionScore = scoreMatch(`${section.title} ${section.content}`, query);
        if (sectionScore > 0) {
          results.push({
            storyId: story.id,
            storyTitle: story.title,
            sectionId: section.id,
            sectionTitle: section.title,
            snippet: truncateContent(section.content || section.title, 240),
            score: sectionScore,
          });
        }
      }
    }

    return results
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, limit);
  }

  async getStorySection(storyId: string, sectionId: string): Promise<StorySection> {
    const story = await this.getStory(storyId);
    const section = story.sections.find((s) => s.id === sectionId);
    if (!section) {
      throw new StoryBookError("NOT_FOUND", `Section not found: ${sectionId}`);
    }
    return section;
  }

  async getStoryMetadata(storyId: string): Promise<StoryMetadata> {
    const story = await this.getStory(storyId);
    return toMetadata(story);
  }
}
