import { validateWorkTrackerEncryptionKey } from "./workTrackerSecrets";

export function validateWishAppBaseUrl(value: string) {
  try {
    const url = new URL(value);
    const validProtocol =
      url.protocol === "https:" ||
      (url.protocol === "http:" && url.hostname === "localhost");
    if (
      !validProtocol ||
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      url.username ||
      url.password
    ) {
      throw new Error();
    }
    return url.origin;
  } catch {
    throw new Error("Wish app base URL is invalid");
  }
}

export function getWorkTrackerEncryptionKey() {
  const encryptionKey = process.env.WORK_TRACKER_ENCRYPTION_KEY?.trim();
  if (!encryptionKey) throw new Error("Work Tracker encryption key is not configured");
  return validateWorkTrackerEncryptionKey(encryptionKey);
}
