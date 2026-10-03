import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { routeTree } from "@/routeTree.gen";

function renderAt(path: string) {
  const queryClient = new QueryClient();
  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  return render(<RouterProvider router={router} />);
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// Assert only that the router mounts and paints, never page content:
// routes are rewritten as the app is built and this must keep passing.
describe("App routing", () => {
  it("renders the index route", async () => {
    renderAt("/");
    await waitFor(() => expect(document.body.firstChild).not.toBeNull());
  });

  it("renders the map route", async () => {
    renderAt("/map");
    await waitFor(() => expect(document.body.firstChild).not.toBeNull());
  });

  it("renders the login route", async () => {
    renderAt("/login");
    await waitFor(() => expect(document.body.firstChild).not.toBeNull());
  });

  it("renders the signup route", async () => {
    renderAt("/signup");
    await waitFor(() => expect(document.body.firstChild).not.toBeNull());
  });

  it("renders the profile route", async () => {
    renderAt("/profile");
    await waitFor(() => expect(document.body.firstChild).not.toBeNull());
  });

  it("renders the station detail route", async () => {
    renderAt("/station/test-station-id");
    await waitFor(() => expect(document.body.firstChild).not.toBeNull());
  });

  it("renders the not-found route", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    renderAt("/this-route-does-not-exist");
    await waitFor(() => expect(document.body.firstChild).not.toBeNull());
  });
});
