import { describe, expect, it } from 'vite-plus/test'

import { slugifyStatusName } from "../slugifyStatusName";

describe("slugifyStatusName", () => {
  it("normalizes whitespace and punctuation", () => {
    expect(slugifyStatusName("  In   Review!  ")).toBe("in-review");
  });

  it("strips accent marks consistently", () => {
    expect(slugifyStatusName("Crème Brûlée")).toBe("creme-brulee");
  });
});
