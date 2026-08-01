// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

const routing = vi.hoisted(() => ({
  replace: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
  useLocation: () => ({
    pathname: "/dashboard",
    searchStr: "?settings=work-trackers&github=invalid_state",
  }),
  useParams: () => ({}),
  useRouter: () => ({ history: { replace: routing.replace } }),
}));

vi.mock("@/components/project/ProjectSettings", () => ({
  default: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

import { AppSidebar } from "./AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("AppSidebar Work Tracker callbacks", () => {
  it("shows no-project callback feedback and cleans its routing state on dismiss", () => {
    render(
      <SidebarProvider>
        <AppSidebar />
      </SidebarProvider>,
    );

    expect(screen.getByText("This GitHub connection link expired")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(routing.replace).toHaveBeenCalledWith("/dashboard");
  });
});
