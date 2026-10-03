import { Filter, X, Zap, Car } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

function FilterContent({ filters, onChange, operators, vehicles }: FilterPanelProps) {
  const activeCount =
    filters.connectorTypes.length +
    (filters.minKw > 0 ? 1 : 0) +
    filters.operatorIds.length +
    (filters.availableOnly ? 1 : 0) +
    (filters.vehicleId ? 1 : 0);

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

  return (
    <div className="space-y-6">
      {/* Available only */}
      <div className="flex items-center justify-between">
        <Label htmlFor="available-only" className="text-sm font-medium">
          Available only
        </Label>
        <Switch
          id="available-only"
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
          id="min-power-slider"
          min={0}
          max={150}
          step={5}
          value={[filters.minKw]}
          onValueChange={([v]) => onChange({ ...filters, minKw: v })}
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
      {vehicles.length > 0 && (
        <div>
          <h4 className="mb-2 flex items-center gap-1.5 text-sm font-medium">
            <Car className="h-4 w-4 text-primary" />
            My Vehicle
          </h4>
          <Select
            value={filters.vehicleId ?? "none"}
            onValueChange={(v) => onChange({ ...filters, vehicleId: v === "none" ? null : v })}
          >
            <SelectTrigger id="vehicle-filter-select" className="w-full">
              <SelectValue placeholder="All vehicles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">All vehicles</SelectItem>
              {vehicles.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.make} {v.model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

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
              <FilterContent {...props} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
