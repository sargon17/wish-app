// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import RequestSubmissionControls from "./RequestSubmissionControls";

vi.mock("@/components/ui/dialog", () => ({
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogClose: ({ children }: { children: React.ReactNode }) => children,
}));

afterEach(cleanup);

describe("RequestSubmissionControls", () => {
  it("locks submission controls while creating", () => {
    render(<RequestSubmissionControls isSubmitting isEditMode={false} />);

    expect((screen.getByRole("button", { name: "Creating…" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect((screen.getByRole("button", { name: "Cancel" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it("announces mutation errors", () => {
    render(
      <RequestSubmissionControls
        isSubmitting={false}
        isEditMode={false}
        errorMessage="Unable to create the request"
      />,
    );

    expect(screen.getByRole("alert").textContent).toBe("Unable to create the request");
  });
});
