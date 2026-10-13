import { type ReactNode, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";

interface ProtectedRouteProps {
  children: ReactNode;
  fallbackMessage?: string;
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  fallbackMessage = "Please sign in to continue",
  redirectTo = "/login",
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      toast.info(fallbackMessage);
      navigate({ to: redirectTo });
    }
  }, [loading, user, navigate, fallbackMessage, redirectTo]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 pt-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
