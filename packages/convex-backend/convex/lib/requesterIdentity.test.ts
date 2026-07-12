import { describe, expect, it } from "vite-plus/test";

import {
  isRequesterClientId,
  isRequesterEmail,
  normalizeRequesterEmail,
} from "./requesterIdentity";

describe("requester identity", () => {
  it("normalizes optional requester email", () => {
    expect(normalizeRequesterEmail("  PERSON@Example.COM  ")).toBe("person@example.com");
    expect(normalizeRequesterEmail("   ")).toBeUndefined();
    expect(normalizeRequesterEmail(undefined)).toBeUndefined();
  });

  it("accepts basic email addresses and rejects malformed values", () => {
    expect(isRequesterEmail("person@example.com")).toBe(true);
    expect(isRequesterEmail("not-an-email")).toBe(false);
    expect(isRequesterEmail("person@example")).toBe(false);
    expect(isRequesterEmail(`${"a".repeat(245)}@example.com`)).toBe(false);
  });

  it("accepts only locally generated requester ids", () => {
    expect(isRequesterClientId("requester_00000000-0000-4000-8000-000000000000")).toBe(true);
    expect(isRequesterClientId("requester_00000000-0000-0000-0000-000000000000")).toBe(false);
    expect(isRequesterClientId("user_00000000-0000-4000-8000-000000000000")).toBe(false);
    expect(isRequesterClientId("requester_")).toBe(false);
  });
});
