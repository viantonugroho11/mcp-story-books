import type { ComponentService } from "./component-service.js";
import type { StoryRepository } from "../repository/story-repository.js";
import { StoryBookError } from "../domain/errors.js";

export interface UsageVariant {
  name: string;
  storyId?: string;
  code: string;
  args: Record<string, unknown>;
}

export interface UsageResult {
  component: string;
  importHint: string;
  primary: UsageVariant;
  fullExample: string;
  variants: UsageVariant[];
  format: "tsx" | "jsx";
}

export class UsageService {
  constructor(
    private readonly componentService: ComponentService,
    private readonly repository: StoryRepository,
  ) {}

  async getComponentUsage(input: {
    componentName: string;
    variant?: string;
    format?: "tsx" | "jsx";
  }): Promise<UsageResult> {
    const format = input.format ?? "tsx";
    const config = await this.componentService.getComponentConfig(input.componentName);
    const componentName = config.name;

    if (config.stylePresets.length === 0) {
      throw new StoryBookError(
        "NOT_FOUND",
        `No story variants found for component: ${input.componentName}`,
      );
    }

    const variants: UsageVariant[] = config.stylePresets.map((preset) => ({
      name: preset.label,
      storyId: preset.storyId,
      args: preset.args,
      code: renderJsx(componentName, preset.args),
    }));

    const selected = input.variant
      ? variants.find((v) => v.name.toLowerCase() === input.variant!.toLowerCase()) ?? variants[0]!
      : variants[0]!;

    const importPath = await this.inferImportPath(input.componentName, componentName);
    const importHint = `import { ${componentName} } from ${JSON.stringify(importPath)};`;
    const fullExample = `${importHint}\n\n${selected.code}`;

    return {
      component: componentName,
      importHint,
      primary: selected,
      fullExample,
      variants,
      format,
    };
  }

  private async inferImportPath(component: string, resolvedName: string): Promise<string> {
    const entries = await this.repository.listStories({ limit: 1000 });

    for (const entry of entries) {
      const path = entry.title.split(" / ")[0] ?? entry.title;
      const name = path.split("/").pop() ?? path;
      if (name !== resolvedName) continue;

      const importPath = entry.metadata.importPath;
      if (typeof importPath !== "string") continue;

      const stripped = importPath
        .replace(/^\.\//, "")
        .replace(/\.(stories|story)\.(tsx?|jsx?|mdx)$/, "")
        .replace(/\.(tsx?|jsx?|mdx)$/, "");

      const trimmed = stripped.startsWith("src/") ? stripped.slice(4) : stripped;
      return `@your-design-system/${trimmed}`;
    }

    return `@your-design-system/${resolvedName.toLowerCase()}`;
  }
}

function renderJsx(component: string, args: Record<string, unknown>): string {
  const { children, ...rest } = args as { children?: unknown } & Record<string, unknown>;
  const attrs = Object.entries(rest)
    .map(([key, value]) => renderAttribute(key, value))
    .filter((s): s is string => s !== undefined);

  const attrString = attrs.length > 0 ? " " + attrs.join(" ") : "";

  if (children === undefined || children === null || children === "") {
    return `<${component}${attrString} />`;
  }

  const childText = typeof children === "string" ? children : JSON.stringify(children);
  return `<${component}${attrString}>${childText}</${component}>`;
}

function renderAttribute(key: string, value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "boolean") return value ? key : `${key}={false}`;
  if (typeof value === "string") return `${key}=${JSON.stringify(value)}`;
  if (typeof value === "number") return `${key}={${value}}`;
  return `${key}={${JSON.stringify(value)}}`;
}
