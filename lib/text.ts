interface TrimToProps {
  text: string
  to?: number
}

export function trimTo({ text, to = 100 }: TrimToProps) {
  if (text.length < to)
    return text

  return `${text.slice(0, to)}...`
}

interface CopyToClipboardProps {
  text: string
  onSuccess?: () => void
  onFail?: () => void
}

export function copyToClipboard({ text, onSuccess, onFail }: CopyToClipboardProps) {
  navigator.clipboard.writeText(text)
    .then(() => onSuccess && onSuccess())
    .catch(() => onFail && onFail())
}
