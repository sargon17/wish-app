// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import PortalRequestControls from "./PortalRequestControls";

vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));

afterEach(cleanup);

describe("PortalRequestControls", () => {
  it("toggles statuses and exposes sort state semantically", () => {
    const onStatusesChange = vi.fn();
    const onSortChange = vi.fn();
    render(
      <PortalRequestControls
        statuses={[{ _id: "status-1", displayName: "Planned" }] as never}
        selectedStatuses={["status-1"] as never}
        selectedSort="newest"
        onStatusesChange={onStatusesChange}
        onSortChange={onSortChange}
        onDateRangeChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Planned" }));
    expect(onStatusesChange).toHaveBeenCalledWith([]);
    expect(screen.getByRole("button", { name: "Newest" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "Top voted" }));
    expect(onSortChange).toHaveBeenCalledWith("top");
  });
});
