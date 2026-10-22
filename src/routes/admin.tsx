import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  ShieldCheck,
  Building2,
  DollarSign,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Settings,
  Receipt,
  TrendingUp,
  FileText,
  Search,
  Filter,
  Loader2,
  RefreshCw,
  Zap,
  Home,
  Check,
  Ban,
  ArrowRight,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import {
  useAllMerchantProfiles,
  useAllBookings,
  useAllPayouts,
  useHomeChargers,
} from "@/hooks/useChargeData";
import {
  upsertMerchantProfile,
  updateHomeCharger,
  updatePayoutStatus,
  cancelMarketplaceBooking,
  DEFAULT_MARKETPLACE_SETTINGS,
} from "@/services/marketplaceService";
import type {
  MerchantProfile,
  HomeCharger,
  MarketplaceBooking,
  MarketplacePayout,
  MarketplaceSettings,
} from "@/lib/types";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/admin")({
  ssr: false,
  component: ProtectedAdminRoute,
  head: () => ({
    meta: [
      { title: "Marketplace Governance & Admin — EV360" },
      {
        name: "description",
        content:
          "Platform administration, host verification, commission configuration, and payouts.",
      },
    ],
  }),
});

function ProtectedAdminRoute() {
  return (
    <ProtectedRoute fallbackMessage="Please sign in to access the Administration Dashboard">
      <AdminDashboardPage />
    </ProtectedRoute>
  );
}

export function AdminDashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: merchants = [], refetch: refetchMerchants } = useAllMerchantProfiles();
  const { data: chargers = [], refetch: refetchChargers } = useHomeChargers();
  const { data: bookings = [], refetch: refetchBookings } = useAllBookings();
  const { data: payouts = [], refetch: refetchPayouts } = useAllPayouts();

  // Active Admin Tab
  const [activeTab, setActiveTab] = useState<
    "merchants" | "chargers" | "commission" | "payouts" | "bookings"
  >("merchants");

  // Commission Settings state
  const [commissionRate, setCommissionRate] = useState<number>(
    DEFAULT_MARKETPLACE_SETTINGS.platform_commission_percent,
  );
  const [minPayout, setMinPayout] = useState<number>(DEFAULT_MARKETPLACE_SETTINGS.min_payout_inr);
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);

  // Platform Metrics
  const metrics = {
    totalHosts: merchants.length,
    activeChargers: chargers.filter((c) => c.status === "active").length,
    totalBookings: bookings.length,
    totalGMV: bookings.reduce((sum, b) => sum + (b.status !== "cancelled" ? b.total_amount : 0), 0),
    totalCommissionRevenue: bookings.reduce(
      (sum, b) => sum + (b.status !== "cancelled" ? b.platform_commission_amount : 0),
      0,
    ),
    pendingPayouts: payouts.filter((p) => p.status === "requested").length,
  };

  // Host Action: Approve / Reject
  const handleHostStatus = async (
    merchant: MerchantProfile,
    nextStatus: "approved" | "rejected",
  ) => {
    try {
      await upsertMerchantProfile({
        ...merchant,
        status: nextStatus,
        rejection_reason:
          nextStatus === "rejected" ? "Identity documentation requires re-submission." : undefined,
      });
      toast.success(`Merchant ${merchant.full_name} is now ${nextStatus}.`);
      refetchMerchants();
    } catch {
      toast.error("Failed to update merchant status.");
    }
  };

  // Charger Action: Approve / Suspend / Reactivate
  const handleChargerStatus = async (
    chargerId: string,
    nextStatus: "active" | "suspended" | "rejected",
  ) => {
    try {
      await updateHomeCharger(chargerId, { status: nextStatus });
      toast.success(`Charger status updated to ${nextStatus}.`);
      refetchChargers();
      queryClient.invalidateQueries({ queryKey: ["stations"] });
    } catch {
      toast.error("Failed to update charger status.");
    }
  };

  // Payout Action: Approve / Mark Paid
  const handleApprovePayout = async (payoutId: string) => {
    try {
      const refId = `TXN_UTR_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      await updatePayoutStatus(payoutId, "completed", "Transferred via NEFT/IMPS", refId);
      toast.success(`Payout ${payoutId} marked as completed! Reference: ${refId}`);
      refetchPayouts();
    } catch {
      toast.error("Failed to approve payout.");
    }
  };

  // Booking Action: Refund / Cancel
  const handleCancelBooking = async (bookingId: string) => {
    try {
      const res = await cancelMarketplaceBooking(
        bookingId,
        "admin",
        "Admin processed cancellation.",
      );
      if (res.success) {
        toast.success(res.message);
        refetchBookings();
      } else {
        toast.error(res.message);
      }
    } catch {
      toast.error("Failed to cancel booking.");
    }
  };

  // Save Commission Settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setTimeout(() => {
      setIsSavingSettings(false);
      toast.success(
        `Platform commission updated to ${commissionRate}%. Min payout set to ₹${minPayout}.`,
      );
    }, 400);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 pt-24 pb-16 sm:px-6 lg:px-8">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Marketplace Administration & Governance
              </h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Review hosts, verify charger listings, configure platform commission, and manage
              financial payouts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 rounded-full" asChild>
              <Link to="/merchant">
                <Home className="h-4 w-4" />
                Merchant Dashboard
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 rounded-full" asChild>
              <Link to="/map">
                <Zap className="h-4 w-4 text-primary" />
                Map
              </Link>
            </Button>
          </div>
        </div>

        {/* Global Marketplace Performance Metrics */}
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-xs">
            <span className="text-xs text-muted-foreground block">Total Platform GMV</span>
            <p className="mt-1 text-xl font-bold text-foreground">₹{metrics.totalGMV.toFixed(2)}</p>
            <span className="text-[10px] text-muted-foreground">Driver transactions</span>
          </div>

          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 shadow-xs">
            <span className="text-xs text-primary font-medium block">EV360 Commission</span>
            <p className="mt-1 text-xl font-bold text-primary">
              ₹{metrics.totalCommissionRevenue.toFixed(2)}
            </p>
            <span className="text-[10px] text-muted-foreground">
              At {commissionRate}% platform fee
            </span>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-xs">
            <span className="text-xs text-muted-foreground block">Registered Hosts</span>
            <p className="mt-1 text-xl font-bold text-foreground">{metrics.totalHosts}</p>
            <span className="text-[10px] text-muted-foreground">Across Indian cities</span>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-xs">
            <span className="text-xs text-muted-foreground block">Active Chargers</span>
            <p className="mt-1 text-xl font-bold text-emerald-500">{metrics.activeChargers}</p>
            <span className="text-[10px] text-muted-foreground">Published on map</span>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-xs">
            <span className="text-xs text-muted-foreground block">Pending Payouts</span>
            <p className="mt-1 text-xl font-bold text-amber-500">{metrics.pendingPayouts}</p>
            <span className="text-[10px] text-muted-foreground">Awaiting transfer</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-8 flex gap-2 border-b border-border/50 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("merchants")}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-colors ${
              activeTab === "merchants"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            Host Applications ({merchants.length})
          </button>
          <button
            onClick={() => setActiveTab("chargers")}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-colors ${
              activeTab === "chargers"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            Charger Verification ({chargers.length})
          </button>
          <button
            onClick={() => setActiveTab("commission")}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-colors ${
              activeTab === "commission"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            Commission & Tariffs
          </button>
          <button
            onClick={() => setActiveTab("payouts")}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-colors ${
              activeTab === "payouts"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            Payout Approvals ({payouts.length})
          </button>
          <button
            onClick={() => setActiveTab("bookings")}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-colors ${
              activeTab === "bookings"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            All Bookings ({bookings.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {/* TAB 1: HOST APPLICATIONS */}
          {activeTab === "merchants" && (
            <div className="space-y-4">
              <h3 className="font-display font-semibold text-base text-foreground">
                Merchant & Host Onboarding Applications
              </h3>

              {merchants.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-xs text-muted-foreground">
                  No merchant applications found. (Users can register via the "Become a Host" flow).
                </div>
              ) : (
                <div className="space-y-3">
                  {merchants.map((m) => (
                    <div
                      key={m.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border/60 bg-card p-5 shadow-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-foreground">{m.full_name}</h4>
                          <Badge
                            variant="secondary"
                            className={`text-[10px] uppercase font-semibold ${
                              m.status === "approved"
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                : m.status === "rejected"
                                  ? "bg-destructive/15 text-destructive"
                                  : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            {m.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Phone: {m.phone} | Email: {m.email}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          ID: {m.id_document_type.toUpperCase()} ({m.id_document_number}) |
                          Property: {m.property_type}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {m.status !== "approved" && (
                          <Button
                            size="sm"
                            className="h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1 font-semibold"
                            onClick={() => handleHostStatus(m, "approved")}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Approve
                          </Button>
                        )}
                        {m.status !== "rejected" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-xl border-destructive/30 text-destructive text-xs gap-1"
                            onClick={() => handleHostStatus(m, "rejected")}
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Reject
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CHARGER VERIFICATION */}
          {activeTab === "chargers" && (
            <div className="space-y-4">
              <h3 className="font-display font-semibold text-base text-foreground">
                All Listed Home Chargers
              </h3>

              <div className="grid gap-4 md:grid-cols-2">
                {chargers.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-2xl border border-border/60 bg-card p-5 shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-foreground">{c.title}</h4>
                          <Badge
                            variant="secondary"
                            className={`text-[10px] uppercase font-semibold ${
                              c.status === "active"
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {c.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Host: {c.host_name || "Host"} | {c.address_approx}
                        </p>
                      </div>

                      <span className="text-sm font-bold text-primary">
                        ₹{c.price_rate}/{c.pricing_type === "per_session" ? "session" : "kWh"}
                      </span>
                    </div>

                    <div className="text-xs text-muted-foreground space-y-1 bg-muted/40 p-2.5 rounded-xl border border-border/50">
                      <p>
                        Hardware: {c.charger_brand} ({c.power_kw} kW {c.current_type} •{" "}
                        {c.connector_type})
                      </p>
                      <p>Exact Address (Protected): {c.address_full}</p>
                      <p>Access Instructions: {c.access_instructions || "None"}</p>
                    </div>

                    <div className="flex items-center gap-2 border-t border-border/50 pt-2.5">
                      {c.status !== "active" ? (
                        <Button
                          size="sm"
                          className="h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1 font-semibold"
                          onClick={() => handleChargerStatus(c.id, "active")}
                        >
                          <Check className="h-3 w-3" />
                          Approve & Publish
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-xl border-amber-500/40 text-amber-500 text-xs gap-1"
                          onClick={() => handleChargerStatus(c.id, "suspended")}
                        >
                          <Ban className="h-3 w-3" />
                          Suspend Listing
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: COMMISSION CONFIG */}
          {activeTab === "commission" && (
            <div className="max-w-xl rounded-2xl border border-border/60 bg-card p-6 shadow-xs space-y-5">
              <div>
                <h3 className="font-display font-semibold text-base text-foreground">
                  Marketplace Platform Fee & Commission
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Configure the revenue share deducted by EV360 from completed peer-to-peer charging
                  sessions.
                </p>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <Label htmlFor="comm-rate" className="text-xs font-semibold">
                    Platform Commission Rate (%)
                  </Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="comm-rate"
                      type="number"
                      min="0"
                      max="50"
                      step="0.5"
                      value={commissionRate}
                      onChange={(e) => setCommissionRate(Number(e.target.value))}
                      className="w-32"
                    />
                    <span className="text-xs text-muted-foreground">
                      Current split: <strong>{commissionRate}% Platform</strong> /{" "}
                      <strong>{100 - commissionRate}% Host</strong>
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="min-pay" className="text-xs font-semibold">
                    Minimum Payout Threshold (₹)
                  </Label>
                  <Input
                    id="min-pay"
                    type="number"
                    min="100"
                    step="100"
                    value={minPayout}
                    onChange={(e) => setMinPayout(Number(e.target.value))}
                    className="w-32"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Hosts cannot withdraw earnings until their balance reaches this minimum amount.
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={isSavingSettings}
                  className="rounded-xl bg-gradient-primary shadow-glow text-primary-foreground font-semibold gap-1.5"
                >
                  {isSavingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Save Marketplace Settings
                </Button>
              </form>
            </div>
          )}

          {/* TAB 4: PAYOUT APPROVALS */}
          {activeTab === "payouts" && (
            <div className="space-y-4">
              <h3 className="font-display font-semibold text-base text-foreground">
                Host Withdrawal Requests
              </h3>

              {payouts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-xs text-muted-foreground">
                  No payout requests currently submitted.
                </div>
              ) : (
                <div className="space-y-3">
                  {payouts.map((p) => (
                    <div
                      key={p.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-foreground">
                            {p.id}
                          </span>
                          <Badge
                            variant="secondary"
                            className={`text-[10px] uppercase font-semibold ${
                              p.status === "completed"
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            {p.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Host ID: {p.host_id} | Method: {p.payout_method}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Requested on {new Date(p.requested_at).toLocaleString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-emerald-500">
                          ₹{p.amount.toFixed(2)}
                        </span>
                        {p.status !== "completed" && (
                          <Button
                            size="sm"
                            className="h-8 rounded-xl bg-gradient-primary shadow-glow text-primary-foreground text-xs font-semibold gap-1"
                            onClick={() => handleApprovePayout(p.id)}
                          >
                            <Check className="h-3.5 w-3.5" />
                            Approve Transfer
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: ALL BOOKINGS */}
          {activeTab === "bookings" && (
            <div className="space-y-4">
              <h3 className="font-display font-semibold text-base text-foreground">
                All Platform Bookings & Financial Records
              </h3>

              {bookings.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-xs text-muted-foreground">
                  No bookings recorded yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {bookings.map((b) => (
                    <div
                      key={b.id}
                      className="rounded-2xl border border-border/60 bg-card p-4 shadow-xs space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-primary">{b.booking_ref}</span>
                          <Badge
                            variant="secondary"
                            className="text-[10px] uppercase font-semibold"
                          >
                            {b.status}
                          </Badge>
                        </div>
                        <span className="font-bold text-foreground">
                          Paid: ₹{b.total_amount.toFixed(2)} (Platform: ₹
                          {b.platform_commission_amount.toFixed(2)} • Host: ₹
                          {b.merchant_earnings.toFixed(2)})
                        </span>
                      </div>

                      <p className="text-muted-foreground">
                        Time: {new Date(b.start_time).toLocaleString()} –{" "}
                        {new Date(b.end_time).toLocaleTimeString()}
                      </p>

                      <div className="flex items-center justify-between border-t border-border/50 pt-2 text-[11px] text-muted-foreground">
                        <span>
                          User: {b.user_id} | Host: {b.host_id}
                        </span>
                        {b.status !== "cancelled" && b.status !== "refunded" && (
                          <button
                            onClick={() => handleCancelBooking(b.id)}
                            className="text-destructive font-semibold hover:underline"
                          >
                            Cancel & Refund
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
