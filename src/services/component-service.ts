import type { StoryRepository } from "../repository/story-repository.js";
import type { ComponentConfig, ComponentDetail, ComponentSummary } from "../domain/component.js";
import { StoryBookError } from "../domain/errors.js";
import { truncateContent } from "../repository/story-mapper.js";
import type { StorybookChunkResolver } from "../storybook/chunk-resolver.js";
import { extractComponentConfigFromChunk } from "../storybook/csf-config-extractor.js";

const DEFAULT_COMPONENT_ROOT = "Components";

function parseStorybookPath(fullTitle: string): { path: string; variantName: string } {
  const parts = fullTitle.split(" / ");
  const path = parts[0] ?? fullTitle;
  const variantName = parts.slice(1).join(" / ") || "Overview";
  return { path, variantName };
}

function normalizeComponentPath(input: string): string {
  const trimmed = input.trim().replace(/^\/+/, "");
  if (trimmed.includes("/")) {
    return trimmed.startsWith(`${DEFAULT_COMPONENT_ROOT}/`)
      ? trimmed
      : `${DEFAULT_COMPONENT_ROOT}/${trimmed}`;
  }
  return `${DEFAULT_COMPONENT_ROOT}/${trimmed}`;
}

export class ComponentService {
  constructor(
    private readonly repository: StoryRepository,
    private readonly chunkResolver?: StorybookChunkResolver,
  ) {}

  async listComponents(options: {
    category?: string;
    query?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<ComponentSummary[]> {
    const root = options.category ?? DEFAULT_COMPONENT_ROOT;
    const entries = await this.repository.listStories({
      category: root.split("/")[0],
      limit: 500,
      offset: 0,
    });

    const byPath = new Map<string, ComponentSummary>();

    for (const entry of entries) {
      const { path, variantName } = parseStorybookPath(entry.title);
      if (!path.startsWith(`${root}`) && root === DEFAULT_COMPONENT_ROOT) {
        if (!path.startsWith("Components/")) {
          continue;
        }
      } else if (!path.startsWith(root)) {
        continue;
      }

      if (options.query) {
        const q = options.query.toLowerCase();
        if (!path.toLowerCase().includes(q) && !variantName.toLowerCase().includes(q)) {
          continue;
        }
      }

      const name = path.split("/").pop() ?? path;
      const storybookType = entry.metadata.storybookType as "docs" | "story" | undefined;
      const existing =
        byPath.get(path) ??
        ({
          path,
          name,
          category: path.split("/")[0] ?? "Components",
          variantCount: 0,
          variantNames: [],
          tags: [],
        } satisfies ComponentSummary);

      existing.variantCount += 1;
      existing.variantNames.push(variantName);
      existing.tags = [...new Set([...existing.tags, ...entry.tags])];

      if (storybookType === "docs" || variantName === "Overview") {
        existing.overviewStoryId = entry.id;
      }

      byPath.set(path, existing);
    }

    const sorted = [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path));
    const offset = options.offset ?? 0;
    const limit = options.limit ?? 100;
    return sorted.slice(offset, offset + limit);
  }

  async getComponent(
    component: string,
    options: { includeOverviewContent?: boolean; maxContentLength?: number } = {},
  ): Promise<ComponentDetail> {
    const path = normalizeComponentPath(component);
    const entries = await this.repository.listStories({ limit: 500 });
    const matched = entries.filter((e) => parseStorybookPath(e.title).path === path);

    if (matched.length === 0) {
      throw new StoryBookError("NOT_FOUND", `Component not found: ${component}`);
    }

    const name = path.split("/").pop() ?? path;
    const variants = matched.map((entry) => {
      const { variantName } = parseStorybookPath(entry.title);
      const type = (entry.metadata.storybookType as "docs" | "story" | undefined) ?? "story";
      return {
        storyId: entry.id,
        name: variantName,
        type,
      };
    });

    const overviewEntry =
      matched.find((e) => e.metadata.storybookType === "docs") ??
      matched.find((e) => parseStorybookPath(e.title).variantName === "Overview");

    let overview: ComponentDetail["overview"];
    if (overviewEntry && options.includeOverviewContent !== false) {
      const story = await this.repository.getStory(overviewEntry.id);
      overview = {
        storyId: overviewEntry.id,
        content: truncateContent(story.content ?? "", options.maxContentLength ?? 12_000),
        sections: story.sections.map((s) => ({ id: s.id, title: s.title })),
      };
    } else if (overviewEntry) {
      overview = {
        storyId: overviewEntry.id,
        sections: [],
      };
    }

    return {
      path,
      name,
      category: path.split("/")[0] ?? "Components",
      overview,
      variants,
      tags: [...new Set(matched.flatMap((m) => m.tags))],
    };
  }

  async getComponentConfig(component: string): Promise<ComponentConfig> {
    if (!this.chunkResolver) {
      throw new StoryBookError(
        "CONFIGURATION_ERROR",
        "Component config requires Storybook static mode (chunk resolver unavailable)",
      );
    }

    const path = normalizeComponentPath(component);
    const entries = await this.repository.listStories({ limit: 500 });
    const matched = entries.filter((e) => parseStorybookPath(e.title).path === path);

    if (matched.length === 0) {
      throw new StoryBookError("NOT_FOUND", `Component not found: ${component}`);
    }

    const importPath = matched.find((m) => m.metadata.importPath)?.metadata.importPath;
    if (typeof importPath !== "string") {
      throw new StoryBookError("INVALID_RESPONSE", `Missing importPath for component: ${path}`);
    }

    const chunk = await this.chunkResolver.fetchEntrySource(importPath);
    if (!chunk) {
      throw new StoryBookError("NOT_FOUND", `Unable to load stories source for ${path}`);
    }

    const variantLabels = matched
      .filter((m) => m.metadata.storybookType === "story")
      .map((m) => parseStorybookPath(m.title).variantName);

    const parsed = extractComponentConfigFromChunk(chunk, variantLabels);
    const storyIdByLabel = new Map(
      matched
        .filter((m) => m.metadata.storybookType === "story")
        .map((m) => [parseStorybookPath(m.title).variantName, m.id]),
    );

    return {
      path,
      name: path.split("/").pop() ?? path,
      title: parsed.title,
      description: parsed.description,
      argTypes: parsed.argTypes,
      stylePresets: parsed.presets.map((preset) => ({
        label: preset.label,
        storyId: storyIdByLabel.get(preset.label),
        args: preset.args,
      })),
    };
  }
}
