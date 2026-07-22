import { describe, expect, it } from "vite-plus/test";

import { normalizePortalDateRange } from "./portalDateRange";

describe("normalizePortalDateRange", () => {
  it("rejects impossible dates and orders reversed ranges", () => {
    expect(normalizePortalDateRange("garbage", "2026-02-31")).toEqual({
      from: undefined,
      to: undefined,
    });
    expect(normalizePortalDateRange("2026-07-22", "2026-07-01")).toEqual({
      from: "2026-07-01",
      to: "2026-07-22",
    });
  });
});
