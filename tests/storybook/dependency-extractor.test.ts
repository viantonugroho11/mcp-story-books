import { describe, it, expect } from "vitest";
import { extractDependenciesFromChunk } from "../../src/storybook/dependency-extractor.js";

describe("dependency-extractor", () => {
  it("finds named imports of components", () => {
    const src = `import { Button, Icon } from "./Button";
      import { Avatar } from "../Avatar";
      import { useState } from "react";`;

    const deps = extractDependenciesFromChunk(src, new Set(["button", "icon", "avatar"]));
    const names = deps.map((d) => d.name).sort();

    expect(names).toContain("Button");
    expect(names).toContain("Icon");
    expect(names).toContain("Avatar");
    expect(names).not.toContain("useState");
  });

  it("finds JSX/createElement composition and upgrades type", () => {
    const src = `
      import { Card } from "./Card";
      function Story() {
        return jsx(Card, { children: jsx(Button, {}) });
      }
    `;

    const deps = extractDependenciesFromChunk(src, new Set(["card", "button"]));
    const card = deps.find((d) => d.name === "Card");
    const button = deps.find((d) => d.name === "Button");

    expect(card?.type).toBe("composition");
    expect(button?.type).toBe("composition");
  });

  it("skips non-component identifiers (lowercase, single-letter)", () => {
    const src = `
      import { helper } from "./util";
      const x = jsx(div, {});
    `;
    const deps = extractDependenciesFromChunk(src, new Set());
    expect(deps.length).toBe(0);
  });
});
