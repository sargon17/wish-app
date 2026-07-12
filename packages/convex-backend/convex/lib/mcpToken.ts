import { importJWK, SignJWT } from "jose";

const textEncoder = new TextEncoder();

export const MCP_AUDIENCE = "wish-mcp";

function encodeBase64Url(value: Uint8Array) {
  let binary = "";

  for (const byte of value) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function getMcpIssuer() {
  return process.env.WISH_MCP_JWT_ISSUER;
}

export function getMcpTokenId(identity: Record<string, unknown>) {
  if (identity.issuer !== getMcpIssuer()) {
    return null;
  }

  const tokenId = identity["properties.mcpTokenId"];
  return typeof tokenId === "string" ? tokenId : null;
}

export async function hashMcpTokenId(tokenId: string) {
  const digest = await crypto.subtle.digest("SHA-256", textEncoder.encode(tokenId));
  return encodeBase64Url(new Uint8Array(digest));
}

export async function createMcpToken(userId: string, tokenId: string, expiresAt: number) {
  const issuer = getMcpIssuer();
  const privateKey = process.env.WISH_MCP_JWT_PRIVATE_KEY;
  const keyId = process.env.WISH_MCP_JWT_KID;

  if (!issuer || !privateKey || !keyId) {
    throw new Error("MCP signing is not configured");
  }

  return await new SignJWT({ properties: { mcpTokenId: tokenId } })
    .setProtectedHeader({ alg: "ES256", kid: keyId, typ: "JWT" })
    .setAudience(MCP_AUDIENCE)
    .setExpirationTime(Math.floor(expiresAt / 1000))
    .setIssuedAt()
    .setIssuer(issuer)
    .setSubject(userId)
    .sign(await importJWK(JSON.parse(privateKey), "ES256"));
}
