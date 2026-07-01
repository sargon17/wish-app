import { useRef, useState } from "react";


interface ExecuteCallbacks<T> {
  onSuccess: (data: T) => void;
  onError: (error: any) => void;
}

export function useAsyncAction() {
  const isRunning = useRef(false)
  const [isLoading, setLoading] = useState(false);

  const execute = async <T>(
    action: () => Promise<T>,
    callbacks: ExecuteCallbacks<T>
  ) => {
    if (isRunning.current) return;
    isRunning.current = true;
    setLoading(true)

    try {
      const result = await action();
      callbacks.onSuccess(result);
    } catch (err: any) {
      callbacks.onError(err);
    } finally {
      isRunning.current = false;
      setLoading(false);
    }
  }

  return {
    isLoading,
    execute,
  }
}
