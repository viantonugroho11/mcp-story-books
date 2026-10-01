import type { ComponentService } from "./component-service.js";
import type { StoryRepository } from "../repository/story-repository.js";
import type { StorybookChunkResolver } from "../storybook/chunk-resolver.js";
import type { MemoryService } from "./memory-service.js";
import type { ComponentSummary } from "../domain/component.js";
import { inferPropsFromSource, type InferredProp } from "../storybook/jsx-analyzer.js";

export interface ScaffoldResult {
  filename: string;
  content: string;
  inferredArgTypes: Record<string, Record<string, unknown>>;
  conventions: {
    titlePrefix: string;
    usesAutodocs: boolean;
    decorators: string[];
    referenceStory?: string;
  };
  warnings: string[];
  remembered: boolean;
}

function argTypeFor(prop: InferredProp): Record<string, unknown> | undefined {
  switch (prop.kind) {
    case "enum":
      return { control: "select", options: prop.options };
    case "boolean":
      return { control: "boolean" };
    case "string":
      return { control: "text" };
    case "number":
      return { control: "number" };
    case "function":
      return { action: prop.name };
    default:
      return undefined;
  }
}

function sampleValue(prop: InferredProp, componentName: string): unknown {
  switch (prop.kind) {
    case "enum":
      return prop.options?.[0];
    case "boolean":
      return false;
    case "string":
      return prop.name === "children" || prop.name === "label" ? componentName : "";
    case "number":
      return 0;
    case "node":
      return componentName;
    default:
      return undefined;
  }
}

function mostCommon<T>(values: T[]): T | undefined {
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

function storyName(option: string): string {
  return option
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join("");
}

function extractDecorators(chunk: string): string[] {
  const match = /decorators\s*:\s*\[([^\]]*)\]/.exec(chunk);
  if (!match) return [];
  return match[1]!
    .split(",")
    .map((d) => d.trim())
    .filter((d) => /^[A-Za-z_$][\w$]*$/.test(d));
}

/**
 * Generates a CSF3 story for a new component that mirrors house conventions (ADR-016).
 * Returns file content only; never writes to disk or Storybook.
 */
export class ScaffoldService {
  constructor(
    private readonly componentService: ComponentService,
    private readonly repository: StoryRepository,
    private readonly chunkResolver?: StorybookChunkResolver,
    private readonly memoryService?: MemoryService,
  ) {}

  async scaffoldStory(input: {
    componentName: string;
    componentSource: string;
    title?: string;
    referenceComponent?: string;
    importPath?: string;
    description?: string;
  }): Promise<ScaffoldResult> {
    const warnings: string[] = [];
    const name = input.componentName;
    const props = inferPropsFromSource(input.componentSource, name);
    if (props.length === 0) {
      warnings.push(`No ${name}Props interface or type found; argTypes left empty.`);
    }

    const components = await this.componentService.listComponents({ limit: 200 });
    const reference = this.pickReference(components, input.referenceComponent, warnings);

    const titlePrefix = input.title
      ? input.title.split("/").slice(0, -1).join("/")
      : reference
        ? reference.path.split("/").slice(0, -1).join("/")
        : (mostCommon(components.map((c) => c.path.split("/").slice(0, -1).join("/"))) ?? "Components");
    const title = input.title ?? `${titlePrefix}/${name}`;

    const usesAutodocs = reference
      ? reference.tags.includes("autodocs")
      : components.filter((c) => c.tags.includes("autodocs")).length > components.length / 2;

    const decorators = reference ? await this.referenceDecorators(reference) : [];
    if (decorators.length > 0) {
      warnings.push(`Decorators copied by name from ${reference!.name}; add their imports: ${decorators.join(", ")}.`);
    }

    const inferredArgTypes: Record<string, Record<string, unknown>> = {};
    for (const prop of props) {
      const argType = argTypeFor(prop);
      if (argType) inferredArgTypes[prop.name] = argType;
      else if (prop.kind === "other") warnings.push(`Prop \`${prop.name}\` has type \`${prop.type}\`; no control inferred.`);
    }

    const defaultArgs: Record<string, unknown> = {};
    for (const prop of props) {
      if (prop.optional && prop.kind !== "node") continue;
      if (prop.kind === "function") continue;
      const value = sampleValue(prop, name);
      if (value !== undefined) defaultArgs[prop.name] = value;
    }

    const variantProp = props.find((p) => p.kind === "enum" && (p.options?.length ?? 0) > 1);
    const content = this.render({
      name,
      title,
      usesAutodocs,
      decorators,
      argTypes: inferredArgTypes,
      defaultArgs,
      variantProp,
    });

    let remembered = false;
    if (this.memoryService) {
      await this.memoryService.remember({
        componentName: name,
        import: input.importPath
          ? `import { ${name} } from ${JSON.stringify(input.importPath)};`
          : `import { ${name} } from "./${name}";`,
        description: input.description ?? "",
        componentSource: input.componentSource,
        origin: "scaffold_story",
      });
      remembered = true;
    }

    return {
      filename: `${name}.stories.tsx`,
      content,
      inferredArgTypes,
      conventions: {
        titlePrefix,
        usesAutodocs,
        decorators,
        ...(reference?.overviewStoryId ? { referenceStory: reference.overviewStoryId } : {}),
      },
      warnings,
      remembered,
    };
  }

  private pickReference(
    components: ComponentSummary[],
    requested: string | undefined,
    warnings: string[],
  ): ComponentSummary | undefined {
    if (!requested) return undefined;
    const lower = requested.toLowerCase();
    const found = components.find((c) => c.name.toLowerCase() === lower || c.path.toLowerCase() === lower);
    if (!found) warnings.push(`Reference component ${requested} not found; using index-wide conventions.`);
    return found;
  }

  private async referenceDecorators(reference: ComponentSummary): Promise<string[]> {
    if (!this.chunkResolver) return [];
    try {
      const entries = await this.repository.listStories({ limit: 500 });
      const entry = entries.find((e) => e.title.split(" / ")[0] === reference.path && e.metadata.importPath);
      const importPath = entry?.metadata.importPath;
      if (typeof importPath !== "string") return [];
      const chunk = await this.chunkResolver.fetchEntrySource(importPath);
      return chunk ? extractDecorators(chunk) : [];
    } catch {
      return [];
    }
  }

  private render(options: {
    name: string;
    title: string;
    usesAutodocs: boolean;
    decorators: string[];
    argTypes: Record<string, Record<string, unknown>>;
    defaultArgs: Record<string, unknown>;
    variantProp?: InferredProp;
  }): string {
    const { name } = options;
    const metaLines = [
      `  title: ${JSON.stringify(options.title)},`,
      `  component: ${name},`,
    ];
    if (options.usesAutodocs) metaLines.push(`  tags: ["autodocs"],`);
    if (options.decorators.length > 0) metaLines.push(`  decorators: [${options.decorators.join(", ")}],`);
    if (Object.keys(options.argTypes).length > 0) {
      metaLines.push(`  argTypes: ${indent(JSON.stringify(options.argTypes, null, 2))},`);
    }
    if (Object.keys(options.defaultArgs).length > 0) {
      metaLines.push(`  args: ${indent(JSON.stringify(options.defaultArgs, null, 2))},`);
    }

    const stories = [`export const Default: Story = {};`];
    for (const option of options.variantProp?.options?.slice(1) ?? []) {
      stories.push(
        `export const ${storyName(option)}: Story = {\n  args: { ${options.variantProp!.name}: ${JSON.stringify(option)} },\n};`,
      );
    }

    return [
      `import type { Meta, StoryObj } from "@storybook/react";`,
      `import { ${name} } from "./${name}";`,
      ``,
      `const meta = {`,
      ...metaLines,
      `} satisfies Meta<typeof ${name}>;`,
      ``,
      `export default meta;`,
      `type Story = StoryObj<typeof meta>;`,
      ``,
      stories.join("\n\n"),
      ``,
    ].join("\n");
  }
}

function indent(json: string): string {
  return json.replace(/\n/g, "\n  ");
}
