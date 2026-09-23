import { describe, expect, it } from "vitest";
import { extractPlainTextFromChunk, extractSectionsFromChunk } from "../../src/storybook/text-extractor.js";

describe("text-extractor", () => {
  it("extracts readable strings from compiled MDX chunks", () => {
    const sample = `children:"Overview"}),children:"FUNDS-WEB is a UI Framework"`;
    const text = extractPlainTextFromChunk(sample);
    expect(text).toContain("FUNDS-WEB");
    expect(text).toContain("Overview");
  });

  it("builds sections from h2 markers", () => {
    const sample = `h2,{id:"overview",children:"Overview"},children:"Purpose text"`;
    const sections = extractSectionsFromChunk(sample);
    expect(sections[0]?.id).toBe("overview");
    expect(sections[0]?.title).toBe("Overview");
  });
});
