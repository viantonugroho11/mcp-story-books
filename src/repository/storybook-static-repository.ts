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
import { toMetadata, truncateContent } from "./story-mapper.js";
import { StorybookChunkResolver } from "../storybook/chunk-resolver.js";
import { storybookIndexSchema, type StorybookIndexEntry } from "../storybook/types.js";
import { extractPlainTextFromChunk, extractSectionsFromChunk } from "../storybook/text-extractor.js";

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
  const hits = tokens.filter((t) => text.includes(t)).length;
  return hits / Math.max(tokens.length, 1);
}

function entryToStoryShell(entry: StorybookIndexEntry): Story {
  const tags = entry.tags ?? [];
  return {
    id: entry.id,
    title: `${entry.title} / ${entry.name}`,
    slug: entry.id,
    description: entry.importPath,
    category: entry.title.split("/")[0],
    tags,
    sections: [],
    metadata: {
      storybookType: entry.type,
      importPath: entry.importPath,
      componentPath: entry.componentPath,
    },
    url: `/?path=/${entry.type}/${entry.id}`,
    content: undefined,
  };
}

export class StorybookStaticRepository implements StoryRepository {
  private readonly chunkResolver: StorybookChunkResolver;
  private readonly indexCacheKey = "storybook:index";

  constructor(
    private readonly client: StoryBookClient,
    private readonly cache: Cache,
    private readonly cacheEnabled: boolean,
    private readonly cacheTtlSeconds: number,
  ) {
    this.chunkResolver = new StorybookChunkResolver(client, cache, cacheTtlSeconds, cacheEnabled);
  }

  private async loadIndexEntries(): Promise<StorybookIndexEntry[]> {
    if (this.cacheEnabled) {
      const cached = this.cache.get<StorybookIndexEntry[]>(this.indexCacheKey);
      if (cached) {
        return cached;
      }
    }

    const payload = await this.chunkResolver.loadIndex();
    const parsed = storybookIndexSchema.parse(payload);
    const entries = Object.values(parsed.entries);

    if (this.cacheEnabled) {
      this.cache.set(this.indexCacheKey, entries, this.cacheTtlSeconds);
    }

    return entries;
  }

  private findEntry(entries: StorybookIndexEntry[], storyId: string): StorybookIndexEntry {
    const entry = entries.find((e) => e.id === storyId || e.id === storyId.replace(/\//g, "-"));
    if (!entry) {
      throw new StoryBookError("NOT_FOUND", `Story not found: ${storyId}`);
    }
    return entry;
  }

  private async hydrateStory(entry: StorybookIndexEntry): Promise<Story> {
    const story = entryToStoryShell(entry);
    const chunk = await this.chunkResolver.fetchEntrySource(entry.importPath);
    if (!chunk) {
      story.content = `[${entry.type}] ${story.title}\nimportPath: ${entry.importPath ?? "n/a"}`;
      story.sections = [
        {
          id: "summary",
          storyId: entry.id,
          title: "Summary",
          content: story.content,
          order: 0,
        },
      ];
      return story;
    }

    const extractedSections = extractSectionsFromChunk(chunk);
    story.sections = extractedSections.map((section, order) => ({
      id: section.id,
      storyId: entry.id,
      title: section.title,
      content: section.content || section.title,
      order,
    }));

    story.content = extractPlainTextFromChunk(chunk) || story.sections.map((s) => s.content).join("\n\n");
    return story;
  }

  async listStories(filter: StoryFilter = {}): Promise<Story[]> {
    let entries = await this.loadIndexEntries();

    if (filter.category) {
      entries = entries.filter((e) => e.title.startsWith(filter.category!));
    }
    if (filter.tags?.length) {
      entries = entries.filter((e) => filter.tags!.every((tag) => (e.tags ?? []).includes(tag)));
    }
    if (filter.query) {
      entries = entries.filter(
        (e) =>
          scoreMatch(`${e.title} ${e.name} ${e.importPath ?? ""} ${(e.tags ?? []).join(" ")}`, filter.query!) >
          0,
      );
    }

    const offset = filter.offset ?? 0;
    const limit = filter.limit ?? 50;
    return entries.slice(offset, offset + limit).map(entryToStoryShell);
  }

  async getStory(storyId: string): Promise<Story> {
    const cacheKey = `storybook:story:${storyId}`;
    if (this.cacheEnabled) {
      const cached = this.cache.get<Story>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const entries = await this.loadIndexEntries();
    const entry = this.findEntry(entries, storyId);
    const story = await this.hydrateStory(entry);

    if (this.cacheEnabled) {
      this.cache.set(cacheKey, story, this.cacheTtlSeconds);
    }
    return story;
  }

  async searchStories(query: string, options: SearchOptions = {}): Promise<StorySearchResult[]> {
    const limit = options.limit ?? 20;
    const entries = await this.loadIndexEntries();
    const ranked = entries
      .map((entry) => {
        const shell = entryToStoryShell(entry);
        const score = scoreMatch(
          `${shell.title} ${shell.description ?? ""} ${shell.tags.join(" ")}`,
          query,
        );
        return { entry, shell, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    const results: StorySearchResult[] = ranked.slice(0, limit).map((item) => ({
      storyId: item.entry.id,
      storyTitle: item.shell.title,
      snippet: truncateContent(item.shell.description ?? item.shell.title, 240),
      score: item.score,
    }));

    const contentCandidates = [
      ...ranked.slice(0, Math.min(8, ranked.length)).map((item) => item.entry),
      ...entries.filter((entry) => entry.type === "docs"),
    ].filter((entry, index, array) => array.findIndex((e) => e.id === entry.id) === index);

    for (const entry of contentCandidates) {
      const item = { entry, shell: entryToStoryShell(entry) };
      try {
        const story = await this.hydrateStory(entry);
        const contentScore = scoreMatch(story.content ?? "", query);
        if (contentScore > 0) {
          results.push({
            storyId: entry.id,
            storyTitle: story.title,
            snippet: truncateContent(story.content ?? "", 240),
            score: contentScore,
          });
        }
        for (const section of story.sections) {
          const sectionScore = scoreMatch(`${section.title} ${section.content}`, query);
          if (sectionScore > 0) {
            results.push({
              storyId: entry.id,
              storyTitle: story.title,
              sectionId: section.id,
              sectionTitle: section.title,
              snippet: truncateContent(section.content, 240),
              score: sectionScore,
            });
          }
        }
      } catch {
        // ignore hydration errors for individual entries
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
    const entries = await this.loadIndexEntries();
    const entry = this.findEntry(entries, storyId);
    return toMetadata(entryToStoryShell(entry));
  }
}

export async function isStorybookStaticSite(client: StoryBookClient): Promise<boolean> {
  try {
    const payload = await client.request<{ v?: number }>("/index.json");
    return payload.v === 5;
  } catch {
    return false;
  }
}
