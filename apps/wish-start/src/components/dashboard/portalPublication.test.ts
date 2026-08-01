import { describe, expect, it } from "vite-plus/test";

import { getPortalPublication } from "./portalPublication";

describe("getPortalPublication", () => {
  it("presents a published portal with its public path", () => {
    expect(getPortalPublication("mobile-app", 1_750_000_000_000)).toEqual({
      isPublished: true,
      label: "Published",
      portalPath: "/p/mobile-app",
    });
  });

  it("presents an unpublished portal without public actions", () => {
    expect(getPortalPublication("mobile-app")).toEqual({
      isPublished: false,
      label: "Unpublished",
      portalPath: "/p/mobile-app",
    });
  });

  it("does not expose public actions when the portal has no slug", () => {
    expect(getPortalPublication(undefined, 1_750_000_000_000)).toEqual({
      isPublished: false,
      label: "Unpublished",
      portalPath: null,
    });
  });
});
