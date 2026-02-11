const API_KEY_HASH_VERSION = "v1";
const API_KEY_PREFIX = "wish_pk_";
const textEncoder = new TextEncoder();

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string) {
  if (hex.length === 0 || hex.length % 2 !== 0) {
    return null;
  }

  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < hex.length; index += 2) {
    const byte = Number.parseInt(hex.slice(index, index + 2), 16);
    if (Number.isNaN(byte)) {
      return null;
    }
    bytes[index / 2] = byte;
  }

  return bytes;
}

async function sha256Bytes(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", textEncoder.encode(value));
  return new Uint8Array(digest);
}

function safeEqualBytes(left: Uint8Array, right: Uint8Array) {
  const maxLength = Math.max(left.length, right.length, 1);
  let diff = left.length === right.length ? 0 : 1;

  for (let index = 0; index < maxLength; index += 1) {
    const leftByte = index < left.length ? left[index]! : 0;
    const rightByte = index < right.length ? right[index]! : 0;
    diff |= leftByte ^ rightByte;
  }

  return diff === 0;
}

export function generateProjectApiKey() {
  return `${API_KEY_PREFIX}${crypto.randomUUID().replaceAll("-", "")}`;
}

export async function hashProjectApiKey(apiKey: string) {
  const salt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
  const digest = await sha256Bytes(`${salt}:${apiKey}`);
  return `${API_KEY_HASH_VERSION}:${salt}:${bytesToHex(digest)}`;
}

export async function verifyProjectApiKeyHash(storedApiKeyHash: string, candidateApiKey: string) {
  const parts = storedApiKeyHash.split(":");
  const version = parts[0] ?? "";
  const salt = parts[1] ?? "";
  const storedDigestHex = parts[2] ?? "";

  const storedDigestBytes = hexToBytes(storedDigestHex) ?? new Uint8Array(0);
  const computedDigestBytes = await sha256Bytes(`${salt}:${candidateApiKey}`);
  const digestMatch = safeEqualBytes(storedDigestBytes, computedDigestBytes);

  return (
    version === API_KEY_HASH_VERSION &&
    salt.length > 0 &&
    storedDigestBytes.length > 0 &&
    digestMatch
  );
}
