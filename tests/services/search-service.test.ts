import { describe, expect, it } from "vitest";
import { SearchService } from "../../src/services/search-service.js";
import type { StoryRepository } from "../../src/repository/story-repository.js";

describe("SearchService.getStoryContext", () => {
  it("returns ranked context blocks", async () => {
    const repository: StoryRepository = {
      async searchStories() {
        return [
          {
            storyId: "s1",
            storyTitle: "Payment Retry",
            sectionId: "flow",
            sectionTitle: "Retry Flow",
            snippet: "…",
            score: 0.9,
          },
        ];
      },
      async getStorySection() {
        return {
          id: "flow",
          storyId: "s1",
          title: "Retry Flow",
          content: "Charge again after cooldown",
        };
      },
      async listStories() {
        return [];
      },
      async getStory() {
        throw new Error("not used");
      },
      async getStoryMetadata() {
        throw new Error("not used");
      },
    };

    const service = new SearchService(repository);
    const context = await service.getStoryContext("payment retry", { maxResults: 1 });
    expect(context.results[0]?.content).toContain("cooldown");
  });
});
