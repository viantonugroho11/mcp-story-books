import { describe, expect, it } from "vitest";
import { normalizeStory, normalizeStoryList } from "../../src/repository/story-mapper.js";

describe("story-mapper", () => {
  it("normalizes a story object", () => {
    const story = normalizeStory({
      id: "s1",
      title: "Payment Retry",
      tags: ["payments"],
      sections: [{ id: "sec-1", title: "Flow", content: "Retry after 24h" }],
    });

    expect(story.id).toBe("s1");
    expect(story.sections).toHaveLength(1);
    expect(story.sections[0]?.title).toBe("Flow");
  });

  it("normalizes list payloads", () => {
    const stories = normalizeStoryList({
      stories: [{ id: "a" }, { id: "b" }],
    });
    expect(stories).toHaveLength(2);
  });
});
