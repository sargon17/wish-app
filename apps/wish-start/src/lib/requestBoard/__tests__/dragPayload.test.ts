import { describe, expect, it } from "vite-plus/test";

import { readRequestDragPayload, REQUEST_DRAG_MIME, writeRequestDragPayload } from "../dragPayload";

describe("requestBoard dragPayload", () => {
  it("writes and reads the request drag payload", () => {
    const data = new Map<string, string>();
    const dataTransfer = {
      effectAllowed: "",
      getData: (key: string) => data.get(key) ?? "",
      setData: (key: string, value: string) => {
        data.set(key, value);
      },
    } as DataTransfer;

    writeRequestDragPayload(dataTransfer, "request-1");

    expect(data.get(REQUEST_DRAG_MIME)).toBe(
      JSON.stringify({ type: "request", requestId: "request-1" }),
    );
    expect(data.get("text/plain")).toBe("wish-request:request-1");
    expect(readRequestDragPayload(dataTransfer)).toBe("request-1");
  });

  it("returns undefined for empty payloads", () => {
    const dataTransfer = {
      getData: () => "",
    } as Pick<DataTransfer, "getData">;

    expect(readRequestDragPayload(dataTransfer)).toBeUndefined();
  });

  it("ignores arbitrary text/plain drops", () => {
    const dataTransfer = {
      getData: (key: string) => (key === "text/plain" ? "not-a-request" : ""),
    } as Pick<DataTransfer, "getData">;

    expect(readRequestDragPayload(dataTransfer)).toBeUndefined();
  });

  it("reads the legacy prefixed fallback payload", () => {
    const dataTransfer = {
      getData: (key: string) => (key === "text/plain" ? "wish-request:request-legacy" : ""),
    } as Pick<DataTransfer, "getData">;

    expect(readRequestDragPayload(dataTransfer)).toBe("request-legacy");
  });
});
