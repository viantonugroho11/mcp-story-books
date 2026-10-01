import { describe, it, expect } from "vitest";
import { ScaffoldService } from "../../src/services/scaffold-service.js";
import type { ComponentService } from "../../src/services/component-service.js";
import type { StoryRepository } from "../../src/repository/story-repository.js";
import type { StorybookChunkResolver } from "../../src/storybook/chunk-resolver.js";
import type { MemoryService } from "../../src/services/memory-service.js";

const componentService = {
  async listComponents() {
    return [
      { path: "Forms/Input", name: "Input", category: "Forms", variantCount: 2, variantNames: [], tags: ["autodocs"], overviewStoryId: "forms-input--docs" },
      { path: "Forms/Select", name: "Select", category: "Forms", variantCount: 2, variantNames: [], tags: ["autodocs"] },
    ];
  },
} as unknown as ComponentService;

const repository = {
  async listStories() {
    return [{ id: "forms-input--docs", title: "Forms/Input / Docs", tags: [], sections: [], metadata: { importPath: "./Input.stories.tsx" } }];
  },
} as unknown as StoryRepository;

const chunkResolver = {
  async fetchEntrySource() {
    return `export default { title: "Forms/Input", decorators: [withTheme, withPadding] };`;
  },
} as unknown as StorybookChunkResolver;

const source = `
export interface DatePickerProps {
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  label: string;
  onChange?: (d: Date) => void;
  value?: Date;
}`;

describe("ScaffoldService", () => {
  it("generates a CSF3 story mirroring reference conventions and remembers it", async () => {
    const remembered: unknown[] = [];
    const memory = { async remember(e: unknown) { remembered.push(e); return e; } } as unknown as MemoryService;
    const svc = new ScaffoldService(componentService, repository, chunkResolver, memory);

    const result = await svc.scaffoldStory({
      componentName: "DatePicker",
      componentSource: source,
      referenceComponent: "Input",
      importPath: "@org/ui/date-picker",
    });

    expect(result.filename).toBe("DatePicker.stories.tsx");
    expect(result.conventions).toEqual({
      titlePrefix: "Forms",
      usesAutodocs: true,
      decorators: ["withTheme", "withPadding"],
      referenceStory: "forms-input--docs",
    });
    expect(result.inferredArgTypes).toEqual({
      size: { control: "select", options: ["sm", "md", "lg"] },
      disabled: { control: "boolean" },
      label: { control: "text" },
      onChange: { action: "onChange" },
    });
    expect(result.content).toContain(`title: "Forms/DatePicker"`);
    expect(result.content).toContain(`tags: ["autodocs"]`);
    expect(result.content).toContain(`decorators: [withTheme, withPadding]`);
    expect(result.content).toContain(`"label": "DatePicker"`);
    expect(result.content).toContain(`export const Md: Story`);
    expect(result.content).toContain(`export const Lg: Story`);
    expect(result.warnings.some((w) => w.includes("`value`"))).toBe(true);
    expect(result.remembered).toBe(true);
    expect(remembered[0]).toMatchObject({ componentName: "DatePicker", origin: "scaffold_story", import: `import { DatePicker } from "@org/ui/date-picker";` });
  });

  it("falls back to index-wide conventions and warns on missing props", async () => {
    const svc = new ScaffoldService(componentService, repository);
    const result = await svc.scaffoldStory({ componentName: "Spacer", componentSource: "export const Spacer = () => null;", referenceComponent: "Nope" });

    expect(result.conventions.titlePrefix).toBe("Forms");
    expect(result.conventions.decorators).toEqual([]);
    expect(result.remembered).toBe(false);
    expect(result.warnings).toEqual([
      "No SpacerProps interface or type found; argTypes left empty.",
      "Reference component Nope not found; using index-wide conventions.",
    ]);
  });
});
