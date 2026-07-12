import { SquareKanban, Table } from "lucide-react";

export const boardTypeValues = [
  { type: "kanban", label: "Kanban", icon: SquareKanban },
  { type: "table", label: "Table", icon: Table },
] as const;

export type BoardType = (typeof boardTypeValues)[number]["type"];
