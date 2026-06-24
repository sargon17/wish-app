import { describe, expect, it } from "vite-plus/test";

import { normalizeRequestInput, requestInputErrorMessage } from "./requestInput";

describe("request input", () => {
  it("normalizes request fields", () => {
    expect(normalizeRequestInput({
      text: "  Export CSV  ",
      description: "  Download reports  ",
      requesterEmail: "  PERSON@Example.COM  ",
    })).toEqual({
      ok: true,
      value: {
        text: "Export CSV",
        description: "Download reports",
        requesterEmail: "person@example.com",
      },
    });
  });

  it("omits empty optional fields", () => {
    expect(normalizeRequestInput({
      text: "Export CSV",
      description: "   ",
      requesterEmail: "   ",
    })).toEqual({
      ok: true,
      value: {
        text: "Export CSV",
        description: undefined,
        requesterEmail: undefined,
      },
    });
  });

  it("rejects invalid request fields", () => {
    expect(normalizeRequestInput({ text: "no" })).toEqual({ ok: false, error: "TITLE_TOO_SHORT" });
    expect(normalizeRequestInput({ text: "a".repeat(121) })).toEqual({ ok: false, error: "TITLE_TOO_LONG" });
    expect(normalizeRequestInput({ text: "Valid", description: "a".repeat(1001) })).toEqual({
      ok: false,
      error: "DESCRIPTION_TOO_LONG",
    });
    expect(normalizeRequestInput({ text: "Valid", requesterEmail: "not-an-email" })).toEqual({
      ok: false,
      error: "REQUESTER_EMAIL_INVALID",
    });
  });

  it("maps validation errors to user-facing messages", () => {
    expect(requestInputErrorMessage("REQUESTER_EMAIL_INVALID")).toBe("Requester email is invalid");
  });
});
