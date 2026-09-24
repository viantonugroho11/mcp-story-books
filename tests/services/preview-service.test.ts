import { describe, it, expect } from "vitest";
import { PreviewService } from "../../src/services/preview-service.js";
import type { StoryRepository } from "../../src/repository/story-repository.js";

function repo(): StoryRepository {
  return {
    async getStoryMetadata(id: string) {
      return {
        id,
        title: "Components/Button / Primary",
        tags: [],
        extra: {},
      };
    },
  } as unknown as StoryRepository;
}

describe("PreviewService", () => {
  it("builds preview URL with args encoded", async () => {
    const svc = new PreviewService(repo(), "https://storybook.example.com");
    const result = await svc.previewStory({
      storyId: "components-button--primary",
      args: { variant: "primary", size: "lg", disabled: true },
    });

    expect(result.previewUrl).toContain("https://storybook.example.com/iframe.html");
    expect(result.previewUrl).toContain("id=components-button--primary");
    expect(result.previewUrl).toContain("variant%3Aprimary");
    expect(result.previewUrl).toContain("size%3Alg");
    expect(result.previewUrl).toContain("disabled%3A%21true");
  });

  it("builds manager URL for browsing", async () => {
    const svc = new PreviewService(repo(), "https://storybook.example.com");
    const result = await svc.previewStory({ storyId: "button--primary" });

    expect(result.managerUrl).toContain("path=%2Fstory%2Fbutton--primary");
  });

  it("preserves viewport in result", async () => {
    const svc = new PreviewService(repo(), "https://storybook.example.com");
    const result = await svc.previewStory({
      storyId: "button--primary",
      viewport: { width: 375, height: 667 },
    });

    expect(result.viewport).toEqual({ width: 375, height: 667 });
  });
});
