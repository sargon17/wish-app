import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/p/$projectSlug")({
  component: Outlet,
});
