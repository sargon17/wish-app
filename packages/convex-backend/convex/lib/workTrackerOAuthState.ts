function encodeBase64Url(value: Uint8Array) {
  return btoa(String.fromCharCode(...value))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

export function createWorkTrackerOAuthState() {
  return encodeBase64Url(crypto.getRandomValues(new Uint8Array(32)));
}

export async function hashWorkTrackerOAuthState(state: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(state));
  return encodeBase64Url(new Uint8Array(digest));
}
