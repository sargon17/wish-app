"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useRef } from "react";
import { useStore } from "zustand";

import type { StatusesStore } from "@/app/stores/StatusesStore";
import { createStatusesStore } from "@/app/stores/StatusesStore";

export type StatusesStoreApi = ReturnType<typeof createStatusesStore>;

export const StatusesStoreContext = createContext<StatusesStoreApi | undefined>(undefined);

export interface StatusesStoreProviderProps {
  children: ReactNode;
}

export function StatusesStoreProvider({ children }: StatusesStoreProviderProps) {
  const storeRef = useRef<StatusesStoreApi | null>(null);
  if (storeRef.current === null) {
    storeRef.current = createStatusesStore();
  }

  return (
    <StatusesStoreContext.Provider value={storeRef.current}>
      {children}
    </StatusesStoreContext.Provider>
  );
}

export function useStatusesStore<T>(selector: (store: StatusesStore) => T): T {
  const statusesStoreContext = useContext(StatusesStoreContext);

  if (!statusesStoreContext) {
    throw new Error("useCounterStore must be used within CounterStoreProvider");
  }

  return useStore(statusesStoreContext, selector);
}
