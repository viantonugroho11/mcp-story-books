import { describe, expect, it } from "vitest";
import { ComponentService } from "../../src/services/component-service.js";
import type { StoryRepository } from "../../src/repository/story-repository.js";
import type { Story } from "../../src/domain/story.js";

const mockStories: Story[] = [
  {
    id: "components-alert--overview",
    title: "Components/Alert / Overview",
    tags: ["autodocs"],
    sections: [],
    metadata: { storybookType: "docs" },
  },
  {
    id: "components-alert--default",
    title: "Components/Alert / Default",
    tags: ["autodocs"],
    sections: [],
    metadata: { storybookType: "story" },
  },
  {
    id: "components-button--overview",
    title: "Components/Button / Overview",
    tags: [],
    sections: [],
    metadata: { storybookType: "docs" },
  },
];

describe("ComponentService", () => {
  const repository: StoryRepository = {
    async listStories(filter) {
      if (filter?.category === "Components") {
        return mockStories;
      }
      return mockStories;
    },
    async getStory(id) {
      return {
        ...mockStories.find((s) => s.id === id)!,
        content: "Alert docs body",
        sections: [{ id: "usage", storyId: id, title: "Usage", content: "Use for errors" }],
      };
    },
    async searchStories() {
      return [];
    },
    async getStorySection() {
      throw new Error("n/a");
    },
    async getStoryMetadata() {
      throw new Error("n/a");
    },
  };

  it("groups list_components by component path", async () => {
    const service = new ComponentService(repository);
    const list = await service.listComponents();
    expect(list).toHaveLength(2);
    expect(list.find((c) => c.name === "Alert")?.variantCount).toBe(2);
    expect(list.find((c) => c.name === "Alert")?.overviewStoryId).toBe("components-alert--overview");
  });

  it("get_component resolves short name", async () => {
    const service = new ComponentService(repository);
    const detail = await service.getComponent("Alert");
    expect(detail.path).toBe("Components/Alert");
    expect(detail.variants).toHaveLength(2);
    expect(detail.overview?.content).toContain("Alert docs");
  });
});
