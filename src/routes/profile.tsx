import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  User,
  Mail,
  Car,
  Heart,
  LogOut,
  Loader2,
  Save,
  MapPin,
  Phone,
  Calendar,
  Camera,
  CheckCircle2,
  Home,
  ShieldCheck,
  Zap,
  Navigation,
  ArrowRight,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Navbar } from "@/components/Navbar";
import { StationCard } from "@/components/StationCard";
import {
  useProfile,
  useVehicles,
  useFavouriteStations,
  useFavouriteIds,
  useToggleFavourite,
  useMerchantProfile,
  useUserBookings,
} from "@/hooks/useChargeData";
import { cancelMarketplaceBooking } from "@/services/marketplaceService";
import { useAuth } from "@/hooks/useAuth";
import { saveProfile } from "@/services/stationService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export const Route = createFileRoute("/profile")({
  component: ProtectedProfileRoute,
  head: () => ({
    meta: [
      { title: "My Profile — EV360" },
      {
        name: "description",
        content: "Manage your EV360 profile, vehicle, and saved charging stations.",
      },
    ],
  }),
});

function ProtectedProfileRoute() {
  return (
    <ProtectedRoute fallbackMessage="Please sign in to access your profile">
      <ProfilePage />
    </ProtectedRoute>
  );
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "Recently joined";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "Recently joined";
  }
}

function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile(user?.id);
  const { data: vehicles = [] } = useVehicles();
  const { data: favStations = [], isLoading: favsLoading } = useFavouriteStations(user?.id);
  const { data: favIds = [] } = useFavouriteIds(user?.id);
  const toggleFav = useToggleFavourite(user?.id);
  const { data: merchantProfile } = useMerchantProfile(user?.id);
  const { data: userBookings = [], refetch: refetchUserBookings } = useUserBookings(user?.id);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [vehicleId, setVehicleId] = useState<string>("none");
  const [saving, setSaving] = useState(false);
  const [showAvatarInput, setShowAvatarInput] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      toast.info("Please sign in to access your profile");
      navigate({ to: "/login" });
    }
  }, [authLoading, user, navigate]);

  // Populate form from profile or user metadata
  useEffect(() => {
    if (profile || user) {
      const meta = (user?.user_metadata || {}) as Record<string, string | undefined>;
      setFullName(profile?.full_name ?? meta["full_name"] ?? meta["name"] ?? "");
      setPhone(profile?.phone ?? meta["phone"] ?? user?.phone ?? "");
      setCity(profile?.city ?? meta["city"] ?? "");
      setAvatarUrl(profile?.avatar_url ?? meta["avatar_url"] ?? meta["picture"] ?? "");
      setVehicleId(profile?.vehicle_id ?? meta["vehicle_id"] ?? "none");
    }
  }, [profile, user]);

  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size must be less than 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAvatarUrl(reader.result);
        toast.success("Profile photo updated! Click 'Save Changes' to apply.");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await saveProfile({
        id: user.id,
        full_name: fullName.trim() || null,
        email: user.email ?? null,
        phone: phone.trim() || null,
        city: city.trim() || null,
        avatar_url: avatarUrl.trim() || null,
        vehicle_id: vehicleId === "none" ? null : vehicleId,
        created_at: profile?.created_at ?? user.created_at,
      });
      queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      toast.success("Profile updated successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Signed out successfully");
      navigate({ to: "/login" });
    } catch {
      toast.error("Failed to sign out");
    }
  };

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 pt-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading account details...</p>
        </div>
      </div>
    );
  }

  const accountCreationDate = profile?.created_at ?? user?.created_at;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-5xl px-4 pt-24 pb-16 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-6">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              My Profile
            </h1>
            <p className="mt-1 text-muted-foreground">
              Manage your EV360 account details, vehicle preferences, and saved chargers.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              className="gap-2 rounded-full bg-gradient-primary shadow-glow text-primary-foreground font-semibold"
              asChild
            >
              <Link to="/merchant">
                <Home className="h-4 w-4" />
                {merchantProfile ? "Host Dashboard" : "Become a Host"}
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 rounded-full" asChild>
              <Link to="/admin">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Admin
              </Link>
            </Button>
            <Button
              id="sign-out-btn"
              variant="outline"
              size="sm"
              className="gap-2 rounded-full border-destructive/30 text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-12">
          {/* Account Details Card */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-card sm:p-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-xl font-semibold text-foreground">
                    Account Details
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Your personal information saved during registration
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  <CheckCircle2 className="h-3 w-3" />
                  Verified
                </span>
              </div>

              {profileLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <form onSubmit={handleSave} className="mt-6 space-y-6">
                  {/* Avatar Banner */}
                  <div className="flex flex-col items-center gap-4 rounded-xl border border-border/40 bg-muted/20 p-4 sm:flex-row">
                    <div className="relative group">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={fullName || "User Avatar"}
                          className="h-20 w-20 rounded-full object-cover border-2 border-primary shadow-glow"
                        />
                      ) : (
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-primary text-2xl font-bold text-primary-foreground shadow-glow">
                          {fullName ? (
                            fullName.charAt(0).toUpperCase()
                          ) : (
                            <User className="h-8 w-8" />
                          )}
                        </div>
                      )}
                      <label
                        htmlFor="avatar-upload"
                        className="absolute bottom-0 right-0 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform hover:scale-110"
                        title="Upload profile picture"
                      >
                        <Camera className="h-3.5 w-3.5" />
                        <input
                          id="avatar-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAvatarFileUpload}
                        />
                      </label>
                    </div>

                    <div className="flex-1 text-center sm:text-left">
                      <p className="text-lg font-semibold text-foreground">
                        {fullName || "EV360 Driver"}
                      </p>
                      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground sm:justify-start">
                        <Mail className="h-3.5 w-3.5" />
                        {user?.email}
                      </p>
                      <p className="mt-1 flex items-center justify-center gap-1.5 text-xs text-muted-foreground sm:justify-start">
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                        Member since {formatDate(accountCreationDate)}
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowAvatarInput(!showAvatarInput)}
                        className="mt-2 text-xs text-primary hover:underline"
                      >
                        {showAvatarInput ? "Hide image URL" : "Or enter photo URL"}
                      </button>
                    </div>
                  </div>

                  {showAvatarInput && (
                    <div className="animate-in fade-in duration-200">
                      <Label htmlFor="avatar-url" className="text-xs">
                        Profile Picture URL
                      </Label>
                      <Input
                        id="avatar-url"
                        type="url"
                        placeholder="https://example.com/avatar.jpg"
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                        className="mt-1 rounded-xl text-xs"
                      />
                    </div>
                  )}

                  <Separator />

                  {/* Form fields */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Full Name */}
                    <div className="sm:col-span-2">
                      <Label htmlFor="profile-name" className="text-sm font-medium">
                        Full Name
                      </Label>
                      <div className="relative mt-1.5">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="profile-name"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Your full name"
                          className="pl-9 rounded-xl"
                          required
                        />
                      </div>
                    </div>

                    {/* Email (Read-only) */}
                    <div className="sm:col-span-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="profile-email" className="text-sm font-medium">
                          Email Address
                        </Label>
                        <span className="text-[11px] text-muted-foreground">Connected to Auth</span>
                      </div>
                      <div className="relative mt-1.5">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="profile-email"
                          value={user?.email ?? ""}
                          disabled
                          readOnly
                          className="pl-9 rounded-xl bg-muted/40 cursor-not-allowed opacity-80"
                        />
                      </div>
                    </div>

                    {/* Mobile Number */}
                    <div>
                      <Label htmlFor="profile-phone" className="text-sm font-medium">
                        Mobile Number
                      </Label>
                      <div className="relative mt-1.5">
                        <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="profile-phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+91 9876543210"
                          className="pl-9 rounded-xl"
                        />
                      </div>
                    </div>

                    {/* City / Location */}
                    <div>
                      <Label htmlFor="profile-city" className="text-sm font-medium">
                        City / Location
                      </Label>
                      <div className="relative mt-1.5">
                        <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="profile-city"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="e.g. Mumbai, Delhi"
                          className="pl-9 rounded-xl"
                        />
                      </div>
                    </div>

                    {/* Vehicle */}
                    <div className="sm:col-span-2">
                      <Label htmlFor="profile-vehicle" className="text-sm font-medium">
                        <Car className="mr-1 inline h-4 w-4 text-primary" />
                        My EV Vehicle
                      </Label>
                      <Select value={vehicleId} onValueChange={setVehicleId}>
                        <SelectTrigger id="profile-vehicle" className="mt-1.5 rounded-xl">
                          <SelectValue placeholder="Select your electric vehicle" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No vehicle selected</SelectItem>
                          {vehicles.map((v) => (
                            <SelectItem key={v.id} value={v.id}>
                              {v.make} {v.model} ({v.max_charge_kw} kW)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Selecting your vehicle automatically filters compatible charging stations
                      </p>
                    </div>

                    {/* Account Created Date info */}
                    <div className="sm:col-span-2 rounded-xl bg-muted/30 p-3 text-xs text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary shrink-0" />
                      <span>
                        Account registered on <strong>{formatDate(accountCreationDate)}</strong>.
                        Passwords and credentials are cryptographically secured.
                      </span>
                    </div>
                  </div>

                  <Button
                    id="save-profile-btn"
                    type="submit"
                    disabled={saving}
                    className="w-full gap-2 rounded-full bg-gradient-primary shadow-glow hover:opacity-90 font-medium"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save Changes
                  </Button>
                </form>
              )}
            </div>
          </div>

          {/* Saved Stations Section */}
          <div className="lg:col-span-5">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-foreground">
                <Heart className="h-5 w-5 text-primary fill-primary" />
                Saved Stations
              </h2>
              {favStations.length > 0 && (
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  {favStations.length} saved
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Charging stations bookmarked by your account for quick navigation
            </p>

            <div className="mt-4 space-y-3">
              {favsLoading ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-border/50 bg-card p-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="mt-2 text-xs text-muted-foreground">Loading your favourites...</p>
                </div>
              ) : favStations.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center shadow-card">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <Heart className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-foreground">
                    No saved stations yet
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Bookmark your favourite chargers on the map to access them quickly here.
                  </p>
                  <Link to="/map">
                    <Button variant="outline" size="sm" className="mt-4 gap-1.5 rounded-full">
                      <MapPin className="h-4 w-4" />
                      Browse Stations
                    </Button>
                  </Link>
                </div>
              ) : (
                favStations.map((s) => (
                  <StationCard
                    key={s.id}
                    station={s}
                    isFav={favIds.includes(s.id)}
                    onToggleFav={() =>
                      toggleFav.mutate({
                        stationId: s.id,
                        isFav: favIds.includes(s.id),
                      })
                    }
                  />
                ))
              )}
            </div>

            {/* My Home Charger Bookings */}
            <div className="mt-8 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-foreground">
                  <Zap className="h-5 w-5 text-amber-500" />
                  My Charger Bookings
                </h2>
                {userBookings.length > 0 && (
                  <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-500">
                    {userBookings.length}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Your reservations at verified peer-to-peer home chargers
              </p>

              {userBookings.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center shadow-card">
                  <Home className="mx-auto h-8 w-8 text-muted-foreground/40" />
                  <p className="mt-2 text-xs font-semibold text-foreground">No bookings yet</p>
                  <p className="text-[11px] text-muted-foreground">
                    Discover and reserve private home chargers on the map.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 gap-1 rounded-full text-xs"
                    asChild
                  >
                    <Link to="/map">
                      <Zap className="h-3.5 w-3.5 text-primary" />
                      Find Chargers
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {userBookings.map((b) => (
                    <div
                      key={b.id}
                      className="rounded-2xl border border-border/60 bg-card p-4 shadow-card space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-primary">
                              {b.booking_ref}
                            </span>
                            <Badge
                              variant="secondary"
                              className={`text-[10px] uppercase font-semibold ${
                                b.status === "confirmed"
                                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {b.status}
                            </Badge>
                          </div>
                          <p className="text-xs font-semibold text-foreground mt-0.5">
                            {b.charger?.title || "Home EV Charger"}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-foreground">
                          ₹{b.total_amount.toFixed(2)}
                        </span>
                      </div>

                      <div className="text-[11px] text-muted-foreground space-y-1 bg-muted/40 p-2.5 rounded-xl border border-border/50">
                        <p className="flex items-center gap-1 font-medium text-foreground">
                          <Calendar className="h-3 w-3 text-primary" />
                          {new Date(b.start_time).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        {b.access_revealed && b.charger?.address_full && (
                          <p className="text-xs text-foreground font-medium flex items-start gap-1 pt-1">
                            <MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                            <span>{b.charger.address_full}</span>
                          </p>
                        )}
                        {b.access_revealed && b.charger?.access_instructions && (
                          <p className="text-[10px] text-muted-foreground italic">
                            Access: {b.charger.access_instructions}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        {b.charger && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs rounded-lg gap-1"
                            asChild
                          >
                            <a
                              href={`https://www.google.com/maps/dir/?api=1&destination=${b.charger.lat},${b.charger.lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Navigation className="h-3 w-3" />
                              Directions
                            </a>
                          </Button>
                        )}
                        {b.status === "confirmed" && (
                          <button
                            onClick={async () => {
                              const res = await cancelMarketplaceBooking(
                                b.id,
                                "user",
                                "Driver requested cancellation",
                              );
                              if (res.success) {
                                toast.success(res.message);
                                refetchUserBookings();
                              } else {
                                toast.error(res.message);
                              }
                            }}
                            className="text-xs text-destructive hover:underline font-medium"
                          >
                            Cancel Reservation
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
