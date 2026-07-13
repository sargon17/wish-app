import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import {
  getWishAppBaseUrl,
  getWorkTrackerEncryptionKey,
  validateWishAppBaseUrl,
} from "./workTrackerConfig";

afterEach(() => vi.unstubAllEnvs());

describe("Work Tracker configuration", () => {
  it("accepts only app origins", () => {
    expect(validateWishAppBaseUrl("https://wish.example.com/")).toBe(
      "https://wish.example.com",
    );
    expect(validateWishAppBaseUrl("http://localhost:3000/")).toBe(
      "http://localhost:3000",
    );
    expect(() => validateWishAppBaseUrl("ftp://localhost/")).toThrow(
      "Wish app base URL is invalid",
    );
    expect(() => validateWishAppBaseUrl("https://wish.example.com/path")).toThrow(
      "Wish app base URL is invalid",
    );
  });

  it("loads the shared encryption key", () => {
    const encryptionKey = btoa(String.fromCharCode(...new Uint8Array(32).fill(7)));
    vi.stubEnv("WORK_TRACKER_ENCRYPTION_KEY", encryptionKey);

    expect(getWorkTrackerEncryptionKey()).toBe(encryptionKey);
  });

  it("loads the canonical Wish origin", () => {
    vi.stubEnv("WISH_APP_BASE_URL", "https://wish.example.com/");

    expect(getWishAppBaseUrl()).toBe("https://wish.example.com");
  });
});
