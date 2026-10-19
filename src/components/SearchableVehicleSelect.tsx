import { useState, useRef, useEffect, useMemo, useId } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { VEHICLES, type VehicleModel, searchVehicles } from "@/data/vehicles";
import type { Vehicle } from "@/lib/types";

export interface SearchableVehicleSelectProps {
  value: string | null;
  onValueChange: (value: string | null) => void;
  vehicles?: (Vehicle | VehicleModel)[];
  id?: string;
  className?: string;
}

export function SearchableVehicleSelect({
  value,
  onValueChange,
  vehicles = VEHICLES,
  id = "vehicle-filter-select",
  className,
}: SearchableVehicleSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpwards, setOpenUpwards] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  // Dynamic collision detection to open upwards when near viewport bottom
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      if (spaceBelow < 280 && spaceAbove > spaceBelow) {
        setOpenUpwards(true);
      } else {
        setOpenUpwards(false);
      }
    }
  }, [isOpen]);

  // Normalize vehicles list into standard VehicleModel structure
  const normalizedVehicles: VehicleModel[] = useMemo(() => {
    const sourceList = vehicles.length > 0 ? vehicles : VEHICLES;
    return sourceList.map((v) => {
      const brand = ("brand" in v && v.brand ? v.brand : v.make) || "Other";
      const model = v.model;
      const name = ("name" in v && v.name ? v.name : `${brand} ${model}`).trim();
      return {
        id: v.id,
        brand,
        model,
        name,
        make: brand,
        connector_types: v.connector_types,
        max_charge_kw: v.max_charge_kw,
      };
    });
  }, [vehicles]);

  // Selected vehicle lookup
  const selectedVehicle = useMemo(() => {
    if (!value || value === "none") return null;
    return normalizedVehicles.find((v) => v.id === value) ?? null;
  }, [value, normalizedVehicles]);

  // Filtered vehicles based on search query
  const filteredVehicles = useMemo(() => {
    return searchVehicles(search, normalizedVehicles);
  }, [search, normalizedVehicles]);

  // Group filtered vehicles by brand
  const groupedVehicles = useMemo(() => {
    const groups: { brand: string; items: VehicleModel[] }[] = [];
    const map = new Map<string, VehicleModel[]>();

    for (const v of filteredVehicles) {
      if (!map.has(v.brand)) {
        map.set(v.brand, []);
      }
      map.get(v.brand)!.push(v);
    }

    for (const [brand, items] of map.entries()) {
      groups.push({ brand, items });
    }

    return groups;
  }, [filteredVehicles]);

  // Flat list of selectable options for keyboard navigation
  // Index 0 is always "All vehicles", followed by matching vehicles
  const flatSelectableList = useMemo(() => {
    const list: { id: string | null; name: string }[] = [{ id: null, name: "All vehicles" }];
    for (const group of groupedVehicles) {
      for (const item of group.items) {
        list.push({ id: item.id, name: item.name });
      }
    }
    return list;
  }, [groupedVehicles]);

  // Open/Close effect: Auto-focus search input when opened, reset search & highlight when closed
  useEffect(() => {
    if (isOpen) {
      // Focus search input on next tick once rendered
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 20);
      setHighlightedIndex(-1);
      return () => clearTimeout(timer);
    } else {
      setSearch("");
      setHighlightedIndex(-1);
    }
  }, [isOpen]);

  // Click-outside listener
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [isOpen]);

  // Scroll active option into view when navigating via keyboard
  useEffect(() => {
    if (highlightedIndex >= 0 && listboxRef.current) {
      const activeEl = listboxRef.current.querySelector(
        `[data-option-index="${highlightedIndex}"]`,
      ) as HTMLElement | null;
      if (activeEl && typeof activeEl.scrollIntoView === "function") {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex]);

  const handleSelect = (vehicleId: string | null) => {
    onValueChange(vehicleId);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
        break;

      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < flatSelectableList.length - 1 ? prev + 1 : 0));
        break;

      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : flatSelectableList.length - 1));
        break;

      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < flatSelectableList.length) {
          const selected = flatSelectableList[highlightedIndex];
          if (selected) {
            handleSelect(selected.id);
          }
        } else if (flatSelectableList.length > 1 && search.trim()) {
          // If user pressed Enter while typing and there's a match, select first match
          const firstMatch = flatSelectableList[1];
          if (firstMatch) {
            handleSelect(firstMatch.id);
          }
        } else {
          // Select "All vehicles"
          handleSelect(null);
        }
        break;

      case "Tab":
        setIsOpen(false);
        break;
    }
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)} onKeyDown={handleKeyDown}>
      {/* Dropdown Trigger */}
      <button
        ref={triggerRef}
        type="button"
        id={id}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-label="Filter by vehicle"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background cursor-pointer transition-colors focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent/40",
          !selectedVehicle && "text-muted-foreground",
        )}
      >
        <span className="truncate text-foreground">
          {selectedVehicle ? selectedVehicle.name : "All vehicles"}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 opacity-50 transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {/* Dropdown Content Panel */}
      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Electric vehicle options"
          className={cn(
            "absolute left-0 right-0 z-50 min-w-[14rem] overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95",
            openUpwards ? "bottom-full mb-1 origin-bottom" : "top-full mt-1 origin-top",
          )}
        >
          {/* Top Search Input Box */}
          <div className="sticky top-0 z-10 border-b border-border/70 bg-popover p-2">
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setHighlightedIndex(-1);
                }}
                placeholder="Search car..."
                className="h-8 w-full rounded-md border border-input bg-muted/40 pl-8 pr-7 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                aria-label="Search car"
                autoComplete="off"
                spellCheck="false"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-2 p-0.5 rounded-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  aria-label="Clear search text"
                  title="Clear"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Options Scroll Container */}
          <div ref={listboxRef} className="max-h-60 overflow-y-auto p-1 text-sm">
            {/* Always visible "All vehicles" option */}
            <div
              role="option"
              data-option-index={0}
              aria-selected={!selectedVehicle}
              tabIndex={-1}
              onClick={() => handleSelect(null)}
              onMouseEnter={() => setHighlightedIndex(0)}
              className={cn(
                "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none transition-colors",
                highlightedIndex === 0
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/80 hover:text-accent-foreground",
                !selectedVehicle && "font-semibold text-primary",
              )}
            >
              <span>All vehicles</span>
              {!selectedVehicle && (
                <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
                  <Check className="h-4 w-4 text-primary" />
                </span>
              )}
            </div>

            {/* Empty State */}
            {filteredVehicles.length === 0 && (
              <div className="py-6 text-center text-xs text-muted-foreground select-none">
                No cars found
              </div>
            )}

            {/* Grouped Vehicles List */}
            {groupedVehicles.map((group) => {
              return (
                <div key={group.brand} className="mt-1 first:mt-0">
                  {/* Brand Group Header */}
                  <div className="sticky top-0 z-[5] bg-popover/95 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground backdrop-blur-xs select-none">
                    {group.brand}
                  </div>

                  {/* Brand Vehicle Items */}
                  {group.items.map((v) => {
                    // Calculate index in flatSelectableList
                    const optionIndex = flatSelectableList.findIndex((item) => item.id === v.id);
                    const isSelected = selectedVehicle?.id === v.id;
                    const isHighlighted = highlightedIndex === optionIndex;

                    return (
                      <div
                        key={v.id}
                        role="option"
                        data-option-index={optionIndex}
                        aria-selected={isSelected}
                        tabIndex={-1}
                        onClick={() => handleSelect(v.id)}
                        onMouseEnter={() => setHighlightedIndex(optionIndex)}
                        className={cn(
                          "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none transition-colors",
                          isHighlighted
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-accent/80 hover:text-accent-foreground",
                          isSelected && "font-semibold text-primary",
                        )}
                      >
                        <span className="truncate">{v.name}</span>
                        {isSelected && (
                          <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
                            <Check className="h-4 w-4 text-primary" />
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
