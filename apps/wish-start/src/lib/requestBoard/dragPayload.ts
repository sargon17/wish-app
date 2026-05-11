export const REQUEST_DRAG_MIME = "application/x-wish-request";
const REQUEST_DRAG_PREFIX = "wish-request:";

function parseRequestDragPayload(rawValue: string) {
  if (!rawValue) {
    return undefined;
  }

  try {
    const payload = JSON.parse(rawValue) as { type?: string; requestId?: string };
    if (payload.type === "request" && typeof payload.requestId === "string" && payload.requestId) {
      return payload.requestId;
    }
  } catch {
    if (rawValue.startsWith(REQUEST_DRAG_PREFIX)) {
      const requestId = rawValue.slice(REQUEST_DRAG_PREFIX.length);
      if (requestId) {
        return requestId;
      }
    }
  }

  return undefined;
}

export function writeRequestDragPayload(dataTransfer: DataTransfer, requestId: string) {
  dataTransfer.effectAllowed = "move";
  const payload = JSON.stringify({ type: "request", requestId });
  dataTransfer.setData(REQUEST_DRAG_MIME, payload);
  dataTransfer.setData("text/plain", `${REQUEST_DRAG_PREFIX}${requestId}`);
}

export function readRequestDragPayload(dataTransfer: Pick<DataTransfer, "getData">) {
  const requestId = parseRequestDragPayload(dataTransfer.getData(REQUEST_DRAG_MIME));

  if (requestId) {
    return requestId;
  }

  return parseRequestDragPayload(dataTransfer.getData("text/plain"));
}
