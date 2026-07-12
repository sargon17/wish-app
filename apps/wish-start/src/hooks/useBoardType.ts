import type { BoardType } from "#/lib/requestBoard/boardType";

import { useLocalStorage } from "./useLocalStorage";

export function useBoardType() {
  const [type, setType] = useLocalStorage<BoardType>("board-type", "table");

  const switchTo = (type: BoardType) => {
    setType(type);
  };

  return {
    type,
    switchTo,
  };
}
