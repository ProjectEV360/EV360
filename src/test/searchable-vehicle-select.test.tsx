import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SearchableVehicleSelect } from "@/components/SearchableVehicleSelect";
import { FilterPanel } from "@/components/FilterPanel";
import { VEHICLES } from "@/data/vehicles";
import type { Operator, StationFilters } from "@/lib/types";

const mockOperators: Operator[] = [{ id: "op-1", name: "Tata Power", logo_url: null }];

const initialFilters: StationFilters = {
  connectorTypes: [],
  minKw: 0,
  operatorIds: [],
  availableOnly: false,
  vehicleId: null,
};

describe("SearchableVehicleSelect Component", () => {
  it("renders trigger with 'All vehicles' by default", () => {
    render(<SearchableVehicleSelect value={null} onValueChange={vi.fn()} />);

    const trigger = screen.getByRole("combobox", { name: /filter by vehicle/i });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveTextContent("All vehicles");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("opens dropdown and focuses search input when clicked", async () => {
    render(<SearchableVehicleSelect value={null} onValueChange={vi.fn()} />);

    const trigger = screen.getByRole("combobox", { name: /filter by vehicle/i });
    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const searchInput = screen.getByPlaceholderText("Search car...");
    expect(searchInput).toBeInTheDocument();

    await waitFor(() => {
      expect(searchInput).toHaveFocus();
    });
  });

  it("filters vehicles live as the user types (brand and model)", () => {
    render(<SearchableVehicleSelect value={null} onValueChange={vi.fn()} />);

    const trigger = screen.getByRole("combobox", { name: /filter by vehicle/i });
    fireEvent.click(trigger);

    const searchInput = screen.getByPlaceholderText("Search car...");

    // Search by brand name
    fireEvent.change(searchInput, { target: { value: "tata" } });
    expect(screen.getByText("Tata Nexon EV")).toBeInTheDocument();
    expect(screen.getByText("Tata Punch EV")).toBeInTheDocument();
    expect(screen.queryByText("MG Comet EV")).not.toBeInTheDocument();
    expect(screen.queryByText("Tesla Model Y")).not.toBeInTheDocument();

    // Clear and search by model name
    fireEvent.change(searchInput, { target: { value: "windsor" } });
    expect(screen.getByText("MG Windsor EV")).toBeInTheDocument();
    expect(screen.queryByText("Tata Nexon EV")).not.toBeInTheDocument();
  });

  it("displays 'No cars found' when search query has no match", () => {
    render(<SearchableVehicleSelect value={null} onValueChange={vi.fn()} />);

    const trigger = screen.getByRole("combobox", { name: /filter by vehicle/i });
    fireEvent.click(trigger);

    const searchInput = screen.getByPlaceholderText("Search car...");
    fireEvent.change(searchInput, { target: { value: "nonexistent electric supercar 9999" } });

    expect(screen.getByText("No cars found")).toBeInTheDocument();
  });

  it("clears search input when clear (X) button is clicked", () => {
    render(<SearchableVehicleSelect value={null} onValueChange={vi.fn()} />);

    const trigger = screen.getByRole("combobox", { name: /filter by vehicle/i });
    fireEvent.click(trigger);

    const searchInput = screen.getByPlaceholderText("Search car...") as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: "comet" } });
    expect(searchInput.value).toBe("comet");

    const clearBtn = screen.getByRole("button", { name: /clear search text/i });
    expect(clearBtn).toBeInTheDocument();

    fireEvent.click(clearBtn);
    expect(searchInput.value).toBe("");
    expect(screen.getByText("Tata Nexon EV")).toBeInTheDocument();
  });

  it("calls onValueChange and closes dropdown when vehicle is selected", () => {
    const handleValueChange = vi.fn();

    render(<SearchableVehicleSelect value={null} onValueChange={handleValueChange} />);

    const trigger = screen.getByRole("combobox", { name: /filter by vehicle/i });
    fireEvent.click(trigger);

    const searchInput = screen.getByPlaceholderText("Search car...");
    fireEvent.change(searchInput, { target: { value: "nexon" } });

    const nexonOption = screen.getByText("Tata Nexon EV");
    fireEvent.click(nexonOption);

    expect(handleValueChange).toHaveBeenCalledWith("tata-nexon-ev");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("supports keyboard navigation: arrow keys, Enter to select, and Esc to close", () => {
    const handleValueChange = vi.fn();
    render(<SearchableVehicleSelect value={null} onValueChange={handleValueChange} />);

    const trigger = screen.getByRole("combobox", { name: /filter by vehicle/i });

    // Open via Enter key
    fireEvent.keyDown(trigger, { key: "Enter" });
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    // Close via Escape key
    const searchInput = screen.getByPlaceholderText("Search car...");
    fireEvent.keyDown(searchInput, { key: "Escape" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    // Reopen and navigate with arrows
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    // Query active search input after reopen
    const activeSearchInput = screen.getByPlaceholderText("Search car...");
    fireEvent.keyDown(activeSearchInput, { key: "ArrowDown" });
    fireEvent.keyDown(activeSearchInput, { key: "Enter" });

    expect(handleValueChange).toHaveBeenCalled();
  });

  it("displays checkmark on the currently selected vehicle", () => {
    render(<SearchableVehicleSelect value="tata-nexon-ev" onValueChange={vi.fn()} />);

    const trigger = screen.getByRole("combobox", { name: /filter by vehicle/i });
    expect(trigger).toHaveTextContent("Tata Nexon EV");

    fireEvent.click(trigger);
    const selectedOption = screen.getByRole("option", { name: "Tata Nexon EV" });
    expect(selectedOption).toHaveAttribute("aria-selected", "true");
  });

  it("renders and operates seamlessly inside FilterPanel mobile sheet", () => {
    const handleChange = vi.fn();

    render(
      <FilterPanel
        filters={initialFilters}
        onChange={handleChange}
        operators={mockOperators}
        vehicles={VEHICLES}
      />,
    );

    // Open mobile filter sheet
    const mobileBtn = screen.getByRole("button", { name: /filters/i });
    fireEvent.click(mobileBtn);

    // Mobile vehicle select trigger has id "mobile-vehicle-filter-select"
    const mobileVehicleTrigger = screen.getByRole("combobox", { name: /filter by vehicle/i });
    expect(mobileVehicleTrigger).toBeInTheDocument();

    fireEvent.click(mobileVehicleTrigger);
    const searchInputs = screen.getAllByPlaceholderText("Search car...");
    const activeSearchInput = searchInputs[searchInputs.length - 1]!;
    fireEvent.change(activeSearchInput, { target: { value: "punch" } });

    const punchOption = screen.getByText("Tata Punch EV");
    fireEvent.click(punchOption);

    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        vehicleId: "tata-punch-ev",
      }),
    );
  });

  it("opens upwards when positioned near the bottom of viewport", () => {
    render(<SearchableVehicleSelect value={null} onValueChange={vi.fn()} />);

    const trigger = screen.getByRole("combobox", { name: /filter by vehicle/i });
    vi.spyOn(trigger, "getBoundingClientRect").mockReturnValue({
      top: 800,
      bottom: 840,
      left: 20,
      right: 260,
      width: 240,
      height: 40,
      x: 20,
      y: 800,
      toJSON: () => {},
    });

    fireEvent.click(trigger);

    const listbox = screen.getByRole("listbox");
    expect(listbox.className).toContain("bottom-full");
  });
});
