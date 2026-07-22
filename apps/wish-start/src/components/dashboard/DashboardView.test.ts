// @vitest-environment jsdom

import useProjects from "#/hooks/useProjects";
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import DashboardView from "./DashboardView";

vi.mock("#/hooks/useProjects", () => ({ default: vi.fn() }));
vi.mock("@/components/project/CreateProjectDialog", () => ({
  CreateProjectButton: () => React.createElement("button", null, "Create Project"),
}));
vi.mock("./DashboardProjectCard", () => ({
  default: ({ project }: { project: { title: string } }) =>
    React.createElement("article", null, project.title),
}));

afterEach(cleanup);

describe("DashboardView", () => {
  it("announces the loading state", () => {
    vi.mocked(useProjects).mockReturnValue({ projects: undefined, isPending: true, error: null });

    render(React.createElement(DashboardView));

    expect(screen.getByLabelText("Loading projects")).toBeTruthy();
  });

  it("shows a retryable error state", () => {
    vi.mocked(useProjects).mockReturnValue({
      projects: undefined,
      isPending: false,
      error: new Error("offline"),
    });

    render(React.createElement(DashboardView));

    expect(screen.getByText("Projects could not be loaded")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
  });

  it("shows first-project onboarding when the list is empty", () => {
    vi.mocked(useProjects).mockReturnValue({ projects: [], isPending: false, error: null });

    render(React.createElement(DashboardView));

    expect(screen.getByText("Create your first Project")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Create Project" })).toBeTruthy();
  });
});
