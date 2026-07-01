import { hashProjectApiKey, verifyProjectApiKeyHash } from "./apiKeys";

const TELEGRAM_CONNECTION_TOKEN_PREFIX = "wish_tg_";
const TOKEN_LOOKUP_PREFIX_LENGTH = 20;

export function generateTelegramConnectionToken() {
  return `${TELEGRAM_CONNECTION_TOKEN_PREFIX}${crypto.randomUUID().replaceAll("-", "")}`;
}

export function getTelegramConnectionTokenPrefix(token: string) {
  return token.slice(0, TOKEN_LOOKUP_PREFIX_LENGTH);
}

export async function hashTelegramConnectionToken(token: string) {
  return await hashProjectApiKey(token);
}

export async function verifyTelegramConnectionTokenHash(storedTokenHash: string, token: string) {
  return await verifyProjectApiKeyHash(storedTokenHash, token);
}
