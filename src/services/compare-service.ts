import { createAuthProvider } from "../auth/auth-provider.js";
import { createStoryBookClient } from "../api/storybook-client.js";
import { MemoryCache } from "../cache/memory-cache.js";
import { createStoryRepository } from "../repository/create-story-repository.js";
import { StorybookChunkResolver } from "../storybook/chunk-resolver.js";
import { ComponentService } from "./component-service.js";
import type { AppConfig } from "../config/config.js";
import type { StoryRepository } from "../repository/story-repository.js";

export interface ComponentChange {
  component: string;
  type: "added" | "removed" | "modified";
  details?: {
    variantsAdded?: string[];
    variantsRemoved?: string[];
    propsAdded?: string[];
    propsRemoved?: string[];
    propsChanged?: Array<{ name: string; before: string; after: string }>;
  };
}

export interface CompareResult {
  base: string;
  target: string;
  summary: { added: number; removed: number; modified: number };
  changes: ComponentChange[];
}

interface ComponentSnapshot {
  path: string;
  name: string;
  variants: string[];
  argTypes: Record<string, { control?: string; options?: string[]; typeSummary?: string }>;
}

export class CompareService {
  constructor(
    private readonly currentConfig: AppConfig,
    private readonly currentRepository: StoryRepository,
    private readonly currentComponentService: ComponentService,
  ) {}

  async compareVersions(input: {
    baseUrl: string;
    targetUrl?: string;
    components?: string[];
  }): Promise<CompareResult> {
    const baseSnapshots = await this.buildRemoteSnapshots(input.baseUrl);
    const targetSnapshots = input.targetUrl
      ? await this.buildRemoteSnapshots(input.targetUrl)
      : await this.buildLocalSnapshots();

    const targetUrlLabel = input.targetUrl ?? this.currentConfig.baseUrl;
    const componentFilter = input.components?.map((c) => c.toLowerCase());

    const baseMap = new Map(baseSnapshots.map((s) => [s.path, s]));
    const targetMap = new Map(targetSnapshots.map((s) => [s.path, s]));

    const allPaths = new Set([...baseMap.keys(), ...targetMap.keys()]);
    const changes: ComponentChange[] = [];

    for (const path of allPaths) {
      if (componentFilter && !componentFilter.includes(path.toLowerCase())) {
        const name = path.split("/").pop() ?? path;
        if (!componentFilter.includes(name.toLowerCase())) continue;
      }

      const base = baseMap.get(path);
      const target = targetMap.get(path);

      if (!base && target) {
        changes.push({ component: path, type: "added" });
        continue;
      }
      if (base && !target) {
        changes.push({ component: path, type: "removed" });
        continue;
      }
      if (!base || !target) continue;

      const diff = diffSnapshots(base, target);
      if (diff) {
        changes.push({ component: path, type: "modified", details: diff });
      }
    }

    const summary = {
      added: changes.filter((c) => c.type === "added").length,
      removed: changes.filter((c) => c.type === "removed").length,
      modified: changes.filter((c) => c.type === "modified").length,
    };

    return { base: input.baseUrl, target: targetUrlLabel, summary, changes };
  }

  private async buildLocalSnapshots(): Promise<ComponentSnapshot[]> {
    const components = await this.currentComponentService.listComponents({ limit: 500 });
    const snapshots: ComponentSnapshot[] = [];

    for (const c of components) {
      const argTypes = await this.tryGetArgTypes(this.currentComponentService, c.path);
      snapshots.push({
        path: c.path,
        name: c.name,
        variants: c.variantNames,
        argTypes,
      });
    }

    return snapshots;
  }

  private async buildRemoteSnapshots(baseUrl: string): Promise<ComponentSnapshot[]> {
    const config: AppConfig = { ...this.currentConfig, baseUrl };
    const auth = createAuthProvider(config);
    const client = createStoryBookClient(config, auth);
    const cache = new MemoryCache();
    const repository = await createStoryRepository(config, client, cache);
    const chunkResolver = new StorybookChunkResolver(
      client,
      cache,
      config.cacheTtlSeconds,
      config.cacheEnabled,
    );
    const componentService = new ComponentService(repository, chunkResolver);

    const components = await componentService.listComponents({ limit: 500 });
    const snapshots: ComponentSnapshot[] = [];

    for (const c of components) {
      const argTypes = await this.tryGetArgTypes(componentService, c.path);
      snapshots.push({
        path: c.path,
        name: c.name,
        variants: c.variantNames,
        argTypes,
      });
    }

    return snapshots;
  }

  private async tryGetArgTypes(
    componentService: ComponentService,
    path: string,
  ): Promise<ComponentSnapshot["argTypes"]> {
    try {
      const config = await componentService.getComponentConfig(path);
      const map: ComponentSnapshot["argTypes"] = {};
      for (const arg of config.argTypes) {
        map[arg.name] = {
          control: arg.control,
          options: arg.options,
          typeSummary: arg.typeSummary,
        };
      }
      return map;
    } catch {
      return {};
    }
  }
}

function diffSnapshots(
  base: ComponentSnapshot,
  target: ComponentSnapshot,
): ComponentChange["details"] | undefined {
  const baseVariants = new Set(base.variants);
  const targetVariants = new Set(target.variants);

  const variantsAdded = [...targetVariants].filter((v) => !baseVariants.has(v));
  const variantsRemoved = [...baseVariants].filter((v) => !targetVariants.has(v));

  const baseProps = new Set(Object.keys(base.argTypes));
  const targetProps = new Set(Object.keys(target.argTypes));

  const propsAdded = [...targetProps].filter((p) => !baseProps.has(p));
  const propsRemoved = [...baseProps].filter((p) => !targetProps.has(p));
  const propsChanged: NonNullable<ComponentChange["details"]>["propsChanged"] = [];

  for (const prop of baseProps) {
    if (!targetProps.has(prop)) continue;
    const b = base.argTypes[prop]!;
    const t = target.argTypes[prop]!;
    const beforeStr = stringifyProp(b);
    const afterStr = stringifyProp(t);
    if (beforeStr !== afterStr) {
      propsChanged.push({ name: prop, before: beforeStr, after: afterStr });
    }
  }

  if (
    variantsAdded.length === 0 &&
    variantsRemoved.length === 0 &&
    propsAdded.length === 0 &&
    propsRemoved.length === 0 &&
    propsChanged.length === 0
  ) {
    return undefined;
  }

  return {
    variantsAdded: variantsAdded.length > 0 ? variantsAdded : undefined,
    variantsRemoved: variantsRemoved.length > 0 ? variantsRemoved : undefined,
    propsAdded: propsAdded.length > 0 ? propsAdded : undefined,
    propsRemoved: propsRemoved.length > 0 ? propsRemoved : undefined,
    propsChanged: propsChanged.length > 0 ? propsChanged : undefined,
  };
}

function stringifyProp(p: { control?: string; options?: string[]; typeSummary?: string }): string {
  return JSON.stringify({
    control: p.control ?? null,
    options: p.options ? [...p.options].sort() : null,
    typeSummary: p.typeSummary ?? null,
  });
}
