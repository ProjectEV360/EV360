import { Link, useLocation } from "@tanstack/react-router";
import { Zap, Map, Heart, User, LogIn, Menu, X } from "lucide-react";
import { useState } from "react";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { to: "/", label: "Home", icon: Zap },
  { to: "/map", label: "Map", icon: Map },
] as const;

interface NavbarProps {
  hideNavLinks?: boolean;
}

export function Navbar({ hideNavLinks = false }: NavbarProps = {}) {
  const { user } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center group py-1" id="nav-logo" aria-label="EV360 Home">
          <img
            src="/logo.png"
            alt="EV360 - One App. Every Charger."
            className="h-9 w-auto max-w-[150px] object-contain transition-transform group-hover:scale-105 dark:hidden"
          />
          <img
            src="/logo-dark.png"
            alt="EV360 - One App. Every Charger."
            className="hidden h-9 w-auto max-w-[150px] object-contain transition-transform group-hover:scale-105 dark:block"
          />
        </Link>

        {/* Desktop Nav */}
        {!hideNavLinks && (
          <div className="hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                id={`nav-${label.toLowerCase()}`}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive(to)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
            {user && (
              <Link
                to="/profile"
                id="nav-favourites-desktop"
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive("/profile")
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <Heart className="h-4 w-4" />
                Favourites
              </Link>
            )}
          </div>
        )}

        {/* Right side */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <Link to="/profile" id="nav-profile">
              <Button variant="ghost" size="icon" className="rounded-full">
                <User className="h-5 w-5" />
              </Button>
            </Link>
          ) : (
            <Link to="/login" id="nav-login">
              <Button
                size="sm"
                className="hidden gap-1.5 rounded-full bg-gradient-primary shadow-glow hover:opacity-90 md:inline-flex"
              >
                <LogIn className="h-4 w-4" />
                Sign In
              </Button>
              <Button variant="ghost" size="icon" className="rounded-full md:hidden">
                <LogIn className="h-5 w-5" />
              </Button>
            </Link>
          )}
          {/* Mobile hamburger */}
          {(!hideNavLinks || user) && (
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full md:hidden"
              onClick={() => setMobileOpen((o) => !o)}
              id="nav-mobile-toggle"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          )}
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (!hideNavLinks || user) && (
        <div className="border-t border-border/50 bg-background/95 backdrop-blur-xl md:hidden animate-in slide-in-from-top-2 duration-200">
          <div className="mx-auto max-w-7xl space-y-1 px-4 py-3">
            {!hideNavLinks &&
              NAV_ITEMS.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive(to)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}
            {user && (
              <Link
                to="/profile"
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive("/profile")
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <Heart className="h-4 w-4" />
                Favourites
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
