// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import DashboardProjectCard from "./DashboardProjectCard";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: React.ComponentProps<"a">) =>
    React.createElement("a", props, children),
}));
vi.mock("@/components/Organisms/CopyButton", () => ({
  default: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("button", null, children ?? "Copy"),
}));
vi.mock("@/components/project/ProjectSettings", () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("./DashboardProjectCardActions", () => ({
  default: () => React.createElement("button", null, "Project actions"),
}));

afterEach(cleanup);

function project(overrides = {}) {
  return {
    _id: "project-1",
    _creationTime: 1,
    title: "Mobile app",
    user: "user-1",
    projectSlug: "mobile-app",
    ...overrides,
  } as never;
}

describe("DashboardProjectCard", () => {
  it("offers public actions for a published portal", () => {
    render(
      React.createElement(DashboardProjectCard, {
        project: project({ suggestionPortalPublishedAt: 1_750_000_000_000 }),
      }),
    );

    expect(screen.getByText("Published")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Copy link" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open portal" }).getAttribute("href")).toBe(
      "/p/mobile-app",
    );
  });

  it("routes an unpublished portal to its existing settings control", () => {
    render(React.createElement(DashboardProjectCard, { project: project() }));

    expect(screen.getByText("Unpublished")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Publish portal" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Open portal" })).toBeNull();
  });
});
