import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { inferPropsFromSource, type InferredProp } from "../storybook/jsx-analyzer.js";

export interface PendingComponent {
  name: string;
  import: string;
  description: string;
  props: InferredProp[];
  sourcePath?: string;
  origin: "remember_component" | "scaffold_story";
  createdAt: string;
  stale?: boolean;
}

interface MemoryFile {
  version: 1;
  components: PendingComponent[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * File-backed overlay of components that exist in code but not yet in the deployed
 * Storybook (ADR-017). Never writes to Storybook itself.
 */
export class MemoryService {
  constructor(
    private readonly filePath: string,
    private readonly staleAfterDays = 30,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async remember(input: {
    componentName: string;
    import: string;
    description: string;
    componentSource?: string;
    sourcePath?: string;
    origin?: PendingComponent["origin"];
  }): Promise<PendingComponent> {
    const data = await this.load();
    const entry: PendingComponent = {
      name: input.componentName,
      import: input.import,
      description: input.description,
      props: input.componentSource ? inferPropsFromSource(input.componentSource, input.componentName) : [],
      sourcePath: input.sourcePath,
      origin: input.origin ?? "remember_component",
      createdAt: this.now().toISOString(),
    };
    data.components = [...data.components.filter((c) => c.name !== entry.name), entry];
    await this.save(data);
    return entry;
  }

  async forget(componentName: string): Promise<boolean> {
    const data = await this.load();
    const before = data.components.length;
    data.components = data.components.filter((c) => c.name !== componentName);
    if (data.components.length === before) return false;
    await this.save(data);
    return true;
  }

  /**
   * Lists pending components. Entries whose name now exists in the deployed Storybook
   * are dropped; entries older than the stale threshold are flagged, not deleted.
   */
  async list(deployedNames: Iterable<string> = []): Promise<PendingComponent[]> {
    const data = await this.load();
    const deployed = new Set(deployedNames);
    const kept = data.components.filter((c) => !deployed.has(c.name));
    if (kept.length !== data.components.length) {
      await this.save({ ...data, components: kept });
    }
    const threshold = this.now().getTime() - this.staleAfterDays * DAY_MS;
    return kept.map((c) => ({ ...c, stale: new Date(c.createdAt).getTime() < threshold }));
  }

  private async load(): Promise<MemoryFile> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<MemoryFile>;
      return { version: 1, components: Array.isArray(parsed.components) ? parsed.components : [] };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return { version: 1, components: [] };
      throw error;
    }
  }

  private async save(data: MemoryFile): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  }
}
