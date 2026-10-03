import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FilterPanel } from "@/components/FilterPanel";
import type { Operator, StationFilters, Vehicle } from "@/lib/types";

const mockOperators: Operator[] = [
  { id: "op-1", name: "Tata Power", logo_url: null },
  { id: "op-2", name: "Ather Grid", logo_url: null },
];

const mockVehicles: Vehicle[] = [
  { id: "v-1", make: "Tata", model: "Nexon EV", connector_types: ["CCS2"], max_charge_kw: 50 },
  { id: "v-2", make: "MG", model: "ZS EV", connector_types: ["CCS2"], max_charge_kw: 80 },
];

const initialFilters: StationFilters = {
  connectorTypes: [],
  minKw: 0,
  operatorIds: [],
  availableOnly: false,
  vehicleId: null,
};

describe("FilterPanel component", () => {
  it("renders connector types, available only toggle, and operators", () => {
    render(
      <FilterPanel
        filters={initialFilters}
        onChange={vi.fn()}
        operators={mockOperators}
        vehicles={mockVehicles}
      />,
    );

    expect(screen.getByText("Available only")).toBeInTheDocument();
    expect(screen.getByText("CCS2")).toBeInTheDocument();
    expect(screen.getByText("Tata Power")).toBeInTheDocument();
    expect(screen.getByText("Ather Grid")).toBeInTheDocument();
  });

  it("calls onChange when a connector badge is clicked", () => {
    const handleChange = vi.fn();
    render(
      <FilterPanel
        filters={initialFilters}
        onChange={handleChange}
        operators={mockOperators}
        vehicles={mockVehicles}
      />,
    );

    const ccs2Badge = screen.getByText("CCS2");
    fireEvent.click(ccs2Badge);

    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        connectorTypes: ["CCS2"],
      }),
    );
  });

  it("calls onChange when an operator is checked", () => {
    const handleChange = vi.fn();
    render(
      <FilterPanel
        filters={initialFilters}
        onChange={handleChange}
        operators={mockOperators}
        vehicles={mockVehicles}
      />,
    );

    const tataPower = screen.getByText("Tata Power");
    fireEvent.click(tataPower);

    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        operatorIds: ["op-1"],
      }),
    );
  });

  it("shows reset filters button when filters are active and clears on click", () => {
    const handleChange = vi.fn();
    render(
      <FilterPanel
        filters={{ ...initialFilters, connectorTypes: ["CCS2"], minKw: 50 }}
        onChange={handleChange}
        operators={mockOperators}
        vehicles={mockVehicles}
      />,
    );

    const resetBtn = screen.getByRole("button", { name: /reset filters/i });
    expect(resetBtn).toBeInTheDocument();

    fireEvent.click(resetBtn);

    expect(handleChange).toHaveBeenCalledWith({
      connectorTypes: [],
      minKw: 0,
      operatorIds: [],
      availableOnly: false,
      vehicleId: null,
    });
  });
});
