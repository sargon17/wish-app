export const REQUEST_DRAG_MIME = "application/x-wish-request";

export function writeRequestDragPayload(dataTransfer: DataTransfer, requestId: string) {
  dataTransfer.effectAllowed = "move";
  dataTransfer.setData(REQUEST_DRAG_MIME, requestId);
  dataTransfer.setData("text/plain", requestId);
}

export function readRequestDragPayload(dataTransfer: Pick<DataTransfer, "getData">) {
  const requestId = dataTransfer.getData(REQUEST_DRAG_MIME) || dataTransfer.getData("text/plain");

  if (!requestId) {
    return undefined;
  }

  return requestId;
}
