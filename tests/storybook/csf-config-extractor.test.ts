import { describe, expect, it } from "vitest";
import { extractComponentConfigFromChunk } from "../../src/storybook/csf-config-extractor.js";

describe("csf-config-extractor", () => {
  it("extracts variant options and presets", () => {
    const sample = `argTypes:{variant:{control:"radio",options:["primary","secondary"]},size:{control:"radio",options:["m","l"]}},a={args:{variant:"primary",size:"m",children:"Primary"}},b={args:{variant:"secondary",size:"m",children:"Secondary"}}`;
    const config = extractComponentConfigFromChunk(sample, ["Default", "Secondary"]);
    expect(config.argTypes.find((a) => a.name === "variant")?.options).toEqual([
      "primary",
      "secondary",
    ]);
    expect(config.presets).toHaveLength(2);
    expect(config.presets[0]?.args.variant).toBe("primary");
  });
});
