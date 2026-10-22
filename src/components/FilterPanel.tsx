import { Filter, X, Zap, Car, Home, Building2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { SearchableVehicleSelect } from "@/components/SearchableVehicleSelect";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { CONNECTOR_TYPES, type StationFilters } from "@/lib/types";
import type { Operator, Vehicle } from "@/lib/types";

interface FilterPanelProps {
  filters: StationFilters;
  onChange: (f: StationFilters) => void;
  operators: Operator[];
  vehicles: Vehicle[];
}

function FilterContent({
  filters,
  onChange,
  operators,
  vehicles,
  idPrefix = "",
}: FilterPanelProps & { idPrefix?: string }) {
  const activeCount =
    filters.connectorTypes.length +
    (filters.minKw > 0 ? 1 : 0) +
    filters.operatorIds.length +
    (filters.availableOnly ? 1 : 0) +
    (filters.vehicleId ? 1 : 0) +
    (filters.source && filters.source !== "all" ? 1 : 0);

  const toggleConnector = (t: string) => {
    const types = filters.connectorTypes.includes(t)
      ? filters.connectorTypes.filter((x) => x !== t)
      : [...filters.connectorTypes, t];
    onChange({ ...filters, connectorTypes: types });
  };

  const toggleOperator = (id: string) => {
    const ids = filters.operatorIds.includes(id)
      ? filters.operatorIds.filter((x) => x !== id)
      : [...filters.operatorIds, id];
    onChange({ ...filters, operatorIds: ids });
  };

  const currentSource = filters.source || "all";

  return (
    <div className="space-y-6">
      {/* Charging Source (Public vs Home P2P) */}
      <div>
        <h4 className="mb-2.5 flex items-center gap-1.5 text-sm font-medium text-foreground">
          <Building2 className="h-4 w-4 text-primary" />
          Charging Network
        </h4>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted/60 p-1 border border-border/60">
          <button
            type="button"
            onClick={() => onChange({ ...filters, source: "all" })}
            className={`flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-medium transition-all ${
              currentSource === "all"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...filters, source: "public" })}
            className={`flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-medium transition-all ${
              currentSource === "public"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Building2 className="h-3 w-3 text-emerald-500" />
            Public
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...filters, source: "home" })}
            className={`flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-medium transition-all ${
              currentSource === "home"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Home className="h-3 w-3 text-amber-500" />
            Home P2P
          </button>
        </div>
      </div>

      {/* Available only */}
      <div className="flex items-center justify-between">
        <Label
          htmlFor={idPrefix ? `${idPrefix}-available-only` : "available-only"}
          className="text-sm font-medium"
        >
          Available only
        </Label>
        <Switch
          id={idPrefix ? `${idPrefix}-available-only` : "available-only"}
          checked={filters.availableOnly}
          onCheckedChange={(v) => onChange({ ...filters, availableOnly: v })}
        />
      </div>

      {/* Connector types */}
      <div>
        <h4 className="mb-2 flex items-center gap-1.5 text-sm font-medium">
          <Zap className="h-4 w-4 text-primary" />
          Connector Type
        </h4>
        <div className="flex flex-wrap gap-2">
          {CONNECTOR_TYPES.map((t) => (
            <Badge
              key={t}
              variant={filters.connectorTypes.includes(t) ? "default" : "outline"}
              className={`cursor-pointer transition-colors ${
                filters.connectorTypes.includes(t)
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "hover:bg-accent"
              }`}
              onClick={() => toggleConnector(t)}
            >
              {t}
            </Badge>
          ))}
        </div>
      </div>

      {/* Min power */}
      <div>
        <h4 className="mb-2 text-sm font-medium">
          Min Power: <span className="text-primary">{filters.minKw} kW</span>
        </h4>
        <Slider
          id={idPrefix ? `${idPrefix}-min-power-slider` : "min-power-slider"}
          min={0}
          max={150}
          step={5}
          value={[filters.minKw]}
          onValueChange={([v]) => onChange({ ...filters, minKw: v ?? 0 })}
          className="py-2"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>0 kW</span>
          <span>150 kW</span>
        </div>
      </div>

      {/* Operators */}
      {operators.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-medium">Operator</h4>
          <div className="space-y-2">
            {operators.map((op) => (
              <label
                key={op.id}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent"
              >
                <Checkbox
                  checked={filters.operatorIds.includes(op.id)}
                  onCheckedChange={() => toggleOperator(op.id)}
                />
                <span className="text-sm">{op.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* My vehicle */}
      <div>
        <h4 className="mb-2 flex items-center gap-1.5 text-sm font-medium">
          <Car className="h-4 w-4 text-primary" />
          My Vehicle
        </h4>
        <SearchableVehicleSelect
          id={idPrefix ? `${idPrefix}-vehicle-filter-select` : "vehicle-filter-select"}
          value={filters.vehicleId}
          onValueChange={(v) => onChange({ ...filters, vehicleId: v })}
          vehicles={vehicles}
        />
      </div>

      {/* Reset */}
      {activeCount > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() =>
            onChange({
              connectorTypes: [],
              minKw: 0,
              operatorIds: [],
              availableOnly: false,
              vehicleId: null,
            })
          }
          id="reset-filters"
        >
          <X className="mr-1.5 h-3.5 w-3.5" />
          Reset filters
        </Button>
      )}
    </div>
  );
}

export function FilterPanel(props: FilterPanelProps) {
  const [open, setOpen] = useState(false);
  const activeCount =
    props.filters.connectorTypes.length +
    (props.filters.minKw > 0 ? 1 : 0) +
    props.filters.operatorIds.length +
    (props.filters.availableOnly ? 1 : 0) +
    (props.filters.vehicleId ? 1 : 0);

  return (
    <>
      {/* Desktop inline (hidden below lg) */}
      <div className="hidden lg:block">
        <FilterContent {...props} />
      </div>

      {/* Mobile sheet */}
      <div className="lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="relative gap-1.5" id="mobile-filter-btn">
              <Filter className="h-4 w-4" />
              Filters
              {activeCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {activeCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <FilterContent {...props} idPrefix="mobile" />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
