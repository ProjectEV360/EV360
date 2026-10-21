import { useState, useEffect } from "react";
import {
  Zap,
  BatteryCharging,
  CreditCard,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Loader2,
  Receipt,
  Settings,
  AlertCircle,
  Copy,
  Check,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { Connector, Station } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";
import {
  openRazorpayCheckout,
  getRazorpayKey,
  type RazorpaySuccessResponse,
} from "@/services/razorpayService";
import { toast } from "sonner";

interface ChargingPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  station: Station;
  preselectedConnectorId?: string | null;
}

export function ChargingPaymentModal({
  open,
  onOpenChange,
  station,
  preselectedConnectorId,
}: ChargingPaymentModalProps) {
  const { user } = useAuth();

  // Find preselected or first available connector
  const initialConnector =
    station.connectors.find((c) => c.id === preselectedConnectorId) ||
    station.connectors.find((c) => c.status === "available") ||
    station.connectors[0]!;

  const [selectedConnector, setSelectedConnector] = useState<Connector>(initialConnector);
  const [targetKwh, setTargetKwh] = useState<number>(25);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [razorpayActive, setRazorpayActive] = useState<boolean>(false);
  const [completedSession, setCompletedSession] = useState<RazorpaySuccessResponse | null>(null);
  const [isCharging, setIsCharging] = useState<boolean>(false);
  const [chargingProgress, setChargingProgress] = useState<number>(20);
  const [currentPower, setCurrentPower] = useState<number>(0);
  const [copiedId, setCopiedId] = useState<boolean>(false);
  const [showKeyConfig, setShowKeyConfig] = useState<boolean>(false);
  const [customKey, setCustomKey] = useState<string>(getRazorpayKey());

  // Update selected connector if prop changes
  useEffect(() => {
    if (preselectedConnectorId) {
      const conn = station.connectors.find((c) => c.id === preselectedConnectorId);
      if (conn) setSelectedConnector(conn);
    }
  }, [preselectedConnectorId, station.connectors]);

  // Lock background scrolling when modal is open
  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  // Charging animation when session is active
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isCharging) {
      setCurrentPower(Math.round(selectedConnector.power_kw * 0.95));
      interval = setInterval(() => {
        setChargingProgress((prev) => {
          if (prev >= 100) {
            setIsCharging(false);
            return 100;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isCharging, selectedConnector.power_kw]);

  // Calculations
  const pricePerKwh = selectedConnector.price_per_kwh;
  const baseCost = targetKwh * pricePerKwh;
  const gstCost = baseCost * 0.05; // 5% GST on EV charging in India
  const totalCost = baseCost + gstCost;
  const estimatedMinutes = Math.round((targetKwh / selectedConnector.power_kw) * 60);

  const handleStartPayment = async () => {
    setIsProcessing(true);
    // Hide the dialog so its focus trap doesn't block the Razorpay iframe
    setRazorpayActive(true);
    try {
      await openRazorpayCheckout({
        amountInRupees: totalCost,
        stationName: station.name,
        connectorType: selectedConnector.type,
        powerKw: selectedConnector.power_kw,
        kwh: targetKwh,
        userEmail: user?.email,
        userName: (user?.user_metadata?.["full_name"] as string | undefined) ?? null,
        onSuccess: (response) => {
          setIsProcessing(false);
          setRazorpayActive(false);
          setCompletedSession(response);
          setIsCharging(true);
          setChargingProgress(25);
          toast.success("Payment verified! Charging session started.");
        },
        onDismiss: () => {
          setIsProcessing(false);
          setRazorpayActive(false);
          toast.info("Payment window closed");
        },
        onError: (err) => {
          setIsProcessing(false);
          setRazorpayActive(false);
          const message = err instanceof Error ? err.message : "Payment failed";
          toast.error(message);
          console.error("[Razorpay Error]", err);
        },
      });
    } catch (err) {
      setIsProcessing(false);
      setRazorpayActive(false);
      const message = err instanceof Error ? err.message : "Could not initialize Razorpay checkout";
      toast.error(message);
      console.error("[Razorpay Checkout Exception]", err);
    }
  };

  const handleSimulateDemo = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      const fakeResponse: RazorpaySuccessResponse = {
        razorpay_payment_id: `pay_demo_${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        amount: totalCost,
        stationName: station.name,
        connectorType: selectedConnector.type,
        kwh: targetKwh,
        timestamp: new Date().toISOString(),
      };
      setCompletedSession(fakeResponse);
      setIsCharging(true);
      setChargingProgress(28);
      toast.success("Demo payment approved! Charging session initialized.");
    }, 900);
  };

  const handleCopyPaymentId = () => {
    if (completedSession?.razorpay_payment_id) {
      navigator.clipboard.writeText(completedSession.razorpay_payment_id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
      toast.success("Payment ID copied to clipboard");
    }
  };

  const handleSaveKey = () => {
    if (customKey.trim()) {
      localStorage.setItem("chargehub_razorpay_key", customKey.trim());
      toast.success("Razorpay Key updated");
      setShowKeyConfig(false);
    }
  };

  const resetModal = () => {
    setCompletedSession(null);
    setIsCharging(false);
    setChargingProgress(20);
    onOpenChange(false);
  };

  return (
    <Dialog open={open && !razorpayActive} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl sm:rounded-3xl border-border/60 bg-card p-4 sm:p-6 shadow-2xl">
        <DialogHeader className="border-b border-border/50 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
                <Zap className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <DialogTitle className="font-display text-xl font-bold">
                  {completedSession ? "Charging Session" : "Reserve & Pay"}
                </DialogTitle>
                <p className="text-xs text-muted-foreground">{station.name}</p>
              </div>
            </div>

            {!completedSession && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-muted-foreground"
                onClick={() => setShowKeyConfig(!showKeyConfig)}
                title="Razorpay API Key Config"
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Razorpay Key Configuration panel (Optional popup) */}
        {showKeyConfig && !completedSession && (
          <div className="my-2 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-foreground">Razorpay Test Key</span>
              <Badge variant="outline" className="text-[10px]">
                Demo Mode
              </Badge>
            </div>
            <p className="text-muted-foreground mb-3 leading-relaxed">
              ChargeHub uses Razorpay Test Mode. You can use the pre-configured test key or enter
              your own <code className="text-primary font-mono">rzp_test_...</code> key from the
              Razorpay Dashboard.
            </p>
            <div className="flex gap-2">
              <Input
                value={customKey}
                onChange={(e) => setCustomKey(e.target.value)}
                placeholder="rzp_test_..."
                className="h-8 text-xs font-mono"
              />
              <Button size="sm" onClick={handleSaveKey} className="h-8 text-xs">
                Save
              </Button>
            </div>
          </div>
        )}

        {/* ACTIVE CHARGING SESSION / RECEIPT VIEW */}
        {completedSession ? (
          <div className="space-y-6 pt-2">
            {/* Battery Charging HUD */}
            <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-background p-6 text-center shadow-glow">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
                <BatteryCharging className="h-8 w-8 text-primary-foreground animate-pulse" />
              </div>

              <div className="space-y-1">
                <div className="text-xs font-semibold uppercase tracking-wider text-primary">
                  {isCharging ? "Fast Charging in Progress" : "Charging Session Complete"}
                </div>
                <div className="font-display text-4xl font-bold tracking-tight text-foreground">
                  {chargingProgress}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Delivering ~{currentPower} kW at ₹{pricePerKwh}/kWh
                </p>
              </div>

              {/* Progress bar */}
              <div className="mt-5 h-3 w-full overflow-hidden rounded-full bg-muted/60 p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-primary transition-all duration-700 ease-out"
                  style={{ width: `${chargingProgress}%` }}
                />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border/40 pt-4 text-center">
                <div>
                  <div className="text-[10px] text-muted-foreground">Energy</div>
                  <div className="font-semibold text-foreground text-sm">
                    {((targetKwh * chargingProgress) / 100).toFixed(1)} / {targetKwh} kWh
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">Speed</div>
                  <div className="font-semibold text-foreground text-sm">{currentPower} kW</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">Est. Time</div>
                  <div className="font-semibold text-foreground text-sm">
                    {Math.max(1, Math.round((estimatedMinutes * (100 - chargingProgress)) / 100))}{" "}
                    mins
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Receipt breakdown */}
            <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                <span className="flex items-center gap-1.5">
                  <Receipt className="h-4 w-4 text-primary" />
                  Razorpay Receipt
                </span>
                <Badge
                  variant="outline"
                  className="border-status-available text-status-available text-[10px]"
                >
                  <CheckCircle2 className="h-3 w-3 mr-1 inline" /> Paid
                </Badge>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Payment ID</span>
                  <button
                    onClick={handleCopyPaymentId}
                    className="flex items-center gap-1 font-mono text-foreground hover:text-primary transition-colors"
                  >
                    {completedSession.razorpay_payment_id}
                    {copiedId ? (
                      <Check className="h-3 w-3 text-status-available" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Connector</span>
                  <span className="font-medium text-foreground">
                    {selectedConnector.type} ({selectedConnector.power_kw} kW)
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Energy Reserved</span>
                  <span className="font-medium text-foreground">{targetKwh} kWh</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Total Amount Paid</span>
                  <span className="font-bold text-foreground">
                    ₹{completedSession.amount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 sm:flex-row">
              {isCharging ? (
                <Button
                  variant="destructive"
                  className="flex-1 rounded-full text-xs font-semibold"
                  onClick={() => {
                    setIsCharging(false);
                    toast.info("Charging stopped by user");
                  }}
                >
                  Stop Charging
                </Button>
              ) : (
                <Button
                  className="flex-1 rounded-full bg-gradient-primary text-xs font-semibold shadow-glow"
                  onClick={resetModal}
                >
                  Done
                </Button>
              )}
              <Button variant="outline" className="rounded-full text-xs" onClick={resetModal}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          /* BOOKING & PAYMENT STEP */
          <div className="space-y-5 pt-1">
            {/* Step 1: Select Connector */}
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Select Connector</Label>
              <div className="mt-2 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {station.connectors.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedConnector(c)}
                    className={`flex flex-col items-start rounded-2xl border p-3 text-left transition-all ${
                      selectedConnector.id === c.id
                        ? "border-primary bg-primary/10 shadow-glow/20 ring-1 ring-primary"
                        : "border-border/60 bg-card hover:bg-accent/50"
                    }`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="font-display text-xs font-bold text-foreground">
                        {c.type}
                      </span>
                      <span
                        className={`h-2 w-2 rounded-full ${
                          c.status === "available"
                            ? "bg-status-available"
                            : c.status === "in_use"
                              ? "bg-status-busy"
                              : "bg-status-offline"
                        }`}
                      />
                    </div>
                    <div className="mt-1 text-[11px] font-semibold text-primary">
                      {c.power_kw} kW
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      ₹{c.price_per_kwh.toFixed(1)}/kWh
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Target Energy (kWh) */}
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-muted-foreground">
                  Charging Target:{" "}
                  <span className="font-bold text-foreground text-sm">{targetKwh} kWh</span>
                </Label>
                <span className="text-[11px] text-muted-foreground">
                  ~{estimatedMinutes} min charge time
                </span>
              </div>

              {/* Slider */}
              <Slider
                min={5}
                max={75}
                step={5}
                value={[targetKwh]}
                onValueChange={([val]) => setTargetKwh(val ?? 25)}
                className="mt-3 py-2"
              />

              {/* Quick Presets */}
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {[
                  { label: "10 kWh", val: 10, tag: "Quick" },
                  { label: "25 kWh", val: 25, tag: "Daily" },
                  { label: "40 kWh", val: 40, tag: "Highway" },
                  { label: "60 kWh", val: 60, tag: "Full" },
                ].map((preset) => (
                  <Button
                    key={preset.val}
                    type="button"
                    variant={targetKwh === preset.val ? "default" : "outline"}
                    size="sm"
                    className="h-7 rounded-full px-3 text-[11px]"
                    onClick={() => setTargetKwh(preset.val)}
                  >
                    {preset.label} <span className="ml-1 opacity-70">({preset.tag})</span>
                  </Button>
                ))}
              </div>
            </div>

            <Separator className="my-2" />

            {/* Cost Breakdown */}
            <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  Base Energy ({targetKwh} kWh × ₹{pricePerKwh.toFixed(2)})
                </span>
                <span className="font-medium text-foreground">₹{baseCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>GST / Infrastructure Fee (5%)</span>
                <span className="font-medium text-foreground">₹{gstCost.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between text-sm font-bold text-foreground">
                <span>Total Payable</span>
                <span className="font-display text-lg text-primary">₹{totalCost.toFixed(2)}</span>
              </div>
            </div>

            {/* Razorpay Trust Badge */}
            <div className="flex items-center justify-center gap-2 rounded-xl bg-card border border-border/50 py-2 px-3 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span>
                Secured by <strong>Razorpay</strong> • UPI, RuPay, Credit/Debit, NetBanking
              </span>
            </div>

            {/* Pay buttons */}
            <div className="space-y-2 pt-1">
              <Button
                id="razorpay-pay-btn"
                type="button"
                size="lg"
                disabled={isProcessing}
                onClick={handleStartPayment}
                className="w-full gap-2 rounded-full bg-gradient-primary py-5 text-sm font-semibold shadow-glow hover:opacity-90"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4" />
                )}
                Pay ₹{totalCost.toFixed(2)} with Razorpay
              </Button>

              <div className="flex items-center justify-between gap-2">
                <Button
                  id="razorpay-demo-simulate-btn"
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isProcessing}
                  onClick={handleSimulateDemo}
                  className="w-full text-xs text-muted-foreground hover:text-foreground hover:bg-accent/60"
                >
                  ⚡ Or Instant Test Simulation (Skip Gateway)
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
