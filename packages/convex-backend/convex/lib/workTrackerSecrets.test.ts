import { describe, expect, it } from "vite-plus/test";

import { decryptWorkTrackerSecret, encryptWorkTrackerSecret } from "./workTrackerSecrets";

const key = btoa(String.fromCharCode(...new Uint8Array(32).fill(7)));
const wrongKey = btoa(String.fromCharCode(...new Uint8Array(32).fill(8)));

describe("Work Tracker secret encryption", () => {
  it("round-trips a secret with AES-GCM", async () => {
    const encrypted = await encryptWorkTrackerSecret("linear-token", key);
    const encryptedAgain = await encryptWorkTrackerSecret("linear-token", key);

    expect(await decryptWorkTrackerSecret(encrypted, key)).toBe("linear-token");
    expect(encrypted.ciphertext).not.toContain("linear-token");
    expect(encrypted.iv).not.toBe(encryptedAgain.iv);
  });

  it("rejects invalid keys and tampered ciphertext", async () => {
    await expect(encryptWorkTrackerSecret("linear-token", "bad-key")).rejects.toThrow(
      "Work Tracker encryption key must be 32 bytes encoded as base64",
    );

    const encrypted = await encryptWorkTrackerSecret("linear-token", key);
    await expect(decryptWorkTrackerSecret(encrypted, wrongKey)).rejects.toThrow(
      "Unable to decrypt Work Tracker secret",
    );

    const tampered = {
      ...encrypted,
      ciphertext: `${encrypted.ciphertext.slice(0, -2)}AA`,
    };

    await expect(decryptWorkTrackerSecret(tampered, key)).rejects.toThrow(
      "Unable to decrypt Work Tracker secret",
    );
  });
});
