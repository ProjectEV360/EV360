import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Mock TanStack Router
const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    id,
    className,
  }: {
    children?: React.ReactNode;
    to: string;
    id?: string;
    className?: string;
  }) => (
    <a href={to} id={id} className={className}>
      {children}
    </a>
  ),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: "/" }),
  createFileRoute: () => () => ({}),
}));

// Mock useAuth
const mockUser = vi.fn();
const mockLoading = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: mockUser(),
    loading: mockLoading(),
  }),
}));

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Landing Page CTA Buttons", () => {
  it("has only the 'Get Started' button and completely removes 'Explore Map'", async () => {
    const { LandingPage } = await import("@/routes/index");
    const queryClient = new QueryClient();

    mockUser.mockReturnValue(null);
    mockLoading.mockReturnValue(false);

    render(
      <QueryClientProvider client={queryClient}>
        <LandingPage />
      </QueryClientProvider>,
    );

    // Assert "Explore Map" button is completely removed
    expect(screen.queryByText(/Explore Map/i)).toBeNull();
    expect(document.getElementById("hero-explore-map")).toBeNull();

    // Assert "Get Started" button is present as the only primary hero CTA
    const getStartedBtn = document.getElementById("hero-get-started");
    expect(getStartedBtn).not.toBeNull();
    expect(getStartedBtn?.textContent).toContain("Get Started");

    // Assert it links directly to the authentication page (/login)
    const heroLink = getStartedBtn?.closest("a");
    expect(heroLink?.getAttribute("href")).toBe("/login");

    // Assert it is centered and has primary button styling
    const ctaContainer = heroLink?.parentElement;
    expect(ctaContainer?.className).toContain("justify-center");
    expect(getStartedBtn?.className).toContain("bg-gradient-primary");
    expect(getStartedBtn?.className).toContain("rounded-full");
  });
});

describe("Route Protection", () => {
  it("redirects unauthenticated users to /login when accessing protected routes", () => {
    mockUser.mockReturnValue(null);
    mockLoading.mockReturnValue(false);

    render(
      <ProtectedRoute fallbackMessage="Please sign in to access the map" redirectTo="/login">
        <div data-testid="protected-content">Secret Map Data</div>
      </ProtectedRoute>,
    );

    // Protected content is NOT rendered
    expect(screen.queryByTestId("protected-content")).toBeNull();
    expect(screen.getByText("Verifying authentication...")).toBeInTheDocument();

    // Redirects to /login
    expect(mockNavigate).toHaveBeenCalledWith({ to: "/login" });
  });

  it("renders protected content when user is authenticated", () => {
    mockUser.mockReturnValue({ id: "user-123", email: "user@example.com" });
    mockLoading.mockReturnValue(false);

    render(
      <ProtectedRoute fallbackMessage="Please sign in to access the map">
        <div data-testid="protected-content">Secret Map Data</div>
      </ProtectedRoute>,
    );

    // Protected content IS rendered
    expect(screen.getByTestId("protected-content")).toBeInTheDocument();
    expect(screen.getByText("Secret Map Data")).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

describe("Dynamic Landing Stats Cards", () => {
  it("renders dynamic stat cards with counts, live indicator, and map links", async () => {
    const { LandingPage } = await import("@/routes/index");
    const queryClient = new QueryClient();

    mockUser.mockReturnValue(null);
    mockLoading.mockReturnValue(false);

    render(
      <QueryClientProvider client={queryClient}>
        <LandingPage />
      </QueryClientProvider>,
    );

    // Assert stat labels are present
    expect(screen.getByText("Stations")).toBeInTheDocument();
    expect(screen.getByText("Connectors")).toBeInTheDocument();
    expect(screen.getByText("Available Now")).toBeInTheDocument();
    expect(screen.getByText("Cities")).toBeInTheDocument();

    // Assert live pulse indicator on Available Now card
    expect(screen.getByText("LIVE")).toBeInTheDocument();

    // Assert all stat cards link to /map
    const mapLinks = screen.getAllByRole("link").filter((el) => el.getAttribute("href") === "/map");
    expect(mapLinks.length).toBeGreaterThanOrEqual(4);
  });
});
