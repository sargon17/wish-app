import { useEffect, useState } from "react";

export function useLocalStorage<T>(key: string, initialValue?: T) {
  const [value, setValue] = useState<T>(() => {
    const stored = localStorage.getItem(key);

    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return initialValue;
      }
    }
    return initialValue;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [value, key]);

  return [value, setValue] as const;
}
