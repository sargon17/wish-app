import { describe, expect, it } from "vite-plus/test";

import { validateLinearRedirectUri, validateWishAppBaseUrl } from "./linearConnection";

describe("Linear connection configuration", () => {
  it("accepts only fixed callback and app origins", () => {
    expect(validateWishAppBaseUrl("https://wish.example.com/")).toBe("https://wish.example.com");
    expect(validateWishAppBaseUrl("http://localhost:3000/")).toBe("http://localhost:3000");
    expect(() => validateWishAppBaseUrl("ftp://localhost/")).toThrow("Wish app base URL is invalid");
    expect(() => validateWishAppBaseUrl("https://wish.example.com/path")).toThrow(
      "Wish app base URL is invalid",
    );
    expect(
      validateLinearRedirectUri("https://api.example.com/work-trackers/linear/callback"),
    ).toBe("https://api.example.com/work-trackers/linear/callback");
    expect(() => validateLinearRedirectUri("https://evil.example.com/callback")).toThrow(
      "Linear OAuth redirect URI is invalid",
    );
  });
});
