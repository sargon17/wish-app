// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import RequestDeepLink from "./RequestDeepLink";

const mocks = vi.hoisted(() => ({
  location: {
    pathname: "/dashboard/project/project-1/example/requests",
    searchStr: "?item=request-1&settings=work-trackers",
  },
  replace: vi.fn(),
  toastError: vi.fn(),
  useRequests: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  useLocation: () => mocks.location,
  useRouter: () => ({ history: { replace: mocks.replace } }),
}));

vi.mock("sonner", () => ({ toast: { error: mocks.toastError } }));

vi.mock("@/hooks/useRequests", () => ({
  default: (...args: unknown[]) => mocks.useRequests(...args),
}));

vi.mock("./RequestDeatailView", () => ({
  default: ({
    request,
    onOpenChange,
  }: {
    request: { text: string };
    onOpenChange: (open: boolean) => void;
  }) => (
    <button type="button" onClick={() => onOpenChange(false)}>
      {request.text}
    </button>
  ),
}));

afterEach(cleanup);

beforeEach(() => {
  mocks.replace.mockReset();
  mocks.toastError.mockReset();
  mocks.useRequests.mockReset();
  mocks.location.pathname = "/dashboard/project/project-1/example/requests";
  mocks.location.searchStr = "?item=request-1&settings=work-trackers";
});

describe("RequestDeepLink", () => {
  it("opens the matching item and removes only item when closed", () => {
    mocks.useRequests.mockReturnValue({
      value: [{ _id: "request-1", text: "Matching request" }],
      isPending: false,
      error: null,
    });

    render(<RequestDeepLink projectId={"project-1" as never} itemId="request-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Matching request" }));
    expect(mocks.replace).toHaveBeenCalledWith(
      "/dashboard/project/project-1/example/requests?settings=work-trackers",
    );
    expect(mocks.useRequests).toHaveBeenCalledWith("project-1", undefined);
  });

  it("removes a malformed item immediately", async () => {
    mocks.useRequests.mockReturnValue({ value: undefined, isPending: true, error: null });

    render(<RequestDeepLink projectId={"project-1" as never} itemId={null} />);

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledTimes(1));
    expect(mocks.toastError).toHaveBeenCalledWith("Request not found");
  });

  it("removes an item absent from the selected project and kind", async () => {
    mocks.useRequests.mockReturnValue({ value: [], isPending: false, error: null });

    render(
      <RequestDeepLink
        projectId={"project-1" as never}
        itemId="complaint-from-another-source"
        kind="complaint"
      />,
    );

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledTimes(1));
    expect(mocks.toastError).toHaveBeenCalledWith("Complaint not found");
    expect(mocks.useRequests).toHaveBeenCalledWith("project-1", "complaint");
  });

  it("keeps the item parameter when the query fails", () => {
    mocks.useRequests.mockReturnValue({
      value: undefined,
      isPending: false,
      error: new Error("network unavailable"),
    });

    render(<RequestDeepLink projectId={"project-1" as never} itemId="request-1" />);

    expect(mocks.replace).not.toHaveBeenCalled();
    expect(mocks.toastError).not.toHaveBeenCalled();
  });
});
