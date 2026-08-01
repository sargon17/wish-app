// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vite-plus/test";

const actions = vi.hoisted(() => ({
  check: vi.fn(),
  send: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  useLocation: () => ({ pathname: "/dashboard/project/project/slug/requests", searchStr: "" }),
  useRouter: () => ({ history: { push: vi.fn() } }),
}));

vi.mock("@wish/convex-backend/api", () => ({
  api: {
    workItemHandoffs: {
      check: "check",
      getSurface: "getSurface",
      send: "send",
    },
  },
}));

vi.mock("convex/react", () => ({
  useAction: (reference: string) => actions[reference as "check" | "send"],
  useQuery: (_reference: string, arguments_: { provider: "github" | "linear" }) => ({
    connection: {
      destinationLabel: arguments_.provider === "github" ? "wish/repo" : "WISH",
      health: "active",
    },
    handoff: null,
  }),
}));

import WorkItemHandoffAction from "./WorkItemHandoffAction";

beforeAll(() => {
  Object.defineProperty(window, "PointerEvent", { value: MouseEvent });
  Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", {
    value: () => false,
  });
  Object.defineProperty(HTMLElement.prototype, "setPointerCapture", {
    value: () => undefined,
  });
  Object.defineProperty(HTMLElement.prototype, "releasePointerCapture", {
    value: () => undefined,
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("WorkItemHandoffAction", () => {
  it("keeps a provider disabled after the menu closes while its send is pending", async () => {
    let finishSend = () => {};
    actions.send.mockImplementation(
      () => new Promise<void>((resolve) => {
        finishSend = resolve;
      }),
    );

    render(
      <WorkItemHandoffAction
        request={{ _id: "request", project: "project" } as never}
      />,
    );

    fireEvent.pointerDown(screen.getByRole("button", { name: /work trackers/i }), {
      button: 0,
      ctrlKey: false,
    });
    const firstGitHubItem = (await screen.findByText("GitHub Issues")).closest(
      '[role="menuitem"]',
    );
    expect(firstGitHubItem).not.toBeNull();
    fireEvent.keyDown(firstGitHubItem!, { key: "Enter" });

    await waitFor(() => expect(actions.send).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByText("GitHub Issues")).toBeNull());

    fireEvent.pointerDown(screen.getByRole("button", { name: /work trackers/i }), {
      button: 0,
      ctrlKey: false,
    });
    const reopenedGitHubItem = (await screen.findByText("GitHub Issues")).closest(
      '[role="menuitem"]',
    );
    expect(reopenedGitHubItem?.hasAttribute("data-disabled")).toBe(true);
    fireEvent.keyDown(reopenedGitHubItem!, { key: "Enter" });
    expect(actions.send).toHaveBeenCalledTimes(1);

    finishSend();
  });
});
