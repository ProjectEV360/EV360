import { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  Clock,
  Zap,
  MapPin,
  ShieldCheck,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Receipt,
  Navigation,
  Phone,
  User,
  Info,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import type { Station, HomeCharger, MarketplaceBooking } from "@/lib/types";
import {
  calculateMarketplacePricing,
  checkSlotAvailability,
  createMarketplaceBooking,
  confirmMarketplaceBooking,
  getHomeChargerById,
} from "@/services/marketplaceService";
import { openRazorpayCheckout, getRazorpayKey } from "@/services/razorpayService";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

interface HomeChargerBookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  station: Station;
}

export function HomeChargerBookingModal({
  open,
  onOpenChange,
  station,
}: HomeChargerBookingModalProps) {
  const { user } = useAuth();

  // Full host charger details
  const [charger, setCharger] = useState<HomeCharger | null>(null);
  const [loadingCharger, setLoadingCharger] = useState<boolean>(true);

  // Booking form state
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split("T")[0]!;
  });
  const [selectedStartTime, setSelectedStartTime] = useState<string>("10:00");
  const [durationHours, setDurationHours] = useState<number>(2);
  const [targetKwh, setTargetKwh] = useState<number>(20);

  // Availability state
  const [isCheckingSlot, setIsCheckingSlot] = useState<boolean>(false);
  const [slotAvailable, setSlotAvailable] = useState<boolean>(true);
  const [slotConflictMsg, setSlotConflictMsg] = useState<string | null>(null);

  // Payment & Confirmation state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [confirmedBooking, setConfirmedBooking] = useState<MarketplaceBooking | null>(null);

  // Fetch full charger record
  useEffect(() => {
    if (!open) return;
    let isSubscribed = true;
    setLoadingCharger(true);

    getHomeChargerById(station.home_charger_id || station.id, user?.id)
      .then((data) => {
        if (isSubscribed) {
          setCharger(data);
          setLoadingCharger(false);
        }
      })
      .catch(() => {
        if (isSubscribed) setLoadingCharger(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [open, station.id, station.home_charger_id, user?.id]);

  // Pricing calculations
  const priceRate =
    charger?.price_rate ?? station.price_rate ?? station.connectors[0]?.price_per_kwh ?? 16;
  const pricingType = charger?.pricing_type ?? station.pricing_type ?? "per_kwh";

  const pricing = useMemo(() => {
    return calculateMarketplacePricing(
      priceRate,
      pricingType,
      targetKwh,
      durationHours,
      10, // 10% platform commission
    );
  }, [priceRate, pricingType, targetKwh, durationHours]);

  // Compute ISO slot times
  const { slotStartIso, slotEndIso } = useMemo(() => {
    const [h = 10, m = 0] = selectedStartTime.split(":").map(Number);
    const start = new Date(`${selectedDate}T00:00:00`);
    start.setHours(h, m, 0, 0);

    const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);
    return {
      slotStartIso: start.toISOString(),
      slotEndIso: end.toISOString(),
    };
  }, [selectedDate, selectedStartTime, durationHours]);

  // Check slot availability when date/time/duration changes
  useEffect(() => {
    if (!open) return;
    const chargerId = station.home_charger_id || station.id;
    setIsCheckingSlot(true);

    checkSlotAvailability(chargerId, slotStartIso, slotEndIso)
      .then((res) => {
        setSlotAvailable(res.available);
        setSlotConflictMsg(res.available ? null : res.conflictReason || "Slot unavailable.");
      })
      .catch(() => {
        setSlotAvailable(true);
      })
      .finally(() => {
        setIsCheckingSlot(false);
      });
  }, [open, station.id, station.home_charger_id, slotStartIso, slotEndIso]);

  const handleBookNow = async () => {
    if (!user) {
      toast.error("Please sign in to reserve this home charger.");
      return;
    }

    if (!slotAvailable) {
      toast.error(slotConflictMsg || "Selected slot is unavailable.");
      return;
    }

    setIsProcessing(true);

    try {
      const chargerId = station.home_charger_id || station.id;
      const hostId = charger?.host_id || station.host_id || "host-p2p";

      // 1. Create preliminary booking record
      const pendingBooking = await createMarketplaceBooking({
        charger_id: chargerId,
        host_id: hostId,
        user_id: user.id,
        start_time: slotStartIso,
        end_time: slotEndIso,
        target_kwh: pricingType === "per_kwh" ? targetKwh : undefined,
        duration_hours: durationHours,
        status: "pending_payment",
        subtotal_amount: pricing.subtotalInRupees,
        platform_commission_rate: pricing.commissionRate,
        platform_commission_amount: pricing.platformCommissionInRupees,
        merchant_earnings: pricing.merchantEarningsInRupees,
        total_amount: pricing.totalInRupees,
        access_revealed: false,
      });

      // 2. Open Razorpay Checkout in Test Mode
      await openRazorpayCheckout({
        amountInRupees: pricing.totalInRupees,
        stationName: `EV360 Home: ${charger?.title || station.name}`,
        connectorType: charger?.connector_type || station.connectors[0]?.type || "Type 2",
        powerKw: charger?.power_kw || station.connectors[0]?.power_kw || 7.4,
        kwh: targetKwh,
        userEmail: user.email,
        userName: user.user_metadata?.["full_name"] || "EV Driver",
        onSuccess: async (rzpResponse) => {
          try {
            // 3. Confirm booking & reveal private host address
            const confirmed = await confirmMarketplaceBooking(pendingBooking.id, {
              razorpay_order_id: rzpResponse.razorpay_order_id || `ord_${Date.now()}`,
              razorpay_payment_id: rzpResponse.razorpay_payment_id,
              razorpay_signature: rzpResponse.razorpay_signature || "verified_sig",
            });

            // Reload full charger with unlocked private address
            const fullCharger = await getHomeChargerById(chargerId, user.id);
            if (fullCharger) {
              setCharger(fullCharger);
            }

            setConfirmedBooking(
              confirmed || { ...pendingBooking, status: "confirmed", access_revealed: true },
            );
            toast.success("Payment verified! Your booking is confirmed.");
          } catch (confirmErr) {
            console.error("Booking confirmation error:", confirmErr);
            toast.error("Payment received but confirmation failed. Contact support.");
          } finally {
            setIsProcessing(false);
          }
        },
        onDismiss: () => {
          setIsProcessing(false);
          toast.info("Payment was cancelled. You can retry when ready.");
        },
        onError: (err) => {
          setIsProcessing(false);
          toast.error(err instanceof Error ? err.message : "Payment processing error.");
        },
      });
    } catch (err) {
      setIsProcessing(false);
      toast.error(err instanceof Error ? err.message : "Failed to initiate reservation.");
    }
  };

  const handleClose = () => {
    setConfirmedBooking(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1"
            >
              🏠 Peer-to-Peer Home Charger
            </Badge>
            <Badge
              variant="secondary"
              className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-medium"
            >
              Verified Host
            </Badge>
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight text-foreground mt-1">
            {charger?.title || station.name}
          </DialogTitle>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />
            {confirmedBooking ? charger?.address_full : charger?.address_approx || station.address}
          </p>
        </DialogHeader>

        {confirmedBooking ? (
          /* ─── Confirmation Success Screen (Exact Address & Codes Revealed) ─── */
          <div className="space-y-5 py-2 animate-in fade-in-50 duration-300">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Slot Reserved & Confirmed!</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Payment verified securely in Razorpay Test Mode.
              </p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-background px-3 py-1.5 border border-border shadow-xs">
                <span className="text-xs text-muted-foreground font-mono">Booking Ref:</span>
                <span className="text-sm font-bold tracking-wider text-primary font-mono">
                  {confirmedBooking.booking_ref}
                </span>
              </div>
            </div>

            {/* Private Access Instructions Unlocked */}
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4.5 space-y-3">
              <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                <Unlock className="h-4.5 w-4.5" />
                <span>Host Private Access Details Unlocked</span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-semibold text-foreground">Exact Street Address:</span>
                  <p className="text-muted-foreground mt-0.5 select-all">
                    {charger?.address_full || "Provided by host upon check-in"}
                  </p>
                </div>

                <div>
                  <span className="font-semibold text-foreground">
                    Entry & Access Instructions:
                  </span>
                  <p className="text-muted-foreground mt-0.5 bg-background/80 p-2.5 rounded-lg border border-border/60">
                    {charger?.access_instructions ||
                      "Pull into designated bay and plug in. Host is notified of your arrival."}
                  </p>
                </div>

                {charger?.host_phone && (
                  <div className="flex items-center gap-2 pt-1 text-foreground">
                    <Phone className="h-3.5 w-3.5 text-primary" />
                    <span>Host Phone:</span>
                    <a
                      href={`tel:${charger.host_phone}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {charger.host_phone}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Time & Session Summary */}
            <div className="rounded-xl border border-border/60 bg-card p-4 space-y-2 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Reserved Date:</span>
                <span className="font-semibold text-foreground">{selectedDate}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Time Slot:</span>
                <span className="font-semibold text-foreground">
                  {selectedStartTime} ({durationHours} hours)
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Target Energy:</span>
                <span className="font-semibold text-foreground">{targetKwh} kWh</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-sm text-foreground">
                <span>Total Paid:</span>
                <span className="text-emerald-500">
                  ₹{confirmedBooking.total_amount.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 gap-1.5 rounded-xl" asChild>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${charger?.lat || station.lat},${charger?.lng || station.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Navigation className="h-4 w-4" />
                  Get Directions
                </a>
              </Button>
              <Button
                className="flex-1 rounded-xl bg-gradient-primary shadow-glow text-primary-foreground"
                onClick={handleClose}
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          /* ─── Reservation & Payment Form ─── */
          <div className="space-y-5 py-2">
            {/* Host specs badge strip */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-muted/50 p-2.5 border border-border/60">
                <span className="text-[10px] text-muted-foreground block">Power</span>
                <span className="text-xs font-bold text-foreground">
                  {charger?.power_kw || station.connectors[0]?.power_kw || 7.4} kW (
                  {charger?.current_type || "AC"})
                </span>
              </div>
              <div className="rounded-xl bg-muted/50 p-2.5 border border-border/60">
                <span className="text-[10px] text-muted-foreground block">Connector</span>
                <span className="text-xs font-bold text-foreground">
                  {charger?.connector_type || station.connectors[0]?.type || "Type 2"}
                </span>
              </div>
              <div className="rounded-xl bg-muted/50 p-2.5 border border-border/60">
                <span className="text-[10px] text-muted-foreground block">Rate</span>
                <span className="text-xs font-bold text-primary">
                  ₹{priceRate}/{pricingType === "per_session" ? "session" : "kWh"}
                </span>
              </div>
            </div>

            {/* Privacy notice banner */}
            <div className="flex items-start gap-2 rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground border border-border/50">
              <Lock className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <span>
                <strong>Host Address Protected:</strong> Showing approximate location within ~250m.
                Exact street address and gate instructions are revealed instantly after booking
                payment.
              </span>
            </div>

            {/* Date and Time Pickers */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="slot-date"
                  className="text-xs font-semibold flex items-center gap-1"
                >
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  Select Date
                </Label>
                <input
                  id="slot-date"
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="slot-time"
                  className="text-xs font-semibold flex items-center gap-1"
                >
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  Start Time
                </Label>
                <select
                  id="slot-time"
                  value={selectedStartTime}
                  onChange={(e) => setSelectedStartTime(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary"
                >
                  <option value="07:00">07:00 AM</option>
                  <option value="08:00">08:00 AM</option>
                  <option value="09:00">09:00 AM</option>
                  <option value="10:00">10:00 AM</option>
                  <option value="11:00">11:00 AM</option>
                  <option value="12:00">12:00 PM</option>
                  <option value="13:00">01:00 PM</option>
                  <option value="14:00">02:00 PM</option>
                  <option value="15:00">03:00 PM</option>
                  <option value="16:00">04:00 PM</option>
                  <option value="17:00">05:00 PM</option>
                  <option value="18:00">06:00 PM</option>
                  <option value="19:00">07:00 PM</option>
                  <option value="20:00">08:00 PM</option>
                  <option value="21:00">09:00 PM</option>
                </select>
              </div>
            </div>

            {/* Duration / Target kWh */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">Duration:</span>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4].map((hrs) => (
                    <button
                      key={hrs}
                      type="button"
                      onClick={() => setDurationHours(hrs)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                        durationHours === hrs
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "bg-muted text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {hrs} hr{hrs > 1 ? "s" : ""}
                    </button>
                  ))}
                </div>
              </div>

              {pricingType === "per_kwh" && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-foreground">Target Energy:</span>
                    <span className="font-bold text-primary">{targetKwh} kWh</span>
                  </div>
                  <Slider
                    value={[targetKwh]}
                    onValueChange={([val]) => val != null && setTargetKwh(val)}
                    min={5}
                    max={60}
                    step={5}
                    className="py-1"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>5 kWh (Quick top-up)</span>
                    <span>30 kWh</span>
                    <span>60 kWh (Full charge)</span>
                  </div>
                </div>
              )}
            </div>

            {/* Conflict Alert (if slot already taken) */}
            {isCheckingSlot ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                <span>Checking charger availability...</span>
              </div>
            ) : !slotAvailable ? (
              <div className="flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-xs text-destructive border border-destructive/20">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  {slotConflictMsg ||
                    "This time slot is already reserved. Please pick another time."}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Slot available for reservation!</span>
              </div>
            )}

            {/* Price & Commission Breakdown */}
            <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-2 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>
                  Energy Charge (
                  {pricingType === "per_session" ? "1 session" : `${targetKwh} kWh × ₹${priceRate}`}
                  ):
                </span>
                <span className="font-semibold text-foreground">
                  ₹{pricing.subtotalInRupees.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span className="flex items-center gap-1">
                  Platform Commission (10%):
                  <Info className="h-3 w-3 text-muted-foreground/70" />
                </span>
                <span className="text-muted-foreground">
                  Included (₹{pricing.platformCommissionInRupees.toFixed(2)})
                </span>
              </div>
              <div className="flex justify-between text-[11px] text-emerald-600 dark:text-emerald-400">
                <span>Host Gross Earnings:</span>
                <span>₹{pricing.merchantEarningsInRupees.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-sm text-foreground pt-1">
                <span>Total Payable:</span>
                <span className="text-primary text-base">₹{pricing.totalInRupees.toFixed(2)}</span>
              </div>
            </div>

            {/* Policy */}
            <p className="text-[11px] text-muted-foreground">
              {charger?.cancellation_policy ||
                "Flexible: Free cancellation up to 2 hours before scheduled slot."}
            </p>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={handleClose}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                className="flex-2 rounded-xl bg-gradient-primary shadow-glow text-primary-foreground gap-2 font-semibold"
                onClick={handleBookNow}
                disabled={isProcessing || !slotAvailable || isCheckingSlot}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    Pay ₹{pricing.totalInRupees.toFixed(2)} (Razorpay Test)
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
