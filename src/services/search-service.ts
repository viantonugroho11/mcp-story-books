import type { StoryRepository } from "../repository/story-repository.js";
import type { StoryContextResult, StorySearchResult } from "../domain/story.js";
import { truncateContent } from "../repository/story-mapper.js";

export class SearchService {
  constructor(private readonly repository: StoryRepository) {}

  searchStories(query: string, limit?: number): Promise<StorySearchResult[]> {
    return this.repository.searchStories(query, { limit });
  }

  async getStoryContext(
    query: string,
    options: { storyId?: string; maxResults?: number } = {},
  ): Promise<StoryContextResult> {
    const maxResults = options.maxResults ?? 5;
    const searchResults = await this.repository.searchStories(query, {
      limit: Math.max(maxResults * 3, 15),
    });

    const filtered = options.storyId
      ? searchResults.filter((r) => r.storyId === options.storyId)
      : searchResults;

    const top = filtered.slice(0, maxResults);
    const results: StoryContextResult["results"] = [];

    for (const hit of top) {
      if (hit.sectionId) {
        const section = await this.repository.getStorySection(hit.storyId, hit.sectionId);
        results.push({
          storyId: hit.storyId,
          storyTitle: hit.storyTitle,
          sectionId: section.id,
          sectionTitle: section.title,
          content: truncateContent(section.content, 4000),
          score: hit.score,
        });
      } else {
        const story = await this.repository.getStory(hit.storyId);
        const content =
          story.content ??
          story.sections.map((s) => `# ${s.title}\n${s.content}`).join("\n\n");
        results.push({
          storyId: story.id,
          storyTitle: story.title,
          content: truncateContent(content, 4000),
          score: hit.score,
        });
      }
    }

    return { query, results };
  }
}
