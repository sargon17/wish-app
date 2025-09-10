interface TrimToProps {
  text: string
  to?: number
}

export function trimTo({ text, to = 100 }: TrimToProps) {
  if (text.length < to)
    return text

  return `${text.slice(0, to)}...`
}
