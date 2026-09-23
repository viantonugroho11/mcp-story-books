export interface ArgTypeConfig {
  name: string;
  control?: string;
  options?: string[];
  description?: string;
  typeSummary?: string;
  defaultSummary?: string;
}

export interface StoryPreset {
  exportKey?: string;
  args: Record<string, unknown>;
}

export interface ComponentStoryConfig {
  title?: string;
  description?: string;
  argTypes: ArgTypeConfig[];
  /** Named Storybook stories (visual presets) */
  presets: Array<{ label: string; args: Record<string, unknown> }>;
}

function extractQuotedOptions(source: string, key: string): string[] | undefined {
  const pattern = new RegExp(`${key}:\\{[^}]*options:\\[([^\\]]+)\\]`);
  const match = source.match(pattern);
  if (!match?.[1]) {
    return undefined;
  }
  const options: string[] = [];
  for (const opt of match[1].matchAll(/"([^"]+)"/g)) {
    if (opt[1]) {
      options.push(opt[1]);
    }
  }
  return options.length > 0 ? options : undefined;
}

function extractArgTypes(source: string): ArgTypeConfig[] {
  const argTypes: ArgTypeConfig[] = [];
  const blockMatch = source.match(/argTypes:\{([\s\S]*?)\}\},[\w$]+=\{args:/);
  const block = blockMatch?.[1] ?? source.match(/argTypes:\{([\s\S]*?)\}\}/)?.[1];
  if (!block) {
    return argTypes;
  }

  const entries = block.split(/,(?=[a-zA-Z_$][\w$]*:\{)/);
  for (const entry of entries) {
    const nameMatch = entry.match(/^([a-zA-Z_$][\w$]*):\{/);
    if (!nameMatch?.[1]) {
      continue;
    }
    const name = nameMatch[1];
    if (name === "table" || name === "mapping") {
      continue;
    }
    const control = entry.match(/control:"([^"]+)"/)?.[1];
    const description = entry.match(/description:"([^"]+)"/)?.[1];
    const typeSummary = entry.match(/type:\{summary:"([^"]+)"/)?.[1];
    const defaultSummary = entry.match(/defaultValue:\{summary:"([^"]+)"/)?.[1];
    const options = [...entry.matchAll(/options:\[(.*?)\]/g)]
      .flatMap((m) => [...(m[1]?.matchAll(/"([^"]+)"/g) ?? [])].map((x) => x[1]))
      .filter((v): v is string => Boolean(v));

    argTypes.push({
      name,
      control,
      options: options.length > 0 ? [...new Set(options)] : undefined,
      description,
      typeSummary,
      defaultSummary,
    });
  }

  return argTypes;
}

function extractStoryPresets(source: string): StoryPreset[] {
  const presets: StoryPreset[] = [];
  const presetPattern = /[\w$]=\{args:\{([\s\S]*?)\}\}/g;
  for (const match of source.matchAll(presetPattern)) {
    const argsBlock = match[1];
    if (!argsBlock) {
      continue;
    }
    const args: Record<string, unknown> = {};
    for (const stringVal of argsBlock.matchAll(/([a-zA-Z_$][\w$]*):\s*"([^"]*)"/g)) {
      if (stringVal[1]) {
        args[stringVal[1]] = stringVal[2];
      }
    }
    for (const boolVal of argsBlock.matchAll(/([a-zA-Z_$][\w$]*):\s*(true|false)/g)) {
      if (boolVal[1] && !(boolVal[1] in args)) {
        args[boolVal[1]] = boolVal[2] === "true";
      }
    }
    for (const numVal of argsBlock.matchAll(/([a-zA-Z_$][\w$]*):\s*(\d+)/g)) {
      if (numVal[1] && !(numVal[1] in args)) {
        args[numVal[1]] = Number(numVal[2]);
      }
    }
    if (Object.keys(args).length > 0) {
      presets.push({ args });
    }
  }
  return presets;
}

export function extractComponentConfigFromChunk(
  source: string,
  variantLabels: string[],
): ComponentStoryConfig {
  const title = source.match(/title:"([^"]+)"/)?.[1];
  const description = source.match(/description:\{component:"([^"]+)"/)?.[1];

  const argTypes = extractArgTypes(source);
  const rawPresets = extractStoryPresets(source);

  const storyVariants = variantLabels.filter((v) => v !== "Overview");
  const presets = storyVariants.map((label, index) => ({
    label,
    args: rawPresets[index]?.args ?? {},
  }));

  const variantArg = argTypes.find((a) => a.name === "variant");
  if (variantArg?.options && presets.every((p) => !p.args.variant)) {
    for (const preset of presets) {
      const variantFromLabel = preset.label.toLowerCase().replace(/\s+/g, "-");
      const matched = variantArg.options.find(
        (o) => o === variantFromLabel || o.replace(/-/g, " ") === preset.label.toLowerCase(),
      );
      if (matched) {
        preset.args.variant = matched;
      }
    }
  }

  return {
    title,
    description,
    argTypes,
    presets,
  };
}
