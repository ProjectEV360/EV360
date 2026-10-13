import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthCard } from "@/components/AuthCard";

// Mock TanStack Router
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    ...props
  }: {
    children?: React.ReactNode;
    to: string;
    [key: string]: unknown;
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
}));

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ data: {}, error: null }),
      signUp: vi.fn().mockResolvedValue({ data: {}, error: null }),
      signInWithOAuth: vi.fn().mockResolvedValue({ data: {}, error: null }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
  },
}));

beforeEach(() => {
  document.body.style.pointerEvents = "auto";
  document.body.removeAttribute("data-scroll-locked");
});

afterEach(() => {
  cleanup();
  document.body.style.pointerEvents = "auto";
  document.body.removeAttribute("data-scroll-locked");
  vi.restoreAllMocks();
});

describe("AuthCard Component", () => {
  it("renders the Sign In tab by default with Google and email login", () => {
    render(<AuthCard defaultTab="login" />);

    expect(screen.getByRole("tab", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByText(/welcome back to ev360/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue with google/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
  });

  it("switches to Create Account tab when clicked", async () => {
    render(<AuthCard defaultTab="login" />);

    const registerTab = screen.getByRole("tab", { name: /create account/i });
    fireEvent.click(registerTab);

    await waitFor(() => {
      expect(screen.getByText(/create your ev360 account/i)).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mobile number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  it("validates empty required fields on Create Account submit", async () => {
    const { container } = render(<AuthCard defaultTab="register" />);

    const submitBtn = container.querySelector("#email-signup-btn");
    expect(submitBtn).not.toBeNull();
    fireEvent.click(submitBtn!);

    await waitFor(() => {
      expect(
        screen.getByText(/please enter your full name \(minimum 2 characters\)/i),
      ).toBeInTheDocument();
    });
  });

  it("shows error when password and confirm password do not match", async () => {
    const { container } = render(<AuthCard defaultTab="register" />);

    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: "John Doe" },
    });
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "john@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/mobile number/i), {
      target: { value: "9876543210" },
    });
    fireEvent.change(container.querySelector("#reg-password")!, {
      target: { value: "secret1234" },
    });
    fireEvent.change(container.querySelector("#reg-confirm-password")!, {
      target: { value: "differentPassword" },
    });

    const submitBtn = container.querySelector("#email-signup-btn");
    fireEvent.click(submitBtn!);

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  it("opens the forgot password dialog when clicking forgot password", async () => {
    const { container } = render(<AuthCard defaultTab="login" />);

    const forgotBtn = screen.getByText(/forgot password\?/i);
    fireEvent.click(forgotBtn);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /reset your password/i })).toBeInTheDocument();
    });
  });
});
