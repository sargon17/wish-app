import { useRef, useState } from "react";

// Guards against double-submit (the disabled state has a render-cycle gap) and tracks loading.
export function useAsyncAction() {
  const isRunning = useRef(false);
  const [isLoading, setLoading] = useState(false);

  async function execute(action: () => Promise<void>) {
    if (isRunning.current) return;
    isRunning.current = true;
    setLoading(true);

    try {
      await action();
    } finally {
      isRunning.current = false;
      setLoading(false);
    }
  }

  return { isLoading, execute };
}
