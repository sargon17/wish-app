import { describe, expect, it } from "vite-plus/test";

import { requestSlug } from "./slug";

describe("requestSlug", () => {
  it("normalizes request titles for cosmetic URLs", () => {
    expect(requestSlug("  Export CSV reports!!! ")).toBe("export-csv-reports");
  });

  it("falls back when the title has no URL-safe characters", () => {
    expect(requestSlug("!!!")).toBe("request");
  });
});
