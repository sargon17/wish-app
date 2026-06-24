const REQUESTER_ID_PREFIX = "requester_";
const REQUESTER_ID_PATTERN = /^requester_[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function createRequesterId() {
  return `${REQUESTER_ID_PREFIX}${crypto.randomUUID()}`;
}

export function isRequesterId(value: string) {
  return REQUESTER_ID_PATTERN.test(value);
}

export function getOrCreateRequesterId(storage: Storage) {
  const existing = storage.getItem("wish.requesterId");
  if (existing && isRequesterId(existing)) {
    return existing;
  }

  const nextClientId = createRequesterId();
  storage.setItem("wish.requesterId", nextClientId);
  return nextClientId;
}
