import { describe, expect, it } from "vite-plus/test";

import {
  getPortalPage,
  normalizePortalQuery,
  normalizePortalSearchTokens,
  normalizePortalSort,
  portalRequestMatchesSearch,
  scoreSimilarPortalRequest,
  sortPortalRequests,
} from "./suggestionPortalReadModel";

function request(text: string, upvoteCount: number | undefined, createdAt: number, description?: string) {
  return {
    text,
    description,
    upvoteCount,
    _creationTime: createdAt,
  };
}

describe("suggestion portal read model", () => {
  it("normalizes search input and ignores weak similarity tokens", () => {
    expect(normalizePortalQuery("  CSV Export  ")).toBe("csv export");
    expect(normalizePortalSearchTokens("CSV, AI, export!")).toEqual(["csv", "export"]);
  });

  it("matches search against request title and description", () => {
    const item = request("Export reports", 1, 100, "Download as CSV");

    expect(portalRequestMatchesSearch(item, "csv")).toBe(true);
    expect(portalRequestMatchesSearch(item, "billing")).toBe(false);
  });

  it("scores similar requests by matched tokens", () => {
    const item = request("Export reports", 1, 100, "Download reports as CSV");

    expect(scoreSimilarPortalRequest(item, ["csv", "reports", "billing"])).toBe(2);
  });

  it("sorts by top votes with newest as the tie-breaker", () => {
    const first = request("First", 1, 100);
    const second = request("Second", 3, 50);
    const third = request("Third", 3, 150);

    expect(sortPortalRequests([first, second, third], "top")).toEqual([third, second, first]);
  });

  it("sorts newest first", () => {
    const older = request("Older", 100, 100);
    const newer = request("Newer", 0, 200);

    expect(sortPortalRequests([older, newer], "newest")).toEqual([newer, older]);
  });

  it("falls back to top sort for invalid values", () => {
    expect(normalizePortalSort("unknown")).toBe("top");
    expect(normalizePortalSort("newest")).toBe("newest");
  });

  it("returns bounded pages and the next cursor", () => {
    const items = Array.from({ length: 5 }, (_, index) => index);

    expect(getPortalPage(items, 1, 2)).toEqual({
      page: [1, 2],
      nextCursor: 3,
      totalCount: 5,
    });
    expect(getPortalPage(items, -10, 999).page).toEqual(items);
  });
});
