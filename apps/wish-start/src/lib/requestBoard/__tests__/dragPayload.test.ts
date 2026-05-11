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

    expect(data.get(REQUEST_DRAG_MIME)).toBe("request-1");
    expect(data.get("text/plain")).toBe("request-1");
    expect(readRequestDragPayload(dataTransfer)).toBe("request-1");
  });

  it("returns undefined for empty payloads", () => {
    const dataTransfer = {
      getData: () => "",
    } as Pick<DataTransfer, "getData">;

    expect(readRequestDragPayload(dataTransfer)).toBeUndefined();
  });
});
