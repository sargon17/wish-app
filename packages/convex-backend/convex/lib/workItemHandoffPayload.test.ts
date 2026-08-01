import { describe, expect, it } from "vite-plus/test";

import {
  buildWishSourceUrl,
  buildWorkItemDescription,
} from "./workItemHandoffPayload";

describe("Work Item Handoff payload", () => {
  it("builds owner deep links and copies only the agreed description", () => {
    const sourceUrl = buildWishSourceUrl(
      "https://wish.example.com",
      "project-id",
      "product-roadmap",
      "complaint",
      "request-id",
    );

    expect(sourceUrl).toBe(
      "https://wish.example.com/dashboard/project/project-id/product-roadmap/complaints?item=request-id",
    );
    expect(buildWorkItemDescription("Original description", sourceUrl)).toBe(
      `Original description\n\n---\n\n[View original in Wish](${sourceUrl})`,
    );
    expect(buildWorkItemDescription(undefined, sourceUrl)).toBe(
      `[View original in Wish](${sourceUrl})`,
    );
  });
});
