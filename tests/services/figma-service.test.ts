import { describe, it, expect } from "vitest";
import { FigmaService } from "../../src/services/figma-service.js";
import type { StoryRepository } from "../../src/repository/story-repository.js";
import type { Story } from "../../src/domain/story.js";

function makeRepo(entries: Story[]): StoryRepository {
  return {
    async listStories() {
      return entries;
    },
    async getStory() {
      throw new Error("not used");
    },
  } as unknown as StoryRepository;
}

const sampleEntries: Story[] = [
  {
    id: "components-button--primary",
    title: "Components/Button / Primary",
    tags: [],
    sections: [],
    metadata: { importPath: "./src/Button.stories.tsx" },
  },
  {
    id: "components-button--secondary",
    title: "Components/Button / Secondary Large",
    tags: [],
    sections: [],
    metadata: { importPath: "./src/Button.stories.tsx" },
  },
  {
    id: "components-card--default",
    title: "Components/Card / Default",
    tags: [],
    sections: [],
    metadata: { importPath: "./src/Card.stories.tsx" },
  },
];

describe("FigmaService", () => {
  it("matches by convention: Button / Primary → Button variant=primary", async () => {
    const svc = new FigmaService(makeRepo(sampleEntries), undefined);
    const result = await svc.mapFigmaComponent({ figmaName: "Button / Primary" });

    expect(result.match).not.toBeNull();
    expect(result.match!.storybookComponent).toBe("Button");
    expect(result.match!.suggestedProps.variant).toBe("primary");
  });

  it("infers size prop from Figma variant tokens", async () => {
    const svc = new FigmaService(makeRepo(sampleEntries), undefined);
    const result = await svc.mapFigmaComponent({ figmaName: "Button / Secondary / Large" });

    expect(result.match!.suggestedProps.variant).toBe("secondary");
    expect(result.match!.suggestedProps.size).toBe("large");
  });

  it("returns null match with alternatives when no exact name match", async () => {
    const svc = new FigmaService(makeRepo(sampleEntries), undefined);
    const result = await svc.mapFigmaComponent({ figmaName: "Buttonn / Primary" });

    expect(result.match).toBeNull();
    expect(result.alternatives.length).toBeGreaterThan(0);
    expect(result.alternatives[0]!.storybookComponent).toBe("Button");
  });

  it("extracts figmaName from figmaUrl node-name query param", async () => {
    const svc = new FigmaService(makeRepo(sampleEntries), undefined);
    const result = await svc.mapFigmaComponent({
      figmaUrl: "https://www.figma.com/file/abc?node-name=Card+%2F+Default",
    });

    expect(result.match!.storybookComponent).toBe("Card");
  });
});
