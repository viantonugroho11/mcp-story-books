import { analyzeJsx, type JsxElementUsage } from "../storybook/jsx-analyzer.js";
import type { CatalogEntry, CatalogService } from "./catalog-service.js";

export type UsageIssueKind =
  | "unknown_component"
  | "unknown_prop"
  | "invalid_value"
  | "missing_required_prop";

export interface UsageIssue {
  component: string;
  line?: number;
  kind: UsageIssueKind;
  message: string;
  suggestion?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: UsageIssue[];
  /** Components found in the code that have no argTypes, so props were not checked. */
  unvalidated: string[];
}

const PASSTHROUGH_PROPS = new Set([
  "children", "className", "style", "key", "ref", "id", "title", "role", "tabIndex",
  "hidden", "lang", "dir", "slot", "as", "asChild", "name", "type", "value", "defaultValue",
  "href", "target", "rel", "src", "alt", "htmlFor", "form", "autoFocus",
]);

function isPassthrough(prop: string): boolean {
  return (
    PASSTHROUGH_PROPS.has(prop) ||
    prop.startsWith("aria-") ||
    prop.startsWith("data-") ||
    /^on[A-Z]/.test(prop)
  );
}

export function editDistance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = prev[0]!;
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = prev[j]!;
      prev[j] = Math.min(
        prev[j]! + 1,
        prev[j - 1]! + 1,
        diagonal + (a[i - 1]!.toLowerCase() === b[j - 1]!.toLowerCase() ? 0 : 1),
      );
      diagonal = temp;
    }
  }
  return prev[b.length]!;
}

function closest(target: string, candidates: string[]): string | undefined {
  let best: { value: string; distance: number } | undefined;
  for (const candidate of candidates) {
    const distance = editDistance(target, candidate);
    if (!best || distance < best.distance) best = { value: candidate, distance };
  }
  if (!best) return undefined;
  return best.distance <= Math.max(2, Math.floor(target.length / 3)) ? best.value : undefined;
}

/**
 * Deterministic check of JSX against component argTypes (ADR-014).
 */
export class ValidationService {
  constructor(private readonly catalogService: CatalogService) {}

  async validateUsage(code: string): Promise<ValidationResult> {
    const analysis = analyzeJsx(code);
    const catalog = await this.catalogService.getEntries();
    const byName = new Map(catalog.map((entry) => [entry.name, entry]));

    // Map local JSX identifiers to catalog components via imports (handles aliases).
    const localToComponent = new Map<string, CatalogEntry>();
    const designSystemSources = new Set<string>();
    for (const binding of analysis.imports) {
      const entry = byName.get(binding.imported) ?? byName.get(binding.local);
      if (entry) {
        localToComponent.set(binding.local, entry);
        designSystemSources.add(binding.source);
      }
    }
    for (const entry of catalog) {
      if (!localToComponent.has(entry.name)) localToComponent.set(entry.name, entry);
    }
    const importedFromDesignSystem = new Set(
      analysis.imports.filter((b) => designSystemSources.has(b.source)).map((b) => b.local),
    );

    const issues: UsageIssue[] = [];
    const unvalidated = new Set<string>();

    for (const element of analysis.elements) {
      if (!/^[A-Z]/.test(element.name)) continue;
      const entry = localToComponent.get(element.name);

      if (!entry) {
        if (importedFromDesignSystem.has(element.name)) {
          const suggestion = closest(element.name, catalog.map((c) => c.name));
          issues.push({
            component: element.name,
            line: element.line,
            kind: "unknown_component",
            message: `${element.name} is imported from the design system but is not a documented component.`,
            ...(suggestion ? { suggestion: `Did you mean ${suggestion}?` } : {}),
          });
        }
        continue;
      }

      if (!entry.hasPropContract) {
        unvalidated.add(entry.name);
        continue;
      }

      issues.push(...this.checkElement(element, entry));
    }

    return { valid: issues.length === 0, issues, unvalidated: [...unvalidated] };
  }

  private checkElement(element: JsxElementUsage, entry: CatalogEntry): UsageIssue[] {
    const issues: UsageIssue[] = [];
    const propsByName = new Map(entry.props.map((p) => [p.name, p]));
    const declared = entry.props.map((p) => p.name);

    for (const prop of element.props) {
      const spec = propsByName.get(prop.name);
      if (!spec) {
        if (isPassthrough(prop.name)) continue;
        const suggestion = closest(prop.name, declared);
        issues.push({
          component: entry.name,
          line: element.line,
          kind: "unknown_prop",
          message: `${entry.name} has no prop "${prop.name}". Declared: ${declared.join(", ")}`,
          ...(suggestion ? { suggestion: `Use "${suggestion}"` } : {}),
        });
        continue;
      }

      if (spec.kind === "enum" && spec.options?.length && prop.value.kind !== "dynamic") {
        const value = String(prop.value.value);
        if (!spec.options.includes(value)) {
          const suggestion = closest(value, spec.options);
          issues.push({
            component: entry.name,
            line: element.line,
            kind: "invalid_value",
            message: `${prop.name}=${JSON.stringify(value)} not allowed. Allowed: ${spec.options.join(" | ")}`,
            ...(suggestion ? { suggestion: `${prop.name}=${JSON.stringify(suggestion)}` } : {}),
          });
        }
      } else if (spec.kind === "boolean" && prop.value.kind === "string") {
        issues.push({
          component: entry.name,
          line: element.line,
          kind: "invalid_value",
          message: `${prop.name} expects a boolean, got string ${JSON.stringify(prop.value.value)}`,
          suggestion: prop.value.value === "false" ? `${prop.name}={false}` : prop.name,
        });
      }
    }

    if (!element.hasSpread) {
      const present = new Set(element.props.map((p) => p.name));
      if (element.hasChildren) present.add("children");
      for (const spec of entry.props) {
        if (spec.required && !present.has(spec.name)) {
          issues.push({
            component: entry.name,
            line: element.line,
            kind: "missing_required_prop",
            message: `${entry.name} requires prop "${spec.name}".`,
          });
        }
      }
    }

    return issues;
  }
}
