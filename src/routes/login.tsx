import { createFileRoute } from "@tanstack/react-router";
import { AuthCard } from "@/components/AuthCard";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Sign In & Create Account — EV360" },
      {
        name: "description",
        content:
          "Sign in or create an account on EV360 to save favourite chargers and manage your vehicle.",
      },
    ],
  }),
});

function LoginPage() {
  return <AuthCard defaultTab="login" />;
}
