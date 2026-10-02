import { useCallback, useEffect, useRef, useState } from "react";

import { EmbedApiError } from "@/lib/embedApi";

export function useEmbedResource<T>(loader: (signal: AbortSignal) => Promise<T>) {
  const [data, setData] = useState<T | undefined>();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mounted = useRef(false);
  const currentLoader = useRef(loader);
  const active = useRef<{ controller: AbortController; promise: Promise<void> } | null>(null);

  const reload = useCallback(
    (invalidate = false) => {
      if (!mounted.current || currentLoader.current !== loader) return Promise.resolve();
      if (active.current && !invalidate) return active.current.promise;
      active.current?.controller.abort();

      const controller = new AbortController();
      setLoadError(null);
      setIsLoading(true);
      const promise = (async () => {
        try {
          const nextData = await loader(controller.signal);
          if (!controller.signal.aborted) setData(nextData);
        } catch (error) {
          if (controller.signal.aborted) return;
          // An authorization failure must remove content from this identity.
          if (
            error instanceof EmbedApiError &&
            !["network_error", "internal_error"].includes(error.code)
          ) {
            setData(undefined);
          }
          setLoadError(error instanceof Error ? error.message : "Something went wrong.");
        } finally {
          if (!controller.signal.aborted) {
            active.current = null;
            setIsLoading(false);
          }
        }
      })();
      active.current = { controller, promise };
      return promise;
    },
    [loader],
  );

  useEffect(() => {
    mounted.current = true;
    currentLoader.current = loader;
    setData(undefined);
    void reload();
    return () => {
      mounted.current = false;
      active.current?.controller.abort();
      active.current = null;
    };
  }, [loader, reload]);

  return { data, setData, loadError, isLoading, reload };
}
