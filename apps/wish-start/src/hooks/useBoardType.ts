import type { BoardType } from "#/lib/requestBoard/boardType";
import { useState } from "react";


export function useBoardType() {
  const [type, setType] = useState<BoardType>("table")

  const switchTo = (type: BoardType) => {
    setType(type)
  }

  return {
    type,
    switchTo
  }

}
