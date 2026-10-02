// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ComponentType } from "react";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

const state = vi.hoisted(() => ({
  search: {
    projectId: "project-1",
    clientId: "user-1",
    clientKey: "key-1",
    view: "whats-new",
    appVersion: "2.0.0",
  },
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({ options, useSearch: () => state.search }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
import { Route } from "./embed";

const Page = Route.options.component as ComponentType;
const entry = { versionLabel: "2.0.0", title: "Release ready", type: "feature", features: [] };
const response = (payload: unknown) => ({ ok: true, json: async () => payload });
function deferred() {
  let resolve!: (value: ReturnType<typeof response>) => void;
  const promise = new Promise<ReturnType<typeof response>>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

beforeEach(() => {
  vi.stubEnv("VITE_CONVEX_URL", "https://benchmark.convex.cloud");
});

afterEach(() => {
  vi.clearAllMocks();
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  state.search.clientId = "user-1";
  state.search.view = "whats-new";
});

describe("embed loading behavior", () => {
  it.each([undefined, "invalid-url", "javascript:alert(1)"])(
    "shows a configuration error without fetching for an invalid public API URL (%s)",
    (baseUrl) => {
      vi.stubEnv("VITE_CONVEX_URL", baseUrl);
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);
      const messages: unknown[] = [];
      const listener = (event: Event) => messages.push((event as CustomEvent).detail);
      window.addEventListener("wish:content", listener);
      render(<Page />);
      expect(screen.getByText("Feedback is unavailable")).toBeTruthy();
      expect(fetchMock).not.toHaveBeenCalled();
      expect(messages).toEqual([{ destination: "whats-new", state: "error", version: "2.0.0" }]);
      window.removeEventListener("wish:content", listener);
    },
  );

  it("signals ready only after release content is present, with one lookup", async () => {
    const pending = deferred();
    const fetchMock = vi.fn().mockReturnValue(pending.promise);
    vi.stubGlobal("fetch", fetchMock);
    const messages: unknown[] = [];
    const listener = (event: Event) => messages.push((event as CustomEvent).detail);
    window.addEventListener("wish:content", listener);
    render(<Page />);
    expect(messages).toEqual([]);
    await act(async () => {
      pending.resolve(response({ entry }));
    });
    expect(screen.getByText("Release ready")).toBeTruthy();
    expect(messages).toEqual([{ destination: "whats-new", state: "ready", version: "2.0.0" }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    window.removeEventListener("wish:content", listener);
  });

  it("cancels the old requester load and ignores a late old response", async () => {
    const old = deferred();
    const current = deferred();
    const fetchMock = vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
    vi.stubGlobal("fetch", fetchMock);
    const view = render(<Page />);
    state.search.clientId = "user-2";
    view.rerender(<Page />);
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
    await act(async () => {
      current.resolve(response({ entry: { ...entry, title: "Current release" } }));
    });
    await act(async () => {
      old.resolve(response({ entry: { ...entry, title: "Old release" } }));
    });
    expect(screen.getByText("Current release")).toBeTruthy();
    expect(screen.queryByText("Old release")).toBeNull();
  });

  it("keeps request content visible while a submitted request refreshes the list", async () => {
    state.search.view = "requests";
    const refresh = deferred();
    let listReads = 0;
    const fetchMock = vi.fn((url: string, init: RequestInit) => {
      if (url.endsWith("/requests/")) {
        listReads += 1;
        return listReads === 1
          ? Promise.resolve(
              response({ requests: [{ _id: "r1", _creationTime: 0, text: "Existing request" }] }),
            )
          : refresh.promise;
      }
      if (init.method === "POST") return Promise.resolve(response({}));
      return Promise.resolve(response({ upvotes: [] }));
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<Page />);
    await screen.findByText("Existing request");
    fireEvent.click(screen.getByRole("button", { name: "New request" }));
    fireEvent.change(screen.getByPlaceholderText("What would you like to see?"), {
      target: { value: "Another request" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit request" }));
    await waitFor(() => expect(listReads).toBe(2));
    expect(screen.getByText("Existing request")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("Updating");
    await act(async () => {
      refresh.resolve(
        response({ requests: [{ _id: "r1", _creationTime: 0, text: "Existing request" }] }),
      );
    });
  });

  it("blocks a repeated vote until the first server response returns", async () => {
    state.search.view = "requests";
    const mutation = deferred();
    const fetchMock = vi.fn((url: string, init: RequestInit) => {
      if (init.method === "POST") return mutation.promise;
      return Promise.resolve(
        response(
          url.endsWith("/requests/")
            ? { requests: [{ _id: "r1", _creationTime: 0, text: "Vote request", upvoteCount: 0 }] }
            : { upvotes: [] },
        ),
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<Page />);
    await screen.findByText("Vote request");
    const vote = screen.getByRole("button", { name: "0" });
    fireEvent.click(vote);
    fireEvent.click(vote);
    expect((vote as HTMLButtonElement).disabled).toBe(true);
    expect(fetchMock.mock.calls.filter(([, init]) => init.method === "POST")).toHaveLength(1);
    await act(async () => {
      mutation.resolve(response({}));
    });
    expect((vote as HTMLButtonElement).disabled).toBe(false);
  });

  it("keeps a pending vote when another vote fails, then reconciles the batch once", async () => {
    state.search.view = "requests";
    const firstVote = deferred();
    let rejectSecond!: (error: Error) => void;
    const secondVote = new Promise<Response>((_, reject) => {
      rejectSecond = reject;
    });
    let firstCommitted = false;
    let reads = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, init: RequestInit) => {
        if (init.method === "POST") return url.includes("/r1/") ? firstVote.promise : secondVote;
        if (url.endsWith("/requests/")) {
          reads += 1;
          return Promise.resolve(
            response({
              requests: [
                {
                  _id: "r1",
                  _creationTime: 0,
                  text: "First vote",
                  upvoteCount: firstCommitted ? 1 : 0,
                },
                { _id: "r2", _creationTime: 0, text: "Second vote", upvoteCount: 0 },
              ],
            }),
          );
        }
        return Promise.resolve(response({ upvotes: firstCommitted ? ["r1"] : [] }));
      }),
    );
    render(<Page />);
    await screen.findByText("First vote");
    const first = within(screen.getByText("First vote").closest("article")!);
    const second = within(screen.getByText("Second vote").closest("article")!);
    fireEvent.click(first.getByRole("button", { name: "0" }));
    fireEvent.click(second.getByRole("button", { name: "0" }));
    await act(async () => {
      rejectSecond(new Error("Rejected second vote"));
    });
    expect(first.getByRole("button", { name: "1" }).getAttribute("aria-pressed")).toBe("true");
    expect(second.getByRole("button", { name: "0" }).getAttribute("aria-pressed")).toBe("false");
    expect(reads).toBe(1);
    firstCommitted = true;
    await act(async () => {
      firstVote.resolve(response({}));
    });
    await waitFor(() => expect(reads).toBe(2));
    expect(first.getByRole("button", { name: "1" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("does not fetch with an old key or show an old mutation error after the requester changes", async () => {
    state.search.view = "requests";
    const firstVote = deferred();
    let rejectSecond!: (error: Error) => void;
    const secondVote = new Promise<Response>((_, reject) => {
      rejectSecond = reject;
    });
    const fetchMock = vi.fn((url: string, init: RequestInit) => {
      if (init.method === "POST") return url.includes("/r1/") ? firstVote.promise : secondVote;
      return Promise.resolve(
        response(
          url.endsWith("/requests/")
            ? {
                requests: [
                  { _id: "r1", _creationTime: 0, text: "First request", upvoteCount: 0 },
                  { _id: "r2", _creationTime: 0, text: "Second request", upvoteCount: 0 },
                ],
              }
            : { upvotes: [] },
        ),
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    const view = render(<Page />);
    await screen.findByText("First request");
    fireEvent.click(
      within(screen.getByText("First request").closest("article")!).getByRole("button", {
        name: "0",
      }),
    );
    fireEvent.click(
      within(screen.getByText("Second request").closest("article")!).getByRole("button", {
        name: "0",
      }),
    );
    state.search.clientId = "new-requester";
    view.rerender(<Page />);
    await screen.findByText("First request");
    const beforeSettled = fetchMock.mock.calls.length;
    await act(async () => {
      rejectSecond(new Error("Old requester failure"));
      firstVote.resolve(response({}));
    });
    expect(fetchMock.mock.calls).toHaveLength(beforeSettled);
    expect(toast.error).not.toHaveBeenCalled();
    expect(
      within(screen.getByText("First request").closest("article")!)
        .getByRole("button", { name: "0" })
        .getAttribute("aria-pressed"),
    ).toBe("false");
  });
});
