import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import {
  isLinearHandoffCreationEnabled,
  validateLinearRedirectUri,
} from "./linearConnection";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Linear connection configuration", () => {
  it("accepts only the fixed callback", () => {
    expect(validateLinearRedirectUri("https://api.example.com/work-trackers/linear/callback")).toBe(
      "https://api.example.com/work-trackers/linear/callback",
    );
    expect(() => validateLinearRedirectUri("https://evil.example.com/callback")).toThrow(
      "Linear OAuth redirect URI is invalid",
    );
  });

  it("requires the Linear Handoff creation flag to be explicitly enabled", () => {
    expect(isLinearHandoffCreationEnabled()).toBe(false);
    vi.stubEnv("LINEAR_HANDOFF_CREATION_ENABLED", " TRUE ");
    expect(isLinearHandoffCreationEnabled()).toBe(true);
    vi.stubEnv("LINEAR_HANDOFF_CREATION_ENABLED", "false");
    expect(isLinearHandoffCreationEnabled()).toBe(false);
  });
});
