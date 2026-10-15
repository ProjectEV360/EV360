import { Moon, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

/* ─── View Transition Timing Constants ──────────────────────────────
   Duration: 500ms (within 300-700ms rule)
   Easing: ease-out (circular wave expanding from toggle button origin)
   Fallback: Plain CSS fade when View Transitions API is not supported
             or when prefers-reduced-motion is active.
   ──────────────────────────────────────────────────────────────────── */
export const VIEW_TRANSITION_DURATION_MS = 500;
export const VIEW_TRANSITION_EASING = "ease-out";

export function ThemeToggle() {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      localStorage.getItem("theme") === "dark" ||
      (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches)
    );
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  const toggleTheme = () => {
    // Check for View Transitions API support and reduced motion preference
    const isReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const doc = document as unknown as {
      startViewTransition?: (callback: () => void) => { ready: Promise<void> };
    };

    if (!doc.startViewTransition || isReducedMotion) {
      // Fallback: synchronous switch with plain CSS fade
      setDark((d) => !d);
      return;
    }

    const rect = buttonRef.current?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top + rect.height / 2 : 0;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );

    const transition = doc.startViewTransition(() => {
      setDark((d) => !d);
    });

    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`],
        },
        {
          duration: VIEW_TRANSITION_DURATION_MS,
          easing: VIEW_TRANSITION_EASING,
          pseudoElement: "::view-transition-new(root)",
        },
      );
    });
  };

  return (
    <Button
      ref={buttonRef}
      id="theme-toggle"
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="rounded-full transition-transform duration-300 hover:scale-105 active:scale-95"
    >
      {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  );
}
