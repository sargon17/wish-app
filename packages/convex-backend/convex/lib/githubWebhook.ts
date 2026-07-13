function decodeHex(value: string) {
  if (!/^[0-9a-f]{64}$/.test(value)) return null;
  return Uint8Array.from(value.match(/.{2}/g) ?? [], (byte) => Number.parseInt(byte, 16));
}

function readNumericId(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0
    ? String(value)
    : null;
}

export async function readGitHubWebhookBody(request: Request, maxBytes: number) {
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    byteLength += value.byteLength;
    if (byteLength > maxBytes) {
      await reader.cancel();
      throw new Error("GitHub webhook payload exceeded the size limit");
    }
    chunks.push(value);
  }
  const body = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

export async function verifyGitHubWebhookSignature(
  secret: string,
  body: Uint8Array,
  signature: string | undefined,
) {
  if (!signature?.startsWith("sha256=")) return false;
  const received = decodeHex(signature.slice(7));
  if (!received) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  return await crypto.subtle.verify(
    "HMAC",
    key,
    new Uint8Array(received).buffer,
    new Uint8Array(body).buffer,
  );
}

export function parseGitHubWebhook(value: unknown, event: string | undefined) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  if (event === "ping") return { kind: "ping" as const };
  if (event !== "installation" && event !== "installation_repositories") {
    return { kind: "ignored" as const };
  }
  const payload = value as Record<string, unknown>;
  const installation = payload.installation;
  if (
    typeof installation !== "object" ||
    installation === null ||
    Array.isArray(installation) ||
    !readNumericId((installation as Record<string, unknown>).id)
  ) {
    return null;
  }
  const installationId = readNumericId((installation as Record<string, unknown>).id);
  if (!installationId) return null;
  if (event === "installation") {
    const action = payload.action;
    if (action === "deleted" || action === "suspend") {
      return { kind: "installation_unavailable" as const, installationId };
    }
    return { kind: "ignored" as const };
  }
  if (event === "installation_repositories") {
    if (!Array.isArray(payload.repositories_removed)) return null;
    const repositoryIds = payload.repositories_removed.flatMap((repository) => {
      if (
        typeof repository !== "object" ||
        repository === null ||
        Array.isArray(repository)
      ) {
        return [];
      }
      const repositoryId = readNumericId((repository as Record<string, unknown>).id);
      return repositoryId ? [repositoryId] : [];
    });
    return { kind: "repositories_removed" as const, installationId, repositoryIds };
  }
  return { kind: "ignored" as const };
}
