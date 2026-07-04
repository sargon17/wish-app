export function trimTo(text: string, to = 100) {
  return text.length < to ? text : `${text.slice(0, to)}...`;
}

export function copyToClipboard(text: string) {
  return navigator.clipboard.writeText(text);
}
