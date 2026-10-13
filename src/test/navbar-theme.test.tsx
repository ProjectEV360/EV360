import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Navbar } from "@/components/Navbar";

// Mock router hooks
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    className,
    id,
    onClick,
  }: {
    children?: React.ReactNode;
    to: string;
    className?: string;
    id?: string;
    onClick?: () => void;
  }) => (
    <a href={to} className={className} id={id} onClick={onClick}>
      {children}
    </a>
  ),
  useLocation: () => ({ pathname: "/" }),
}));

// Mock useAuth
const mockUser = vi.fn();
vi.mock("@hooks/useAuth", () => ({
  useAuth: () => ({ user: mockUser(), loading: false }),
}));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: mockUser(), loading: false }),
}));

describe("ThemeToggle component", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
  });

  it("renders theme toggle button", () => {
    render(<ThemeToggle />);
    expect(screen.getByRole("button", { name: /toggle theme/i })).toBeInTheDocument();
  });

  it("toggles dark mode class on documentElement and updates localStorage", () => {
    render(<ThemeToggle />);
    const button = screen.getByRole("button", { name: /toggle theme/i });

    // Click to toggle
    fireEvent.click(button);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("theme")).toBe("dark");

    // Click again to toggle back
    fireEvent.click(button);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem("theme")).toBe("light");
  });
});

describe("Navbar component", () => {
  it("renders branding and primary navigation links for guest", () => {
    mockUser.mockReturnValue(null);
    render(<Navbar />);

    expect(screen.getAllByAltText(/EV360/i)[0]).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Home/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Map/i })).toBeInTheDocument();
    expect(screen.getByText("Sign In")).toBeInTheDocument();
  });

  it("renders profile link when user is logged in", () => {
    mockUser.mockReturnValue({ id: "user-123", email: "test@example.com" });
    render(<Navbar />);

    expect(screen.getByText("Favourites")).toBeInTheDocument();
    expect(screen.queryByText("Sign In")).not.toBeInTheDocument();
  });

  it("hides primary navigation links (Home, Map) when hideNavLinks is true", () => {
    mockUser.mockReturnValue(null);
    render(<Navbar hideNavLinks />);

    expect(screen.getAllByAltText(/EV360/i)[0]).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Home/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /Map/i })).toBeNull();
    expect(screen.getByText("Sign In")).toBeInTheDocument();
  });
});
