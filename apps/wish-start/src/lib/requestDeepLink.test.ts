import { describe, expect, it } from "vite-plus/test";

import { locationWithoutRequestItem, requestItemFromSearch } from "./requestDeepLink";

describe("request deep links", () => {
  it("accepts a non-empty request id", () => {
    expect(requestItemFromSearch(" request-123 ")).toBe("request-123");
  });

  it("distinguishes missing request ids from malformed ones", () => {
    expect(requestItemFromSearch(undefined)).toBeUndefined();
    expect(requestItemFromSearch(123)).toBeNull();
    expect(requestItemFromSearch(["request-1", "request-2"])).toBeNull();
    expect(requestItemFromSearch("   ")).toBeNull();
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
