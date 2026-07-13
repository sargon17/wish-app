const KEY_LENGTH = 32;
const IV_LENGTH = 12;

function decodeEncryptionKey(value: string) {
  try {
    const bytes = Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
    if (bytes.length === KEY_LENGTH) {
      return bytes;
    }
  } catch {
    // The stable error below is safer than leaking decoder details.
  }

  throw new Error("Work Tracker encryption key must be 32 bytes encoded as base64");
}

function encodeBase64(value: Uint8Array) {
  return btoa(String.fromCharCode(...value));
}

function decodeBase64(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

async function importEncryptionKey(value: string, usage: KeyUsage) {
  return await crypto.subtle.importKey("raw", decodeEncryptionKey(value), "AES-GCM", false, [usage]);
}

export async function encryptWorkTrackerSecret(plaintext: string, encryptionKey: string) {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await importEncryptionKey(encryptionKey, "encrypt");
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext),
  );

  return {
    ciphertext: encodeBase64(new Uint8Array(ciphertext)),
    iv: encodeBase64(iv),
  };
}

export async function decryptWorkTrackerSecret(
  encrypted: { ciphertext: string; iv: string },
  encryptionKey: string,
) {
  const key = await importEncryptionKey(encryptionKey, "decrypt");

  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: decodeBase64(encrypted.iv) },
      key,
      decodeBase64(encrypted.ciphertext),
    );
    return new TextDecoder().decode(plaintext);
  } catch {
    throw new Error("Unable to decrypt Work Tracker secret");
  }
}
