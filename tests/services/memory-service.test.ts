import { describe, it, expect, beforeEach } from "vitest";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MemoryService } from "../../src/services/memory-service.js";

describe("MemoryService", () => {
  let file: string;
  beforeEach(async () => {
    file = join(await mkdtemp(join(tmpdir(), "sb-mem-")), "nested", "memory.json");
  });

  it("stores, replaces, and forgets entries on disk", async () => {
    const svc = new MemoryService(file);
    await svc.remember({ componentName: "DatePicker", import: "x", description: "v1" });
    await svc.remember({
      componentName: "DatePicker",
      import: "x",
      description: "v2",
      componentSource: `interface DatePickerProps { size: "sm" | "lg" }`,
    });

    const list = await svc.list();
    expect(list).toHaveLength(1);
    expect(list[0]!.description).toBe("v2");
    expect(list[0]!.props[0]).toMatchObject({ name: "size", options: ["sm", "lg"] });
    expect(JSON.parse(await readFile(file, "utf8")).components).toHaveLength(1);

    expect(await svc.forget("DatePicker")).toBe(true);
    expect(await svc.forget("DatePicker")).toBe(false);
  });

  it("drops deployed components and flags stale ones", async () => {
    let now = new Date("2026-01-01T00:00:00Z");
    const svc = new MemoryService(file, 30, () => now);
    await svc.remember({ componentName: "Old", import: "x", description: "" });
    await svc.remember({ componentName: "Shipped", import: "x", description: "" });
    now = new Date("2026-03-01T00:00:00Z");
    await svc.remember({ componentName: "Fresh", import: "x", description: "" });

    const list = await svc.list(["Shipped"]);
    expect(list.map((c) => [c.name, c.stale])).toEqual([
      ["Old", true],
      ["Fresh", false],
    ]);
    expect((await svc.list()).map((c) => c.name)).not.toContain("Shipped");
  });
});
