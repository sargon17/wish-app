import { useEffect } from "react";

// The event carries state only. Project keys and requester data stay in the page.
export function useEmbedContentState(
  destination: string,
  state: "ready" | "empty" | "error" | undefined,
  version?: string,
) {
  useEffect(() => {
    if (!state) return;
    const detail = { destination, state, ...(version ? { version } : {}) };
    window.dispatchEvent(new CustomEvent("wish:content", { detail }));
    const bridge = (
      window as Window & {
        webkit?: {
          messageHandlers?: { wishContent?: { postMessage: (message: unknown) => void } };
        };
      }
    ).webkit?.messageHandlers?.wishContent;
    bridge?.postMessage(detail);
  }, [destination, state, version]);
}
