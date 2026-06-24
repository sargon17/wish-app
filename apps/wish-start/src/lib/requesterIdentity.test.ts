import { describe, expect, it, vi } from "vite-plus/test";

import { getOrCreateRequesterId, isRequesterId } from "./requesterIdentity";

function memoryStorage(initialValue?: string) {
  const values = new Map<string, string>();
  if (initialValue) {
    values.set("wish.requesterId", initialValue);
  }

  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
  } as unknown as Storage;
}

describe("requester identity", () => {
  it("accepts generated requester ids", () => {
    expect(isRequesterId("requester_00000000-0000-4000-8000-000000000000")).toBe(true);
    expect(isRequesterId("requester_00000000-0000-0000-0000-000000000000")).toBe(false);
    expect(isRequesterId("user_00000000-0000-4000-8000-000000000000")).toBe(false);
  });

  it("reuses a valid stored requester id", () => {
    const storedId = "requester_00000000-0000-4000-8000-000000000000";
    const storage = memoryStorage(storedId);

    expect(getOrCreateRequesterId(storage)).toBe(storedId);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("replaces a malformed stored requester id", () => {
    const storage = memoryStorage("requester_bad");

    const requesterId = getOrCreateRequesterId(storage);

    expect(isRequesterId(requesterId)).toBe(true);
    expect(storage.setItem).toHaveBeenCalledWith("wish.requesterId", requesterId);
  });
});
