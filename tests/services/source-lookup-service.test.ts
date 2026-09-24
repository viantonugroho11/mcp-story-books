import { describe, it, expect } from "vitest";
import { SourceLookupService } from "../../src/services/source-lookup-service.js";
import type { StoryRepository } from "../../src/repository/story-repository.js";
import type { Story } from "../../src/domain/story.js";

const entries: Story[] = [
  {
    id: "components-button--primary",
    title: "Components/Button / Primary",
    tags: [],
    sections: [],
    metadata: { importPath: "./src/components/Button.stories.tsx" },
  },
  {
    id: "components-card--default",
    title: "Components/Card / Default",
    tags: [],
    sections: [],
    metadata: { importPath: "./src/components/Card.stories.tsx" },
  },
];

function repo(): StoryRepository {
  return {
    async listStories() {
      return entries;
    },
  } as unknown as StoryRepository;
}

describe("SourceLookupService", () => {
  it("matches by basename regardless of directory prefix", async () => {
    const svc = new SourceLookupService(repo());
    const result = await svc.findStoriesBySourceFile("apps/web/src/components/Button.tsx");

    expect(result.matches.length).toBe(1);
    expect(result.matches[0]!.storyId).toBe("components-button--primary");
    expect(result.matches[0]!.matchType).toBe("basename");
  });

  it("matches exact import path with ./ prefix", async () => {
    const svc = new SourceLookupService(repo());
    const result = await svc.findStoriesBySourceFile("src/components/Button.stories.tsx");

    expect(result.matches[0]!.matchType).toBe("exact");
  });

  it("returns empty when no candidate matches", async () => {
    const svc = new SourceLookupService(repo());
    const result = await svc.findStoriesBySourceFile("path/to/UnknownFile.tsx");

    expect(result.matches.length).toBe(0);
  });
});
