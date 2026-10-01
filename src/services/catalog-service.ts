import type { ComponentService } from "./component-service.js";
import type { UsageService } from "./usage-service.js";
import type { MemoryService } from "./memory-service.js";

export interface CatalogProp {
  name: string;
  options?: string[];
  kind: "enum" | "boolean" | "other";
  required: boolean;
}

export interface CatalogEntry {
  name: string;
  path: string;
  import: string;
  description: string;
  props: CatalogProp[];
  /** False when Storybook exposes no argTypes; usage cannot be validated. */
  hasPropContract: boolean;
  source: "storybook" | "pending";
}

export interface CatalogSummaryItem {
  name: string;
  import: string;
  description: string;
  keyProps: string[];
  source?: "pending";
}

const DEFAULT_DESCRIPTION_LENGTH = 120;
const CONFIG_CONCURRENCY = 8;

function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

function formatKeyProp(prop: CatalogProp): string | undefined {
  const suffix = prop.required ? " (required)" : "";
  if (prop.kind === "enum" && prop.options?.length) return `${prop.name}: ${prop.options.join("|")}${suffix}`;
  if (prop.kind === "boolean") return `${prop.name}: boolean${suffix}`;
  if (prop.required) return `${prop.name}${suffix}`;
  return undefined;
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]!);
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * Builds a compact, token-cheap view of every component (ADR-014), merged with
 * locally remembered components that are not deployed yet (ADR-017).
 */
export class CatalogService {
  constructor(
    private readonly componentService: ComponentService,
    private readonly usageService: UsageService,
    private readonly memoryService?: MemoryService,
  ) {}

  async getEntries(options: { category?: string } = {}): Promise<CatalogEntry[]> {
    const components = await this.componentService.listComponents({
      category: options.category,
      limit: 200,
    });

    const deployed = await mapLimit(components, CONFIG_CONCURRENCY, async (component) => {
      const importHint = await this.usageService.inferImportPath(component.path, component.name);
      const entry: CatalogEntry = {
        name: component.name,
        path: component.path,
        import: `import { ${component.name} } from ${JSON.stringify(importHint)};`,
        description: "",
        props: [],
        hasPropContract: false,
        source: "storybook",
      };
      try {
        const config = await this.componentService.getComponentConfig(component.path);
        entry.description = config.description ?? "";
        entry.hasPropContract = config.argTypes.length > 0;
        entry.props = config.argTypes.map((arg) => ({
          name: arg.name,
          options: arg.options,
          kind: arg.options?.length ? "enum" : arg.control === "boolean" ? "boolean" : "other",
          required: false,
        }));
      } catch {
        // Config unavailable (non-static mode or missing chunk): keep the entry without props.
      }
      return entry;
    });

    if (!this.memoryService) return deployed;

    const pending = await this.memoryService.list(deployed.map((d) => d.name));
    const pendingEntries: CatalogEntry[] = pending.map((p) => ({
      name: p.name,
      path: p.name,
      import: p.import,
      description: p.description,
      props: p.props.map((prop) => ({
        name: prop.name,
        options: prop.options,
        kind: prop.kind === "enum" ? "enum" : prop.kind === "boolean" ? "boolean" : "other",
        required: !prop.optional,
      })),
      hasPropContract: p.props.length > 0,
      source: "pending",
    }));

    return [...deployed, ...pendingEntries];
  }

  async getCatalogSummary(options: {
    category?: string;
    maxDescriptionLength?: number;
  } = {}): Promise<{ components: CatalogSummaryItem[] }> {
    const max = options.maxDescriptionLength ?? DEFAULT_DESCRIPTION_LENGTH;
    const entries = await this.getEntries({ category: options.category });
    return {
      components: entries.map((entry) => ({
        name: entry.name,
        import: entry.import,
        description: truncate(entry.description, max),
        keyProps: entry.props.map(formatKeyProp).filter((p): p is string => p !== undefined),
        ...(entry.source === "pending" ? { source: "pending" as const } : {}),
      })),
    };
  }
}
