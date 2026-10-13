import { createFileRoute } from "@tanstack/react-router";
import { AuthCard } from "@/components/AuthCard";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
  head: () => ({
    meta: [
      { title: "Create Account — EV360" },
      {
        name: "description",
        content: "Create a new EV360 account to access real-time charging and saved stations.",
      },
    ],
  }),
});

function SignupPage() {
  return <AuthCard defaultTab="register" />;
}
