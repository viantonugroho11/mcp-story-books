export interface RawDependency {
  name: string;
  type: "import" | "composition" | "prop";
}

/**
 * Extract component dependencies from a CSF chunk source string.
 * Detects:
 *  - Named imports from local paths (import { Button } from "./Button")
 *  - JSX-like references (createElement(Button, ...)) or (jsx(Button, ...))
 *  - Component references in argTypes (control-of type "component")
 */
export function extractDependenciesFromChunk(
  source: string,
  knownComponents: Set<string>,
): RawDependency[] {
  const found = new Map<string, RawDependency>();

  const importPattern =
    /import\s*(?:\{([^}]+)\}|(\*\s+as\s+\w+)|([A-Z]\w+))(?:\s*,\s*\{([^}]+)\})?\s*from\s*["']([^"']+)["']/g;
  for (const match of source.matchAll(importPattern)) {
    const namedGroup = match[1] ?? match[4] ?? "";
    const defaultName = match[3];
    const importPath = match[5] ?? "";

    if (defaultName && isLikelyComponentName(defaultName) && looksLocal(importPath)) {
      const normalized = normalizeName(defaultName);
      if (knownComponents.has(normalized) || knownComponents.size === 0) {
        addDep(found, defaultName, "import");
      }
    }

    for (const raw of namedGroup.split(",")) {
      const clean = raw.split(" as ")[0]?.trim();
      if (clean && isLikelyComponentName(clean) && looksLocal(importPath)) {
        const normalized = normalizeName(clean);
        if (knownComponents.has(normalized) || knownComponents.size === 0) {
          addDep(found, clean, "import");
        }
      }
    }
  }

  const jsxPattern = /(?:jsx|jsxs|createElement|_jsx|_jsxs|h)\s*\(\s*([A-Z][A-Za-z0-9_]+)/g;
  for (const match of source.matchAll(jsxPattern)) {
    const name = match[1];
    if (name && isLikelyComponentName(name)) {
      addDep(found, name, "composition");
    }
  }

  return [...found.values()];
}

function addDep(map: Map<string, RawDependency>, name: string, type: RawDependency["type"]): void {
  const existing = map.get(name);
  if (!existing) {
    map.set(name, { name, type });
    return;
  }
  if (existing.type === "import" && type === "composition") {
    existing.type = "composition";
  }
}

function isLikelyComponentName(name: string): boolean {
  return /^[A-Z][A-Za-z0-9]+$/.test(name) && name.length > 1;
}

function looksLocal(importPath: string): boolean {
  return (
    importPath.startsWith(".") ||
    importPath.startsWith("/") ||
    importPath.startsWith("@/") ||
    !importPath.includes("node_modules")
  );
}

function normalizeName(name: string): string {
  return name.toLowerCase();
}
