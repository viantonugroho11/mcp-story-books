import type { StoryRepository } from "../repository/story-repository.js";
import type { StorybookChunkResolver } from "../storybook/chunk-resolver.js";
import { extractDependenciesFromChunk } from "../storybook/dependency-extractor.js";
import { StoryBookError } from "../domain/errors.js";

export interface DependencyEdge {
  name: string;
  type: "import" | "composition" | "prop";
}

export interface DependencyResult {
  component: string;
  dependencies: DependencyEdge[];
  dependents: DependencyEdge[];
  graph: Record<string, string[]>;
}

interface ComponentIndexEntry {
  path: string;
  name: string;
  importPath: string;
}

export class DependencyService {
  private graphCache: {
    forward: Map<string, DependencyEdge[]>;
    reverse: Map<string, DependencyEdge[]>;
    componentIndex: Map<string, ComponentIndexEntry>;
  } | null = null;

  constructor(
    private readonly repository: StoryRepository,
    private readonly chunkResolver: StorybookChunkResolver,
  ) {}

  async getDependencies(
    componentName: string,
    options: { direction?: "dependencies" | "dependents" | "both"; depth?: number } = {},
  ): Promise<DependencyResult> {
    const direction = options.direction ?? "both";
    const depth = Math.min(Math.max(options.depth ?? 1, 1), 5);

    const graph = await this.buildGraph();
    const normalized = componentName.toLowerCase();

    if (!graph.componentIndex.has(normalized)) {
      throw new StoryBookError("NOT_FOUND", `Component not found in graph: ${componentName}`);
    }

    const canonical = graph.componentIndex.get(normalized)!.name;

    const dependencies =
      direction === "dependents" ? [] : this.traverse(graph.forward, canonical, depth);
    const dependents =
      direction === "dependencies" ? [] : this.traverse(graph.reverse, canonical, depth);

    const adjacency: Record<string, string[]> = {};
    for (const [node, edges] of graph.forward.entries()) {
      adjacency[node] = edges.map((e) => e.name);
    }

    return {
      component: canonical,
      dependencies,
      dependents,
      graph: adjacency,
    };
  }

  private traverse(
    graph: Map<string, DependencyEdge[]>,
    start: string,
    depth: number,
  ): DependencyEdge[] {
    const visited = new Set<string>();
    const result: DependencyEdge[] = [];
    const queue: Array<{ node: string; d: number; type: DependencyEdge["type"] }> = [
      { node: start, d: 0, type: "import" },
    ];

    while (queue.length > 0) {
      const { node, d } = queue.shift()!;
      if (d >= depth) continue;

      const edges = graph.get(node) ?? [];
      for (const edge of edges) {
        if (visited.has(edge.name)) continue;
        visited.add(edge.name);
        result.push(edge);
        queue.push({ node: edge.name, d: d + 1, type: edge.type });
      }
    }

    return result;
  }

  private async buildGraph(): Promise<NonNullable<DependencyService["graphCache"]>> {
    if (this.graphCache) return this.graphCache;

    const entries = await this.repository.listStories({ limit: 1000 });
    const componentIndex = new Map<string, ComponentIndexEntry>();
    const canonicalByImport = new Map<string, string>();

    for (const entry of entries) {
      const importPath = entry.metadata.importPath;
      if (typeof importPath !== "string") continue;

      const path = entry.title.split(" / ")[0] ?? entry.title;
      const name = path.split("/").pop() ?? path;
      const key = name.toLowerCase();

      if (!componentIndex.has(key)) {
        componentIndex.set(key, { path, name, importPath });
        canonicalByImport.set(importPath, name);
      }
    }

    const knownNames = new Set([...componentIndex.keys()]);
    const forward = new Map<string, DependencyEdge[]>();
    const reverse = new Map<string, DependencyEdge[]>();

    for (const [key, entry] of componentIndex.entries()) {
      try {
        const source = await this.chunkResolver.fetchEntrySource(entry.importPath);
        if (!source) continue;

        const rawDeps = extractDependenciesFromChunk(source, knownNames);
        const edges: DependencyEdge[] = [];

        for (const raw of rawDeps) {
          const depKey = raw.name.toLowerCase();
          if (depKey === key) continue;
          if (!componentIndex.has(depKey)) continue;

          const canonicalName = componentIndex.get(depKey)!.name;
          edges.push({ name: canonicalName, type: raw.type });

          if (!reverse.has(canonicalName)) reverse.set(canonicalName, []);
          reverse.get(canonicalName)!.push({ name: entry.name, type: raw.type });
        }

        if (edges.length > 0) {
          forward.set(entry.name, edges);
        }
      } catch {
        // skip components whose source cannot be loaded
      }
    }

    this.graphCache = { forward, reverse, componentIndex };
    return this.graphCache;
  }
}
