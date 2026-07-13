import { describe, expect, it } from "vite-plus/test";

import { locationWithoutRequestItem, requestItemFromSearch } from "./requestDeepLink";

describe("request deep links", () => {
  it("accepts a non-empty request id", () => {
    expect(requestItemFromSearch(" request-123 ")).toBe("request-123");
  });

  it("rejects missing and empty request ids", () => {
    expect(requestItemFromSearch(undefined)).toBeUndefined();
    expect(requestItemFromSearch(123)).toBeUndefined();
    expect(requestItemFromSearch("   ")).toBeUndefined();
  });

  it("removes the item while preserving other search parameters", () => {
    expect(
      locationWithoutRequestItem(
        "/dashboard/project/project-1/example/requests",
        "?settings=work-trackers&item=request-1&linear=connected",
      ),
    ).toBe(
      "/dashboard/project/project-1/example/requests?settings=work-trackers&linear=connected",
    );
  });

  it("removes the search suffix when item is the only parameter", () => {
    expect(
      locationWithoutRequestItem(
        "/dashboard/project/project-1/example/complaints",
        "?item=complaint-1",
      ),
    ).toBe("/dashboard/project/project-1/example/complaints");
  });
});
