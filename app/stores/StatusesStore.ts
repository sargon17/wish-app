import { createStore } from "zustand";

import type { Doc } from "@/convex/_generated/dataModel";

// export interface StatusState extends Doc<'requestStatuses'> {
// }

export type StatusesState = Doc<"requestStatuses">[];

export interface StatusesStore {
  values: StatusesState;
  add: (payload: StatusesState) => void;
}

export const defaultInitialState: StatusesState = [];

export function createStatusesStore(initialState: StatusesState = defaultInitialState) {
  return createStore<StatusesStore>()((set) => ({
    values: initialState,
    add: (payload) => set((state) => ({ values: [...state.values, ...payload] })),
  }));
}
