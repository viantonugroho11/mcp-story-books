import { describe, it, expect } from "vitest";
import { CatalogService, type CatalogEntry } from "../../src/services/catalog-service.js";
import { ValidationService, editDistance } from "../../src/services/validation-service.js";
import type { ComponentService } from "../../src/services/component-service.js";
import type { UsageService } from "../../src/services/usage-service.js";
import type { MemoryService } from "../../src/services/memory-service.js";

const configs: Record<string, unknown> = {
  "Components/Button": {
    path: "Components/Button",
    name: "Button",
    description: "Primary action trigger used for forms and dialogs across the product.",
    argTypes: [
      { name: "variant", control: "select", options: ["primary", "secondary", "destructive"] },
      { name: "disabled", control: "boolean" },
      { name: "label", control: "text" },
    ],
    stylePresets: [],
  },
  "Components/Box": { path: "Components/Box", name: "Box", argTypes: [], stylePresets: [] },
};

function fakeComponentService(): ComponentService {
  return {
    async listComponents() {
      return Object.keys(configs).map((path) => ({
        path,
        name: path.split("/").pop(),
        category: "Components",
        variantCount: 1,
        variantNames: [],
        tags: [],
      }));
    },
    async getComponentConfig(path: string) {
      const config = configs[path];
      if (!config) throw new Error("missing");
      return config;
    },
  } as unknown as ComponentService;
}

const fakeUsage = {
  async inferImportPath(_path: string, name: string) {
    return `@org/ui/${name.toLowerCase()}`;
  },
} as unknown as UsageService;

const fakeMemory = {
  async list() {
    return [
      {
        name: "DatePicker",
        import: `import { DatePicker } from "./DatePicker";`,
        description: "Pick a date",
        props: [{ name: "size", optional: false, kind: "enum", type: "", options: ["sm", "lg"] }],
        origin: "scaffold_story",
        createdAt: "2026-10-01T00:00:00Z",
      },
    ];
  },
} as unknown as MemoryService;

const catalog = () => new CatalogService(fakeComponentService(), fakeUsage, fakeMemory);

describe("CatalogService", () => {
  it("summarizes components with key props and merges pending ones", async () => {
    const { components } = await catalog().getCatalogSummary({ maxDescriptionLength: 30 });

    expect(components[0]).toEqual({
      name: "Button",
      import: `import { Button } from "@org/ui/button";`,
      description: "Primary action trigger used f…",
      keyProps: ["variant: primary|secondary|destructive", "disabled: boolean"],
    });
    expect(components.find((c) => c.name === "DatePicker")).toMatchObject({
      source: "pending",
      keyProps: ["size: sm|lg (required)"],
    });
  });

  it("keeps components whose config cannot load", async () => {
    const svc = fakeComponentService();
    (svc as unknown as { getComponentConfig: () => never }).getComponentConfig = () => {
      throw new Error("no static mode");
    };
    const entries: CatalogEntry[] = await new CatalogService(svc, fakeUsage).getEntries();
    expect(entries.map((e) => [e.name, e.hasPropContract])).toEqual([
      ["Button", false],
      ["Box", false],
    ]);
  });
});

describe("ValidationService", () => {
  const validate = (code: string) => new ValidationService(catalog()).validateUsage(code);

  it("accepts valid usage and passthrough attributes", async () => {
    const result = await validate(
      `<Button variant="primary" disabled className="x" aria-label="y" data-id="1" onClick={f} />`,
    );
    expect(result).toEqual({ valid: true, issues: [], unvalidated: [] });
  });

  it("flags invalid enum values, unknown props, and string booleans", async () => {
    const result = await validate(`<Button variant="danger" lable="Hi" disabled="true" />`);
    expect(result.valid).toBe(false);
    expect(result.issues.map((i) => [i.kind, i.suggestion])).toEqual([
      ["invalid_value", undefined],
      ["unknown_prop", `Use "label"`],
      ["invalid_value", "disabled"],
    ]);
    expect(result.issues[0]!.message).toContain("primary | secondary | destructive");
  });

  it("skips dynamic values and reports components without argTypes as unvalidated", async () => {
    const result = await validate(`<><Button variant={v} /><Box anything="x" /></>`);
    expect(result.valid).toBe(true);
    expect(result.unvalidated).toEqual(["Box"]);
  });

  it("resolves aliased imports and flags unknown design-system components", async () => {
    const result = await validate(`
import { Button as Btn, Buton } from "@org/ui";
const a = <><Btn variant="nope" /><Buton /></>;`);
    expect(result.issues.map((i) => [i.component, i.kind])).toEqual([
      ["Button", "invalid_value"],
      ["Buton", "unknown_component"],
    ]);
    expect(result.issues[1]!.suggestion).toBe("Did you mean Button?");
  });

  it("checks required props on pending components", async () => {
    const result = await validate(`<DatePicker />`);
    expect(result.issues).toMatchObject([{ kind: "missing_required_prop", component: "DatePicker" }]);
  });

  it("computes case-insensitive edit distance", () => {
    expect(editDistance("lable", "label")).toBe(2);
    expect(editDistance("Size", "size")).toBe(0);
  });
});
