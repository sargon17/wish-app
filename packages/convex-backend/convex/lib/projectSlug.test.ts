import { describe, expect, it } from "vite-plus/test";

import { slugifyProjectTitle } from "./projectSlug";

describe("slugifyProjectTitle", () => {
  it("normalizes project titles for public portal URLs", () => {
    expect(slugifyProjectTitle("  Acme Roadmap!!! ")).toBe("acme-roadmap");
  });

  it("falls back when the title has no URL-safe characters", () => {
    expect(slugifyProjectTitle("!!!")).toBe("project");
  });
});
