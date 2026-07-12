const REQUESTER_ID_PATTERN =
  /^requester_[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const REQUESTER_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_REQUESTER_EMAIL_LENGTH = 254;

export function normalizeRequesterEmail(value: string | undefined) {
  const email = value?.trim().toLowerCase();
  return email || undefined;
}

export function isRequesterEmail(value: string) {
  return value.length <= MAX_REQUESTER_EMAIL_LENGTH && REQUESTER_EMAIL_PATTERN.test(value);
}

export function isRequesterClientId(value: string) {
  return REQUESTER_ID_PATTERN.test(value);
}
