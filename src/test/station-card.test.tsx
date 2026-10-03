import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StationCard } from "@/components/StationCard";
import type { Station } from "@/lib/types";

// Mock Link from @tanstack/react-router
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    params,
    className,
  }: {
    children?: React.ReactNode;
    to: string;
    params?: { id?: string };
    className?: string;
  }) => (
    <a href={`${to.replace("$id", params?.id || "")}`} className={className}>
      {children}
    </a>
  ),
}));

const testStation: Station = {
  id: "st-123",
  name: "PowerGrid Central",
  address: "42 MG Road, Indiranagar",
  city: "Bengaluru",
  lat: 12.9716,
  lng: 77.5946,
  opening_hours: "24 Hours Open",
  amenities: ["WiFi", "Cafe"],
  operator: { id: "op1", name: "Tata Power", logo_url: null },
  connectors: [
    { id: "c1", type: "CCS2", power_kw: 60, price_per_kwh: 19.0, status: "available" },
    { id: "c2", type: "Type 2", power_kw: 22, price_per_kwh: 14.0, status: "in_use" },
  ],
};

describe("StationCard component", () => {
  it("renders station name, address, and operator", () => {
    render(<StationCard station={testStation} />);

    expect(screen.getByText("PowerGrid Central")).toBeInTheDocument();
    expect(screen.getByText("42 MG Road, Indiranagar")).toBeInTheDocument();
    expect(screen.getByText("Tata Power")).toBeInTheDocument();
  });

  it("renders power, price, and availability metrics", () => {
    render(<StationCard station={testStation} />);

    expect(screen.getByText("60 kW")).toBeInTheDocument();
    expect(screen.getByText("₹14–19/kWh")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument(); // 1 available
    expect(screen.getByText("/2 free")).toBeInTheDocument();
  });

  it("renders connector type badges", () => {
    render(<StationCard station={testStation} />);

    expect(screen.getByText("CCS2")).toBeInTheDocument();
    expect(screen.getByText("Type 2")).toBeInTheDocument();
  });

  it("displays distance when provided", () => {
    render(<StationCard station={testStation} distance={3.42} />);

    expect(screen.getByText("3.4 km")).toBeInTheDocument();
  });

  it("displays distance in meters when under 1km", () => {
    render(<StationCard station={testStation} distance={0.45} />);

    expect(screen.getByText("450m")).toBeInTheDocument();
  });

  it("calls onToggleFav when favourite button is clicked", () => {
    const handleFav = vi.fn();
    render(<StationCard station={testStation} isFav={false} onToggleFav={handleFav} />);

    const favButton = screen.getByRole("button", { name: /add to favourites/i });
    fireEvent.click(favButton);

    expect(handleFav).toHaveBeenCalledTimes(1);
  });
});
