import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  HeroHeadline,
  HERO_TOTAL_MS,
  STAGGER,
  StaggerFade,
} from "@/components/landing/HeroHeadline";
import { HeroGrid } from "@/components/landing/HeroGrid";

describe("Landing Hero Headline Animation", () => {
  it("renders accessible h1 with complete aria-label for screen readers", () => {
    render(<HeroHeadline />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveAttribute("aria-label", "Find Your Nearest Charging Station");
  });

  it("marks visual split words and charging station container with aria-hidden", () => {
    const { container } = render(<HeroHeadline />);
    const ariaHiddenSpans = container.querySelectorAll('[aria-hidden="true"]');
    // Words: "Find", "Your", "Nearest" + "Charging Station" container
    expect(ariaHiddenSpans.length).toBeGreaterThanOrEqual(4);
  });

  it("includes both base uncharged state and gradient fill for Charging Station", () => {
    const { container } = render(<HeroHeadline />);
    const base = container.querySelector(".hero-charging-base");
    const fill = container.querySelector(".hero-charging-fill");

    expect(base).not.toBeNull();
    expect(fill).not.toBeNull();
    expect(base?.textContent).toBe("Charging Station");
    expect(fill?.textContent).toBe("Charging Station");
  });

  it("has calibrated sequence timing that finishes in approximately 2.2s", () => {
    // Total sequence should complete around 2.2s (between 2.1s and 2.35s)
    expect(HERO_TOTAL_MS).toBeGreaterThanOrEqual(2100);
    expect(HERO_TOTAL_MS).toBeLessThanOrEqual(2350);

    // Pill and CTA staggered 100ms apart after subtitle
    expect(STAGGER.pill - STAGGER.subtitle).toBe(100);
    expect(STAGGER.cta - STAGGER.pill).toBe(100);
  });

  it("renders StaggerFade with configured delay and children", () => {
    render(
      <StaggerFade delayMs={1500} className="test-wrapper">
        <span data-testid="stagger-child">Hello</span>
      </StaggerFade>,
    );

    const child = screen.getByTestId("stagger-child");
    const wrapper = child.parentElement;
    expect(wrapper?.className).toContain("hero-stagger-item");
    expect(wrapper?.className).toContain("test-wrapper");
    expect(wrapper?.style.animationDelay).toBe("1500ms");
  });
});

describe("Landing Living Charging Grid", () => {
  it("renders an SVG network with accessible aria-hidden attribute", () => {
    const { container } = render(<HeroGrid />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg?.getAttribute("viewBox")).toBe("0 0 1000 600");
  });

  it("renders fixed layout of 20 nodes with mobile responsive classes", () => {
    const { container } = render(<HeroGrid />);
    const nodes = container.querySelectorAll(".hero-grid-node");
    expect(nodes.length).toBe(20);

    const desktopOnlyNodes = container.querySelectorAll(".hero-grid-node.hero-grid-desktop-only");
    expect(desktopOnlyNodes.length).toBe(5);
  });

  it("renders edges connecting the grid nodes and has a pulses layer", () => {
    const { container } = render(<HeroGrid />);
    const edges = container.querySelectorAll(".hero-grid-edge");
    expect(edges.length).toBeGreaterThan(20);

    const pulseLayer = container.querySelector("#hero-grid-pulses");
    expect(pulseLayer).not.toBeNull();
  });
});
