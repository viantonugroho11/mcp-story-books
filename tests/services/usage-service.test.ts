import { describe, it, expect } from "vitest";
import { UsageService } from "../../src/services/usage-service.js";
import type { ComponentService } from "../../src/services/component-service.js";
import type { StoryRepository } from "../../src/repository/story-repository.js";
import type { Story } from "../../src/domain/story.js";

const fakeConfig = {
  path: "Components/Button",
  name: "Button",
  title: "Components/Button",
  description: undefined,
  argTypes: [],
  stylePresets: [
    { label: "Primary", storyId: "components-button--primary", args: { variant: "primary", size: "md", children: "Click" } },
    { label: "Danger", storyId: "components-button--danger", args: { variant: "danger", disabled: true } },
  ],
};

function fakeComponentService(): ComponentService {
  return {
    async getComponentConfig() {
      return fakeConfig;
    },
  } as unknown as ComponentService;
}

const entries: Story[] = [
  {
    id: "components-button--primary",
    title: "Components/Button / Primary",
    tags: [],
    sections: [],
    metadata: { importPath: "./src/components/Button.stories.tsx" },
  },
];

function fakeRepo(): StoryRepository {
  return {
    async listStories() {
      return entries;
    },
  } as unknown as StoryRepository;
}

describe("UsageService", () => {
  it("renders JSX with string, boolean, and children props", async () => {
    const svc = new UsageService(fakeComponentService(), fakeRepo());
    const result = await svc.getComponentUsage({ componentName: "Button" });

    expect(result.component).toBe("Button");
    expect(result.primary.code).toBe(
      `<Button variant="primary" size="md">Click</Button>`,
    );
  });

  it("selects the requested variant when provided", async () => {
    const svc = new UsageService(fakeComponentService(), fakeRepo());
    const result = await svc.getComponentUsage({ componentName: "Button", variant: "Danger" });

    expect(result.primary.name).toBe("Danger");
    expect(result.primary.code).toContain(`variant="danger"`);
    expect(result.primary.code).toContain("disabled");
  });

  it("builds fullExample combining import and JSX", async () => {
    const svc = new UsageService(fakeComponentService(), fakeRepo());
    const result = await svc.getComponentUsage({ componentName: "Button" });

    expect(result.fullExample).toContain("import { Button } from");
    expect(result.fullExample).toContain("<Button");
  });
});
