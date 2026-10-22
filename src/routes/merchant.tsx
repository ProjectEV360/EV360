import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import {
  Home,
  Zap,
  DollarSign,
  Calendar,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Plus,
  Edit,
  Power,
  Ban,
  TrendingUp,
  CreditCard,
  Building2,
  ChevronRight,
  Loader2,
  User,
  Star,
  MapPin,
  Lock,
  ArrowRight,
  ArrowLeft,
  Check,
  RefreshCw,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import {
  useMerchantProfile,
  useHostEarnings,
  useHostBookings,
  useHostPayouts,
  useHomeChargers,
} from "@/hooks/useChargeData";
import {
  upsertMerchantProfile,
  createHomeCharger,
  updateHomeCharger,
  deleteHomeCharger,
  requestHostPayout,
  addBlockedSlot,
  removeBlockedSlot,
  getBlockedSlots,
  cancelMarketplaceBooking,
  type HostEarningsSummary,
} from "@/services/marketplaceService";
import type {
  MerchantProfile,
  HomeCharger,
  MarketplaceBooking,
  ChargerBlockedSlot,
} from "@/lib/types";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/merchant")({
  ssr: false,
  component: ProtectedMerchantRoute,
  head: () => ({
    meta: [
      { title: "Host & Merchant Dashboard — EV360" },
      {
        name: "description",
        content: "Manage your home EV chargers, bookings, and earnings on EV360.",
      },
    ],
  }),
});

function ProtectedMerchantRoute() {
  return (
    <ProtectedRoute fallbackMessage="Please sign in to access the Host Merchant Dashboard">
      <MerchantDashboardPage />
    </ProtectedRoute>
  );
}

export function MerchantDashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Load Host Data
  const { data: merchantProfile, isLoading: profileLoading } = useMerchantProfile(user?.id);
  const {
    data: earnings,
    isLoading: earningsLoading,
    refetch: refetchEarnings,
  } = useHostEarnings(user?.id);
  const {
    data: hostBookings = [],
    isLoading: bookingsLoading,
    refetch: refetchBookings,
  } = useHostBookings(user?.id);
  const {
    data: payouts = [],
    isLoading: payoutsLoading,
    refetch: refetchPayouts,
  } = useHostPayouts(user?.id);
  const { data: allChargers = [], refetch: refetchChargers } = useHomeChargers(user?.id);

  // Filter only chargers owned by this user
  const hostChargers = useMemo(() => {
    if (!user) return [];
    return allChargers.filter((c) => c.host_id === user.id);
  }, [allChargers, user]);

  // Active Dashboard Tab
  const [activeTab, setActiveTab] = useState<"overview" | "chargers" | "bookings" | "payouts">(
    "overview",
  );

  // Onboarding Wizard Modal State
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [wizardStep, setWizardStep] = useState<number>(1);

  // Onboarding Form State
  const [hostFullName, setHostFullName] = useState<string>("");
  const [hostPhone, setHostPhone] = useState<string>("");
  const [hostEmail, setHostEmail] = useState<string>("");
  const [idDocType, setIdDocType] = useState<string>("aadhaar");
  const [idDocNumber, setIdDocNumber] = useState<string>("");
  const [propertyType, setPropertyType] = useState<
    "individual_house" | "apartment" | "villa" | "commercial_residential"
  >("individual_house");
  const [tariffDeclared, setTariffDeclared] = useState<boolean>(true);
  const [bankAccountName, setBankAccountName] = useState<string>("");
  const [bankAccountNumber, setBankAccountNumber] = useState<string>("");
  const [bankIfsc, setBankIfsc] = useState<string>("");
  const [upiId, setUpiId] = useState<string>("");
  const [isSubmittingHost, setIsSubmittingHost] = useState<boolean>(false);

  // Charger Modal State (Add / Edit)
  const [chargerModalOpen, setChargerModalOpen] = useState<boolean>(false);
  const [editingChargerId, setEditingChargerId] = useState<string | null>(null);
  const [chargerTitle, setChargerTitle] = useState<string>("");
  const [chargerDesc, setChargerDesc] = useState<string>("");
  const [chargerBrand, setChargerBrand] = useState<string>("Schneider Electric");
  const [chargerModel, setChargerModel] = useState<string>("EVlink 7.4kW");
  const [currentType, setCurrentType] = useState<"AC" | "DC">("AC");
  const [connectorType, setConnectorType] = useState<string>("Type 2");
  const [powerKw, setPowerKw] = useState<number>(7.4);
  const [pricingType, setPricingType] = useState<"per_kwh" | "per_session">("per_kwh");
  const [priceRate, setPriceRate] = useState<number>(16);
  const [addressFull, setAddressFull] = useState<string>("");
  const [addressApprox, setAddressApprox] = useState<string>("");
  const [city, setCity] = useState<string>("Mumbai");
  const [lat, setLat] = useState<number>(19.2458);
  const [lng, setLng] = useState<number>(72.8523);
  const [accessInstructions, setAccessInstructions] = useState<string>("");
  const [startHour, setStartHour] = useState<string>("08:00");
  const [endHour, setEndHour] = useState<string>("22:00");
  const [isSavingCharger, setIsSavingCharger] = useState<boolean>(false);

  // Block Slot Modal State
  const [blockModalOpen, setBlockModalOpen] = useState<boolean>(false);
  const [selectedChargerForBlock, setSelectedChargerForBlock] = useState<string>("");
  const [blockDate, setBlockDate] = useState<string>(() => new Date().toISOString().split("T")[0]!);
  const [blockStart, setBlockStart] = useState<string>("14:00");
  const [blockEnd, setBlockEnd] = useState<string>("18:00");
  const [blockReason, setBlockReason] = useState<string>("Personal vehicle charging");
  const [activeBlockedSlots, setActiveBlockedSlots] = useState<ChargerBlockedSlot[]>([]);

  // Payout Request Modal
  const [payoutModalOpen, setPayoutModalOpen] = useState<boolean>(false);
  const [payoutAmount, setPayoutAmount] = useState<string>("500");
  const [payoutMethod, setPayoutMethod] = useState<string>("bank_transfer");
  const [isRequestingPayout, setIsRequestingPayout] = useState<boolean>(false);

  // Prefill from user auth metadata
  useEffect(() => {
    if (user) {
      const meta = (user.user_metadata || {}) as Record<string, string | undefined>;
      setHostFullName(merchantProfile?.full_name || meta["full_name"] || meta["name"] || "");
      setHostPhone(merchantProfile?.phone || meta["phone"] || user.phone || "");
      setHostEmail(merchantProfile?.email || user.email || "");
      if (merchantProfile) {
        setIdDocType(merchantProfile.id_document_type || "aadhaar");
        setIdDocNumber(merchantProfile.id_document_number || "");
        setPropertyType(merchantProfile.property_type || "individual_house");
        setTariffDeclared(merchantProfile.electricity_tariff_declared ?? true);
        setBankAccountName(merchantProfile.bank_account_name || "");
        setBankAccountNumber(merchantProfile.bank_account_number || "");
        setBankIfsc(merchantProfile.bank_ifsc || "");
        setUpiId(merchantProfile.upi_id || "");
      }
    }
  }, [user, merchantProfile]);

  // Open Block Slot Modal handler
  const handleOpenBlockModal = async (chargerId: string) => {
    setSelectedChargerForBlock(chargerId);
    const slots = await getBlockedSlots(chargerId);
    setActiveBlockedSlots(slots);
    setBlockModalOpen(true);
  };

  const handleCreateBlockedSlot = async () => {
    if (!selectedChargerForBlock) return;
    try {
      const startIso = new Date(`${blockDate}T${blockStart}:00`).toISOString();
      const endIso = new Date(`${blockDate}T${blockEnd}:00`).toISOString();
      await addBlockedSlot(selectedChargerForBlock, startIso, endIso, blockReason);
      const updated = await getBlockedSlots(selectedChargerForBlock);
      setActiveBlockedSlots(updated);
      toast.success("Time slot blocked successfully!");
    } catch {
      toast.error("Failed to block slot.");
    }
  };

  const handleRemoveBlockedSlot = async (slotId: string) => {
    if (!selectedChargerForBlock) return;
    try {
      await removeBlockedSlot(slotId, selectedChargerForBlock);
      const updated = await getBlockedSlots(selectedChargerForBlock);
      setActiveBlockedSlots(updated);
      toast.success("Blocked slot removed.");
    } catch {
      toast.error("Failed to remove blocked slot.");
    }
  };

  // Submit Host Profile
  const handleSubmitHostRegistration = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) return;

    if (!hostFullName.trim() || !hostPhone.trim() || !idDocNumber.trim()) {
      toast.error("Please fill in all required host and verification fields.");
      return;
    }

    setIsSubmittingHost(true);
    try {
      await upsertMerchantProfile({
        id: user.id,
        full_name: hostFullName.trim(),
        phone: hostPhone.trim(),
        email: hostEmail.trim() || user.email || "",
        id_document_type: idDocType,
        id_document_number: idDocNumber.trim(),
        property_type: propertyType,
        electricity_tariff_declared: tariffDeclared,
        status: "approved", // In test/demo mode, set to approved immediately so user can immediately test!
        bank_account_name: bankAccountName.trim() || null,
        bank_account_number: bankAccountNumber.trim() || null,
        bank_ifsc: bankIfsc.trim() || null,
        upi_id: upiId.trim() || null,
      });

      queryClient.invalidateQueries({ queryKey: ["merchant-profile", user.id] });
      toast.success("Host registration approved! You can now publish chargers.");
      setShowOnboarding(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to register host profile.");
    } finally {
      setIsSubmittingHost(false);
    }
  };

  // Save Charger (Add or Edit)
  const handleSaveCharger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!chargerTitle.trim() || !addressFull.trim() || !addressApprox.trim()) {
      toast.error("Please provide title, exact address, and public approximate area.");
      return;
    }

    setIsSavingCharger(true);
    try {
      if (editingChargerId) {
        await updateHomeCharger(editingChargerId, {
          title: chargerTitle.trim(),
          description: chargerDesc.trim(),
          charger_brand: chargerBrand,
          charger_model: chargerModel,
          current_type: currentType,
          connector_type: connectorType,
          power_kw: Number(powerKw),
          pricing_type: pricingType,
          price_rate: Number(priceRate),
          address_full: addressFull.trim(),
          address_approx: addressApprox.trim(),
          city: city.trim(),
          lat: Number(lat),
          lng: Number(lng),
          access_instructions: accessInstructions.trim(),
          start_time: startHour,
          end_time: endHour,
        });
        toast.success("Charger listing updated!");
      } else {
        await createHomeCharger({
          host_id: user.id,
          title: chargerTitle.trim(),
          description: chargerDesc.trim(),
          charger_brand: chargerBrand,
          charger_model: chargerModel,
          current_type: currentType,
          connector_type: connectorType,
          power_kw: Number(powerKw),
          pricing_type: pricingType,
          price_rate: Number(priceRate),
          address_full: addressFull.trim(),
          address_approx: addressApprox.trim(),
          city: city.trim(),
          lat: Number(lat),
          lng: Number(lng),
          approx_lat: Number(lat) + 0.002,
          approx_lng: Number(lng) + 0.002,
          access_instructions: accessInstructions.trim(),
          photos: [
            "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=800&q=80",
          ],
          amenities: ["Covered Parking", "CCTV Security", "Wi-Fi"],
          available_days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
          start_time: startHour,
          end_time: endHour,
          instant_booking: true,
          cancellation_policy: "Flexible: Free cancellation up to 2 hours before scheduled slot.",
          status: "active",
          host_name: hostFullName || user.email || "Host",
          host_phone: hostPhone,
        });
        toast.success("New charger published and active on the map!");
      }

      setChargerModalOpen(false);
      refetchChargers();
      queryClient.invalidateQueries({ queryKey: ["home-chargers"] });
      queryClient.invalidateQueries({ queryKey: ["stations"] });
    } catch (err) {
      console.error(err);
      toast.error("Failed to save charger listing.");
    } finally {
      setIsSavingCharger(false);
    }
  };

  // Toggle Charger Active / Inactive
  const handleToggleChargerStatus = async (charger: HomeCharger) => {
    const nextStatus = charger.status === "active" ? "inactive" : "active";
    try {
      await updateHomeCharger(charger.id, { status: nextStatus });
      toast.success(`Charger is now ${nextStatus === "active" ? "Live" : "Temporarily Inactive"}.`);
      refetchChargers();
      queryClient.invalidateQueries({ queryKey: ["stations"] });
    } catch {
      toast.error("Failed to update status.");
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (charger: HomeCharger) => {
    setEditingChargerId(charger.id);
    setChargerTitle(charger.title);
    setChargerDesc(charger.description || "");
    setChargerBrand(charger.charger_brand);
    setChargerModel(charger.charger_model || "");
    setCurrentType(charger.current_type);
    setConnectorType(charger.connector_type);
    setPowerKw(charger.power_kw);
    setPricingType(charger.pricing_type);
    setPriceRate(charger.price_rate);
    setAddressFull(charger.address_full);
    setAddressApprox(charger.address_approx);
    setCity(charger.city);
    setLat(charger.lat);
    setLng(charger.lng);
    setAccessInstructions(charger.access_instructions || "");
    setStartHour(charger.start_time);
    setEndHour(charger.end_time);
    setChargerModalOpen(true);
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingChargerId(null);
    setChargerTitle("");
    setChargerDesc("");
    setChargerBrand("Schneider Electric");
    setChargerModel("EVlink 7.4kW");
    setCurrentType("AC");
    setConnectorType("Type 2");
    setPowerKw(7.4);
    setPricingType("per_kwh");
    setPriceRate(16);
    setAddressFull("");
    setAddressApprox("");
    setCity("Mumbai");
    setLat(19.2458);
    setLng(72.8523);
    setAccessInstructions("");
    setStartHour("08:00");
    setEndHour("22:00");
    setChargerModalOpen(true);
  };

  // Request Payout
  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const amount = Number(payoutAmount);
    const balance = earnings?.availableBalanceInRupees ?? 0;

    if (amount < 500) {
      toast.error("Minimum payout withdrawal is ₹500.");
      return;
    }
    if (amount > balance) {
      toast.error(`Requested amount exceeds available balance of ₹${balance.toFixed(2)}.`);
      return;
    }

    setIsRequestingPayout(true);
    try {
      await requestHostPayout(user.id, amount, payoutMethod);
      toast.success("Payout request submitted! Admin will process transfer.");
      setPayoutModalOpen(false);
      refetchEarnings();
      refetchPayouts();
    } catch {
      toast.error("Failed to submit payout request.");
    } finally {
      setIsRequestingPayout(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 pt-24 pb-16 sm:px-6 lg:px-8">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
                <Home className="h-5 w-5" />
              </span>
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Host & Merchant Dashboard
              </h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Monetize your private home EV charger, manage bookings, and track transparent
              earnings.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!merchantProfile ? (
              <Button
                className="gap-2 rounded-full bg-gradient-primary shadow-glow text-primary-foreground font-semibold"
                onClick={() => setShowOnboarding(true)}
              >
                <Plus className="h-4 w-4" />
                Become a Host
              </Button>
            ) : (
              <Button
                className="gap-2 rounded-full bg-gradient-primary shadow-glow text-primary-foreground font-semibold"
                onClick={handleOpenAdd}
              >
                <Plus className="h-4 w-4" />
                Add Charger Listing
              </Button>
            )}
            <Button variant="outline" size="sm" className="gap-1.5 rounded-full" asChild>
              <Link to="/map">
                <MapPin className="h-4 w-4" />
                View Map
              </Link>
            </Button>
          </div>
        </div>

        {/* Not registered as host banner */}
        {!merchantProfile && (
          <div className="mt-6 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-primary/10 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <Badge
                  variant="outline"
                  className="border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10"
                >
                  New Opportunity
                </Badge>
                <h3 className="font-display text-lg font-bold text-foreground">
                  Earn Passive Income From Your Home EV Charger
                </h3>
                <p className="text-xs text-muted-foreground max-w-2xl">
                  Join hundreds of verified EV owners monetizing their home chargers. Set your own
                  pricing (per kWh or per session), specify available days & hours, and receive
                  guaranteed payouts directly into your bank account.
                </p>
              </div>
              <Button
                onClick={() => setShowOnboarding(true)}
                className="shrink-0 gap-2 rounded-full bg-gradient-primary shadow-glow text-primary-foreground font-semibold"
              >
                Register as Host
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Metrics Row */}
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Total Gross Revenue</span>
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
              ₹{earnings?.totalGrossInRupees?.toFixed(2) ?? "0.00"}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">From all customer sessions</p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Platform Fee (10%)</span>
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-muted-foreground">
              -₹{earnings?.totalPlatformCommissionInRupees?.toFixed(2) ?? "0.00"}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">EV360 marketplace fee</p>
          </div>

          <div className="rounded-2xl border border-primary/40 bg-primary/5 p-5 shadow-xs">
            <div className="flex items-center justify-between text-primary">
              <span className="text-xs font-semibold">Available for Payout</span>
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-primary">
              ₹{earnings?.availableBalanceInRupees?.toFixed(2) ?? "0.00"}
            </p>
            <button
              onClick={() => setPayoutModalOpen(true)}
              className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
            >
              Request Withdrawal →
            </button>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Completed Sessions</span>
              <Zap className="h-4 w-4 text-amber-500" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
              {earnings?.totalCompletedSessions ?? 0}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {earnings?.upcomingBookingsCount ?? 0} upcoming reservations
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-8 flex gap-2 border-b border-border/50 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-colors ${
              activeTab === "overview"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            Overview & Stats
          </button>
          <button
            onClick={() => setActiveTab("chargers")}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-colors ${
              activeTab === "chargers"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            My Chargers ({hostChargers.length})
          </button>
          <button
            onClick={() => setActiveTab("bookings")}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-colors ${
              activeTab === "bookings"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            Bookings & Sessions ({hostBookings.length})
          </button>
          <button
            onClick={() => setActiveTab("payouts")}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-colors ${
              activeTab === "payouts"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            Payout History ({payouts.length})
          </button>
        </div>

        {/* Tab Contents */}
        <div className="mt-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="grid gap-6 lg:grid-cols-12">
              {/* Recent Bookings Section */}
              <div className="lg:col-span-8 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-semibold text-base text-foreground">
                    Recent Customer Reservations
                  </h3>
                  <button
                    onClick={() => setActiveTab("bookings")}
                    className="text-xs text-primary font-medium hover:underline"
                  >
                    View All →
                  </button>
                </div>

                {hostBookings.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
                    <Zap className="mx-auto h-8 w-8 text-muted-foreground/40" />
                    <p className="mt-2 text-sm font-semibold text-foreground">No bookings yet</p>
                    <p className="text-xs text-muted-foreground">
                      When EV drivers book your charger on the map, their reservations will appear
                      here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {hostBookings.slice(0, 5).map((b) => (
                      <div
                        key={b.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-primary">
                              {b.booking_ref}
                            </span>
                            <Badge
                              variant="secondary"
                              className={`text-[10px] uppercase font-semibold ${
                                b.status === "confirmed"
                                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                  : b.status === "in_progress"
                                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                    : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {b.status}
                            </Badge>
                          </div>
                          <p className="text-xs font-medium text-foreground">
                            {new Date(b.start_time).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}{" "}
                            at{" "}
                            {new Date(b.start_time).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Duration: {b.duration_hours} hr | Target: {b.target_kwh ?? 20} kWh
                          </p>
                        </div>

                        <div className="text-right sm:border-l sm:border-border/50 sm:pl-4">
                          <span className="text-xs text-muted-foreground block">Your Earnings</span>
                          <span className="text-base font-bold text-emerald-500">
                            ₹{b.merchant_earnings.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-muted-foreground block">
                            (Paid: ₹{b.total_amount.toFixed(2)})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Host Summary Profile & Payout Details */}
              <div className="lg:col-span-4 space-y-4">
                <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-3">
                  <h3 className="font-display font-semibold text-sm text-foreground flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Host Verification Status
                  </h3>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge
                      variant="outline"
                      className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                    >
                      Active Verified Host
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Commission Rate:</span>
                    <span className="font-semibold text-foreground">10% Platform Share</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Your Net Share:</span>
                    <span className="font-semibold text-emerald-500">90% of Gross Revenue</span>
                  </div>
                  <Separator />
                  <div className="space-y-1 text-xs">
                    <span className="text-muted-foreground block">Linked Payout Account:</span>
                    <span className="font-mono text-foreground block">
                      {merchantProfile?.upi_id
                        ? `UPI: ${merchantProfile.upi_id}`
                        : merchantProfile?.bank_account_number
                          ? `A/C: ••••${merchantProfile.bank_account_number.slice(-4)} (${merchantProfile.bank_ifsc})`
                          : "Bank Account Configured (Default)"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MY CHARGERS */}
          {activeTab === "chargers" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display font-semibold text-base text-foreground">
                    Charger Listings
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Manage charger specs, pricing, and availability on the EV360 interactive map.
                  </p>
                </div>
                <Button
                  onClick={handleOpenAdd}
                  className="gap-1.5 rounded-full bg-gradient-primary shadow-glow text-primary-foreground text-xs font-semibold"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Charger
                </Button>
              </div>

              {hostChargers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
                  <Home className="mx-auto h-10 w-10 text-muted-foreground/40" />
                  <h4 className="mt-3 text-base font-semibold text-foreground">
                    No home chargers listed yet
                  </h4>
                  <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
                    Publish your wallbox or portable charger to let nearby drivers discover and book
                    charging slots.
                  </p>
                  <Button onClick={handleOpenAdd} className="mt-4 gap-1.5 rounded-full">
                    <Plus className="h-4 w-4" />
                    Add First Charger
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {hostChargers.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-2xl border border-border/60 bg-card p-5 shadow-xs space-y-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-display font-bold text-base text-foreground">
                              {c.title}
                            </h4>
                            <Badge
                              variant={c.status === "active" ? "default" : "secondary"}
                              className={`text-[10px] uppercase font-semibold ${
                                c.status === "active"
                                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {c.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{c.address_approx}</p>
                        </div>

                        <div className="text-right">
                          <span className="text-base font-bold text-primary">
                            ₹{c.price_rate}/{c.pricing_type === "per_session" ? "session" : "kWh"}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center rounded-xl bg-muted/40 p-2.5 text-xs border border-border/50">
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Power</span>
                          <span className="font-semibold text-foreground">
                            {c.power_kw} kW ({c.current_type})
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Connector</span>
                          <span className="font-semibold text-foreground">{c.connector_type}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Hours</span>
                          <span className="font-semibold text-foreground">
                            {c.start_time} - {c.end_time}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-3">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={c.status === "active"}
                            onCheckedChange={() => handleToggleChargerStatus(c)}
                            id={`toggle-${c.id}`}
                          />
                          <Label
                            htmlFor={`toggle-${c.id}`}
                            className="text-xs text-muted-foreground cursor-pointer"
                          >
                            {c.status === "active" ? "Available on Map" : "Offline / Disabled"}
                          </Label>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-lg text-xs gap-1"
                            onClick={() => handleOpenBlockModal(c.id)}
                          >
                            <Clock className="h-3 w-3" />
                            Block Slots
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-8 rounded-lg text-xs gap-1"
                            onClick={() => handleOpenEdit(c)}
                          >
                            <Edit className="h-3 w-3" />
                            Edit
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: BOOKINGS & SESSIONS */}
          {activeTab === "bookings" && (
            <div className="space-y-4">
              <h3 className="font-display font-semibold text-base text-foreground">
                All Driver Reservations
              </h3>

              {hostBookings.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
                  <p className="text-sm font-semibold text-foreground">
                    No booking requests found.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {hostBookings.map((b) => (
                    <div
                      key={b.id}
                      className="rounded-2xl border border-border/60 bg-card p-5 shadow-xs space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold text-primary">
                              {b.booking_ref}
                            </span>
                            <Badge
                              variant="secondary"
                              className={`text-[10px] uppercase font-semibold ${
                                b.status === "confirmed"
                                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                  : b.status === "completed"
                                    ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                                    : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {b.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-foreground font-medium">
                            Scheduled:{" "}
                            {new Date(b.start_time).toLocaleString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            –{" "}
                            {new Date(b.end_time).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="text-xs text-muted-foreground block">
                            Host Share (90%)
                          </span>
                          <span className="text-lg font-bold text-emerald-500">
                            ₹{b.merchant_earnings.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-2.5 text-xs text-muted-foreground">
                        <span>Energy Target: {b.target_kwh ?? 20} kWh</span>
                        <span>Customer Paid: ₹{b.total_amount.toFixed(2)}</span>
                        <span>Platform Fee: ₹{b.platform_commission_amount.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PAYOUTS */}
          {activeTab === "payouts" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display font-semibold text-base text-foreground">
                    Earnings Payout Ledger
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Withdraw net charging income to your verified Indian bank account or UPI ID.
                  </p>
                </div>
                <Button
                  onClick={() => setPayoutModalOpen(true)}
                  className="gap-1.5 rounded-full bg-gradient-primary shadow-glow text-primary-foreground text-xs font-semibold"
                >
                  <DollarSign className="h-4 w-4" />
                  Request Withdrawal
                </Button>
              </div>

              {payouts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
                  <CreditCard className="mx-auto h-8 w-8 text-muted-foreground/40" />
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    No payout requests yet
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Available balance: ₹{earnings?.availableBalanceInRupees?.toFixed(2) ?? "0.00"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payouts.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-2xl border border-border/60 bg-card p-4 shadow-xs"
                    >
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-foreground block">
                          Payout Reference: {p.id}
                        </span>
                        <span className="text-[11px] text-muted-foreground block">
                          Requested on{" "}
                          {new Date(p.requested_at).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="text-right">
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
                        <p className="text-base font-bold text-foreground mt-0.5">
                          ₹{p.amount.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── MODAL 1: Become a Host Onboarding Wizard ─── */}
      <Dialog open={showOnboarding} onOpenChange={setShowOnboarding}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="border-amber-500/30 text-amber-500 bg-amber-500/10"
              >
                Step {wizardStep} of 3
              </Badge>
              <DialogTitle className="text-lg font-bold">
                {wizardStep === 1 && "Host Identity & Property"}
                {wizardStep === 2 && "Electricity Tariff & Payouts"}
                {wizardStep === 3 && "Review & Complete"}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Register to monetize your personal EV charger on the EV360 marketplace.
            </DialogDescription>
          </DialogHeader>

          {wizardStep === 1 && (
            <div className="space-y-4 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="h-name" className="text-xs">
                    Full Name
                  </Label>
                  <Input
                    id="h-name"
                    value={hostFullName}
                    onChange={(e) => setHostFullName(e.target.value)}
                    placeholder="e.g. Rohan Mhatre"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="h-phone" className="text-xs">
                    Phone Number
                  </Label>
                  <Input
                    id="h-phone"
                    value={hostPhone}
                    onChange={(e) => setHostPhone(e.target.value)}
                    placeholder="+91 98201 12345"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="h-id-type" className="text-xs">
                    ID Document Type
                  </Label>
                  <select
                    id="h-id-type"
                    value={idDocType}
                    onChange={(e) => setIdDocType(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary"
                  >
                    <option value="aadhaar">Aadhaar Card</option>
                    <option value="pan">PAN Card</option>
                    <option value="voter_id">Voter ID</option>
                    <option value="passport">Passport</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="h-id-num" className="text-xs">
                    Document Number
                  </Label>
                  <Input
                    id="h-id-num"
                    value={idDocNumber}
                    onChange={(e) => setIdDocNumber(e.target.value)}
                    placeholder="e.g. 1234 5678 9012"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="h-prop-type" className="text-xs">
                  Property Ownership / Type
                </Label>
                <select
                  id="h-prop-type"
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value as typeof propertyType)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary"
                >
                  <option value="individual_house">Independent House / Bungalow</option>
                  <option value="villa">Gated Villa Community</option>
                  <option value="apartment">Apartment / Society (Designated Bay)</option>
                  <option value="commercial_residential">Commercial / Residential Mixed</option>
                </select>
              </div>

              <Button
                type="button"
                className="w-full rounded-xl bg-gradient-primary shadow-glow text-primary-foreground font-semibold mt-4"
                onClick={() => {
                  if (!hostFullName || !hostPhone || !idDocNumber) {
                    toast.error("Please fill in full name, phone, and document number.");
                    return;
                  }
                  setWizardStep(2);
                }}
              >
                Continue to Payout Details →
              </Button>
            </div>
          )}

          {wizardStep === 2 && (
            <div className="space-y-4 py-2 text-xs">
              <div className="space-y-1">
                <Label htmlFor="h-bank-name" className="text-xs">
                  Bank Account Holder Name
                </Label>
                <Input
                  id="h-bank-name"
                  value={bankAccountName}
                  onChange={(e) => setBankAccountName(e.target.value)}
                  placeholder="e.g. Rohan Mhatre"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="h-acc-num" className="text-xs">
                    Account Number
                  </Label>
                  <Input
                    id="h-acc-num"
                    value={bankAccountNumber}
                    onChange={(e) => setBankAccountNumber(e.target.value)}
                    placeholder="e.g. 50100234567890"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="h-ifsc" className="text-xs">
                    IFSC Code
                  </Label>
                  <Input
                    id="h-ifsc"
                    value={bankIfsc}
                    onChange={(e) => setBankIfsc(e.target.value)}
                    placeholder="e.g. HDFC0000123"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="h-upi" className="text-xs">
                  Or UPI ID (Instant Payouts)
                </Label>
                <Input
                  id="h-upi"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. rohan@okhdfcbank"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Switch
                  id="tariff-dec"
                  checked={tariffDeclared}
                  onCheckedChange={setTariffDeclared}
                />
                <Label
                  htmlFor="tariff-dec"
                  className="text-xs text-muted-foreground cursor-pointer"
                >
                  I confirm that my charging installation complies with local electricity tariffs
                  and state EV guidelines.
                </Label>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl"
                  onClick={() => setWizardStep(1)}
                >
                  Back
                </Button>
                <Button
                  className="flex-2 rounded-xl bg-gradient-primary shadow-glow text-primary-foreground font-semibold"
                  onClick={() => setWizardStep(3)}
                >
                  Review Application →
                </Button>
              </div>
            </div>
          )}

          {wizardStep === 3 && (
            <div className="space-y-4 py-2 text-xs">
              <div className="rounded-xl border border-border/60 bg-muted/40 p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Host Name:</span>
                  <span className="font-semibold text-foreground">{hostFullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone:</span>
                  <span className="font-semibold text-foreground">{hostPhone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Verification ID:</span>
                  <span className="font-semibold text-foreground">
                    {idDocType.toUpperCase()}: {idDocNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Property Type:</span>
                  <span className="font-semibold text-foreground">{propertyType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payout Target:</span>
                  <span className="font-semibold text-primary">
                    {upiId || bankAccountNumber || "Configured"}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl"
                  onClick={() => setWizardStep(2)}
                >
                  Back
                </Button>
                <Button
                  className="flex-2 rounded-xl bg-gradient-primary shadow-glow text-primary-foreground font-semibold"
                  disabled={isSubmittingHost}
                  onClick={() => handleSubmitHostRegistration()}
                >
                  {isSubmittingHost ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Approving...
                    </>
                  ) : (
                    "Submit & Activate Host Profile"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 2: Add / Edit Charger Listing ─── */}
      <Dialog open={chargerModalOpen} onOpenChange={setChargerModalOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingChargerId ? "Edit Charger Listing" : "Add New Home Charger"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Provide hardware details, pricing, and exact location. Exact street address is hidden
              from the public map until a driver books.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCharger} className="space-y-4 py-2 text-xs">
            <div className="space-y-1">
              <Label htmlFor="c-title" className="text-xs">
                Charger Title
              </Label>
              <Input
                id="c-title"
                value={chargerTitle}
                onChange={(e) => setChargerTitle(e.target.value)}
                placeholder="e.g. Rohan's Fast AC Wallbox"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="c-brand" className="text-xs">
                  Charger Brand
                </Label>
                <Input
                  id="c-brand"
                  value={chargerBrand}
                  onChange={(e) => setChargerBrand(e.target.value)}
                  placeholder="e.g. Schneider, ABB, Delta"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="c-model" className="text-xs">
                  Model
                </Label>
                <Input
                  id="c-model"
                  value={chargerModel}
                  onChange={(e) => setChargerModel(e.target.value)}
                  placeholder="e.g. EVlink Wallbox 7.4kW"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="c-curr" className="text-xs">
                  Current Type
                </Label>
                <select
                  id="c-curr"
                  value={currentType}
                  onChange={(e) => setCurrentType(e.target.value as "AC" | "DC")}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary"
                >
                  <option value="AC">AC (Slow/Fast)</option>
                  <option value="DC">DC (Fast)</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="c-conn" className="text-xs">
                  Connector Type
                </Label>
                <select
                  id="c-conn"
                  value={connectorType}
                  onChange={(e) => setConnectorType(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary"
                >
                  <option value="Type 2">Type 2 (AC)</option>
                  <option value="CCS2">CCS2 (DC Fast)</option>
                  <option value="GB/T">GB/T</option>
                  <option value="Tesla/NACS">Tesla/NACS</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="c-kw" className="text-xs">
                  Power (kW)
                </Label>
                <Input
                  id="c-kw"
                  type="number"
                  step="0.1"
                  value={powerKw}
                  onChange={(e) => setPowerKw(Number(e.target.value))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="c-pricing" className="text-xs">
                  Pricing Model
                </Label>
                <select
                  id="c-pricing"
                  value={pricingType}
                  onChange={(e) => setPricingType(e.target.value as typeof pricingType)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary"
                >
                  <option value="per_kwh">Per kWh (₹ per unit)</option>
                  <option value="per_session">Per Session (Flat fee)</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="c-rate" className="text-xs">
                  Price Rate (₹)
                </Label>
                <Input
                  id="c-rate"
                  type="number"
                  step="1"
                  value={priceRate}
                  onChange={(e) => setPriceRate(Number(e.target.value))}
                  placeholder="e.g. 16"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="c-addr-full" className="text-xs">
                Exact Street Address{" "}
                <span className="text-amber-500 font-semibold">
                  (Private — only revealed after booking)
                </span>
              </Label>
              <Input
                id="c-addr-full"
                value={addressFull}
                onChange={(e) => setAddressFull(e.target.value)}
                placeholder="e.g. Bungalow 4, Holy Cross Road, I.C. Colony, Borivali West, Mumbai 400103"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="c-addr-approx" className="text-xs">
                  Public Area / Neighborhood
                </Label>
                <Input
                  id="c-addr-approx"
                  value={addressApprox}
                  onChange={(e) => setAddressApprox(e.target.value)}
                  placeholder="e.g. I.C. Colony, Borivali West, Mumbai"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="c-city" className="text-xs">
                  City
                </Label>
                <Input
                  id="c-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Mumbai"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="c-access" className="text-xs">
                Access & Parking Instructions{" "}
                <span className="text-amber-500 font-semibold">(Private)</span>
              </Label>
              <Textarea
                id="c-access"
                value={accessInstructions}
                onChange={(e) => setAccessInstructions(e.target.value)}
                placeholder="e.g. Pull into driveway on the right. Charger card is hung by the wallbox plug."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="c-start" className="text-xs">
                  Available From
                </Label>
                <Input
                  id="c-start"
                  type="time"
                  value={startHour}
                  onChange={(e) => setStartHour(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="c-end" className="text-xs">
                  Available Until
                </Label>
                <Input
                  id="c-end"
                  type="time"
                  value={endHour}
                  onChange={(e) => setEndHour(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-3">
              <Button
                variant="outline"
                type="button"
                className="flex-1 rounded-xl"
                onClick={() => setChargerModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-2 rounded-xl bg-gradient-primary shadow-glow text-primary-foreground font-semibold"
                disabled={isSavingCharger}
              >
                {isSavingCharger ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {editingChargerId ? "Save Changes" : "Publish Charger"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 3: Block Dates & Time Slots ─── */}
      <Dialog open={blockModalOpen} onOpenChange={setBlockModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Block Personal Slots</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Prevent drivers from reserving when you need to charge your own EV.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1">
              <Label htmlFor="b-date" className="text-xs">
                Date
              </Label>
              <Input
                id="b-date"
                type="date"
                value={blockDate}
                onChange={(e) => setBlockDate(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="b-start" className="text-xs">
                  Start Time
                </Label>
                <Input
                  id="b-start"
                  type="time"
                  value={blockStart}
                  onChange={(e) => setBlockStart(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="b-end" className="text-xs">
                  End Time
                </Label>
                <Input
                  id="b-end"
                  type="time"
                  value={blockEnd}
                  onChange={(e) => setBlockEnd(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="b-reason" className="text-xs">
                Reason (Optional)
              </Label>
              <Input
                id="b-reason"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Personal charging, maintenance, etc."
              />
            </div>

            <Button
              className="w-full rounded-xl bg-gradient-primary shadow-glow text-primary-foreground font-semibold"
              onClick={handleCreateBlockedSlot}
            >
              Block This Time Slot
            </Button>

            {/* Existing Blocked Slots */}
            {activeBlockedSlots.length > 0 && (
              <div className="space-y-2 border-t border-border/50 pt-3">
                <span className="font-semibold text-foreground block">Active Blocked Slots:</span>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {activeBlockedSlots.map((slot) => (
                    <div
                      key={slot.id}
                      className="flex items-center justify-between rounded-lg bg-muted/60 p-2 text-[11px]"
                    >
                      <span>
                        {new Date(slot.start_time).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        {new Date(slot.start_time).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        –{" "}
                        {new Date(slot.end_time).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <button
                        onClick={() => handleRemoveBlockedSlot(slot.id)}
                        className="text-destructive font-semibold hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 4: Payout Request Modal ─── */}
      <Dialog open={payoutModalOpen} onOpenChange={setPayoutModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Request Earnings Payout</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Withdraw your verified charging earnings directly into your bank account.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRequestPayout} className="space-y-4 py-2 text-xs">
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs">
              <span className="text-muted-foreground">Available Balance:</span>
              <p className="text-xl font-bold text-primary mt-0.5">
                ₹{earnings?.availableBalanceInRupees?.toFixed(2) ?? "0.00"}
              </p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="p-amount" className="text-xs">
                Withdrawal Amount (Min ₹500)
              </Label>
              <Input
                id="p-amount"
                type="number"
                min="500"
                step="50"
                max={earnings?.availableBalanceInRupees ?? 500}
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="p-method" className="text-xs">
                Transfer Method
              </Label>
              <select
                id="p-method"
                value={payoutMethod}
                onChange={(e) => setPayoutMethod(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary"
              >
                <option value="bank_transfer">Direct NEFT/IMPS Bank Transfer</option>
                <option value="upi">Instant UPI Payout</option>
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                type="button"
                className="flex-1 rounded-xl"
                onClick={() => setPayoutModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-2 rounded-xl bg-gradient-primary shadow-glow text-primary-foreground font-semibold"
                disabled={isRequestingPayout || (earnings?.availableBalanceInRupees ?? 0) < 500}
              >
                {isRequestingPayout ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirm Withdrawal
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
