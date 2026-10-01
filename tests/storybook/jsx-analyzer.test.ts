import { describe, it, expect } from "vitest";
import { analyzeJsx, inferPropsFromSource } from "../../src/storybook/jsx-analyzer.js";

describe("analyzeJsx", () => {
  it("extracts elements, literal props, spreads, and imports", () => {
    const code = `
import { Button as Btn } from "@org/ui";
export const A = () => (
  <div>
    <Btn variant="primary" size={"md"} count={3} disabled onClick={go} {...rest}>Go</Btn>
  </div>
);`;
    const { elements, imports } = analyzeJsx(code);
    const btn = elements.find((e) => e.name === "Btn")!;

    expect(imports).toEqual([{ local: "Btn", imported: "Button", source: "@org/ui" }]);
    expect(btn.line).toBe(5);
    expect(btn.hasSpread).toBe(true);
    expect(btn.hasChildren).toBe(true);
    expect(btn.props).toEqual([
      { name: "variant", value: { kind: "string", value: "primary" } },
      { name: "size", value: { kind: "string", value: "md" } },
      { name: "count", value: { kind: "number", value: 3 } },
      { name: "disabled", value: { kind: "boolean", value: true } },
      { name: "onClick", value: { kind: "dynamic" } },
    ]);
  });
});

describe("inferPropsFromSource", () => {
  it("classifies enum, boolean, function, node, and optional props", () => {
    const code = `
import type { ReactNode } from "react";
export interface DatePickerProps {
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  label: string;
  onChange: (value: Date) => void;
  children?: ReactNode;
  value?: Date;
}
export function DatePicker(props: DatePickerProps) { return null; }`;
    const props = inferPropsFromSource(code, "DatePicker");
    const byName = Object.fromEntries(props.map((p) => [p.name, p]));

    expect(byName.size).toMatchObject({ kind: "enum", options: ["sm", "md", "lg"], optional: true });
    expect(byName.disabled).toMatchObject({ kind: "boolean" });
    expect(byName.label).toMatchObject({ kind: "string", optional: false });
    expect(byName.onChange).toMatchObject({ kind: "function" });
    expect(byName.children).toMatchObject({ kind: "node" });
    expect(byName.value).toMatchObject({ kind: "other", type: "Date" });
  });

  it("supports type aliases", () => {
    const props = inferPropsFromSource(`type TagProps = { tone: "info" | "warn" };`, "Tag");
    expect(props).toEqual([
      { name: "tone", optional: false, kind: "enum", type: `"info" | "warn"`, options: ["info", "warn"] },
    ]);
  });
});
