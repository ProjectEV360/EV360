import { Link, useNavigate } from "@tanstack/react-router";
import {
  Mail,
  Lock,
  User,
  Phone,
  MapPin,
  Camera,
  Calendar,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  KeyRound,
  CheckCircle2,
  X,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { saveProfile } from "@/services/stationService";
import { toast } from "sonner";

interface AuthCardProps {
  defaultTab?: "login" | "register";
}

function calculatePasswordStrength(pass: string): {
  score: number;
  label: "Too short" | "Weak" | "Fair" | "Strong";
  color: string;
} {
  if (!pass) return { score: 0, label: "Too short", color: "bg-muted" };
  if (pass.length < 6) return { score: 1, label: "Weak", color: "bg-destructive" };
  let strength = 0;
  if (pass.length >= 8) strength++;
  if (/[0-9]/.test(pass)) strength++;
  if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) strength++;
  if (/[^A-Za-z0-9]/.test(pass)) strength++;

  if (strength <= 1) return { score: 1, label: "Weak", color: "bg-destructive" };
  if (strength === 2) return { score: 2, label: "Fair", color: "bg-amber-500" };
  return { score: 3, label: "Strong", color: "bg-emerald-500" };
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isValidPhone(phone: string): boolean {
  const clean = phone.replace(/[\s\-()]/g, "");
  return clean.length >= 10 && /^\+?[0-9]{10,14}$/.test(clean);
}

export function AuthCard({ defaultTab = "login" }: AuthCardProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"login" | "register">(defaultTab);

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginErrors, setLoginErrors] = useState<{ email?: string; password?: string }>({});

  // Registration form state
  const [regFullName, setRegFullName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regCity, setRegCity] = useState("");
  const [regAvatarUrl, setRegAvatarUrl] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [showCustomAvatarInput, setShowCustomAvatarInput] = useState(false);
  const [regErrors, setRegErrors] = useState<{
    fullName?: string;
    email?: string;
    phone?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  // Forgot password modal state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const creationDateFormatted = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Google OAuth
  const handleGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/map` },
      });
      if (error) toast.error(error.message);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Google Sign-In failed";
      toast.error(msg);
    }
  };

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { email?: string; password?: string } = {};

    if (!loginEmail.trim()) {
      errors.email = "Email address is required";
    } else if (!isValidEmail(loginEmail)) {
      errors.email = "Please enter a valid email address";
    }

    if (!loginPassword) {
      errors.password = "Password is required";
    }

    setLoginErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoginLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword,
      });

      if (error) throw error;

      toast.success("Welcome back to EV360!");
      if (data.user) {
        navigate({ to: "/map" });
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message === "Invalid login credentials"
            ? "Invalid email or password. Please verify your credentials."
            : err.message
          : "Login failed. Please try again.";
      toast.error(message);
    } finally {
      setLoginLoading(false);
    }
  };

  // Avatar file upload preview
  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Profile picture must be under 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setRegAvatarUrl(reader.result);
        toast.success("Profile picture selected!");
      }
    };
    reader.readAsDataURL(file);
  };

  // Register handler
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: {
      fullName?: string;
      email?: string;
      phone?: string;
      password?: string;
      confirmPassword?: string;
    } = {};

    if (!regFullName.trim() || regFullName.trim().length < 2) {
      errors.fullName = "Please enter your full name (minimum 2 characters)";
    }

    if (!regEmail.trim()) {
      errors.email = "Email address is required";
    } else if (!isValidEmail(regEmail)) {
      errors.email = "Please enter a valid email address";
    }

    if (!regPhone.trim()) {
      errors.phone = "Mobile number is required";
    } else if (!isValidPhone(regPhone)) {
      errors.phone = "Please enter a valid 10-digit mobile number";
    }

    if (!regPassword) {
      errors.password = "Password is required";
    } else if (regPassword.length < 6) {
      errors.password = "Password must be at least 6 characters long";
    }

    if (!regConfirmPassword) {
      errors.confirmPassword = "Confirm password is required";
    } else if (regPassword !== regConfirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    setRegErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.error("Please fix the errors in the registration form");
      return;
    }

    setRegLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: regEmail.trim(),
        password: regPassword,
        options: {
          data: {
            full_name: regFullName.trim(),
            phone: regPhone.trim(),
            city: regCity.trim() || null,
            avatar_url: regAvatarUrl.trim() || null,
          },
        },
      });

      if (error) {
        if (
          error.message.toLowerCase().includes("already registered") ||
          error.message.toLowerCase().includes("already in use") ||
          error.status === 422
        ) {
          setRegErrors((prev) => ({
            ...prev,
            email: "An account with this email already exists. Please log in.",
          }));
          throw new Error("An account with this email already exists. Please log in.");
        }
        throw error;
      }

      if (data.session && data.user) {
        await saveProfile({
          id: data.user.id,
          full_name: regFullName.trim(),
          email: regEmail.trim(),
          phone: regPhone.trim(),
          city: regCity.trim() || null,
          avatar_url: regAvatarUrl.trim() || null,
          vehicle_id: null,
          created_at: new Date().toISOString(),
        });
        toast.success("Account created successfully! Welcome to EV360.");
        navigate({ to: "/profile" });
      } else {
        toast.success("Account created! Please check your email to confirm, then sign in.");
        setLoginEmail(regEmail.trim());
        setActiveTab("login");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Registration failed. Please try again.";
      toast.error(message);
    } finally {
      setRegLoading(false);
    }
  };

  // Forgot password handler
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim() || !isValidEmail(forgotEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setForgotLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) throw error;

      toast.success("Password reset instructions sent! Check your inbox.");
      setForgotOpen(false);
      setForgotEmail("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not send reset email.";
      toast.error(msg);
    } finally {
      setForgotLoading(false);
    }
  };

  const passwordStrength = calculatePasswordStrength(regPassword);

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-12">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-hero opacity-50" />

      <div className="relative z-10 w-full max-w-lg">
        {/* EV360 Logo */}
        <Link
          to="/"
          className="mb-6 flex items-center justify-center group"
          aria-label="EV360 Home"
        >
          <img
            src="/logo.png"
            alt="EV360 - One App. Every Charger."
            className="h-12 w-auto max-w-[200px] object-contain transition-transform group-hover:scale-105 dark:hidden"
          />
          <img
            src="/logo-dark.png"
            alt="EV360 - One App. Every Charger."
            className="hidden h-12 w-auto max-w-[200px] object-contain transition-transform group-hover:scale-105 dark:block"
          />
        </Link>

        {/* Auth Card Container */}
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-card">
          {/* Header Tab Switcher */}
          <div className="border-b border-border/50 bg-muted/40 p-2 sm:px-6">
            <div
              role="tablist"
              aria-orientation="horizontal"
              className="grid w-full grid-cols-2 rounded-xl bg-background/80 p-1"
            >
              <button
                type="button"
                role="tab"
                id="tab-login"
                aria-selected={activeTab === "login"}
                onClick={() => setActiveTab("login")}
                className={`rounded-lg py-2.5 text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === "login"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                role="tab"
                id="tab-register"
                aria-selected={activeTab === "register"}
                onClick={() => setActiveTab("register")}
                className={`rounded-lg py-2.5 text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === "register"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Create Account
              </button>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {/* ================= LOGIN PANEL ================= */}
            {activeTab === "login" ? (
              <div id="login-panel" className="space-y-6 animate-in fade-in duration-200">
                <div className="text-center">
                  <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                    Welcome Back to EV360
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Sign in to access your saved chargers and vehicle profile
                  </p>
                </div>

                {/* Google Sign-in */}
                <Button
                  id="google-login-btn"
                  variant="outline"
                  type="button"
                  className="w-full gap-2.5 rounded-full py-5 font-medium border-border/80 hover:bg-muted/50 cursor-pointer"
                  onClick={handleGoogle}
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continue with Google
                </Button>

                <div className="flex items-center gap-3">
                  <Separator className="flex-1" />
                  <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                    or continue with email
                  </span>
                  <Separator className="flex-1" />
                </div>

                {/* Login Form */}
                <form onSubmit={handleLogin} noValidate className="space-y-4">
                  {/* Email */}
                  <div>
                    <Label htmlFor="login-email" className="text-sm font-medium">
                      Email Address
                    </Label>
                    <div className="relative mt-1.5">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="you@example.com"
                        value={loginEmail}
                        onChange={(e) => {
                          setLoginEmail(e.target.value);
                          if (loginErrors.email)
                            setLoginErrors((p) => ({ ...p, email: undefined }));
                        }}
                        className={`pl-9 rounded-xl ${loginErrors.email ? "border-destructive focus-visible:ring-destructive" : ""}`}
                        required
                      />
                    </div>
                    {loginErrors.email && (
                      <p className="mt-1 text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {loginErrors.email}
                      </p>
                    )}
                  </div>

                  {/* Password */}
                  <div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password" className="text-sm font-medium">
                        Password
                      </Label>
                      <button
                        id="forgot-password-btn"
                        type="button"
                        onClick={() => setForgotOpen(true)}
                        className="text-xs text-primary hover:underline font-medium cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative mt-1.5">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type={showLoginPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => {
                          setLoginPassword(e.target.value);
                          if (loginErrors.password)
                            setLoginErrors((p) => ({ ...p, password: undefined }));
                        }}
                        className={`pl-9 pr-10 rounded-xl ${loginErrors.password ? "border-destructive focus-visible:ring-destructive" : ""}`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                        aria-label="Toggle password visibility"
                      >
                        {showLoginPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {loginErrors.password && (
                      <p className="mt-1 text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {loginErrors.password}
                      </p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <Button
                    id="email-login-btn"
                    type="submit"
                    disabled={loginLoading}
                    className="w-full gap-2 rounded-full py-5 bg-gradient-primary shadow-glow hover:opacity-90 font-medium cursor-pointer"
                  >
                    {loginLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Sign In
                  </Button>
                </form>

                <div className="text-center text-xs text-muted-foreground">
                  Don't have an account yet?{" "}
                  <button
                    type="button"
                    onClick={() => setActiveTab("register")}
                    className="font-semibold text-primary hover:underline cursor-pointer"
                  >
                    Create an account
                  </button>
                </div>
              </div>
            ) : (
              /* ================= REGISTER PANEL ================= */
              <div id="register-panel" className="space-y-6 animate-in fade-in duration-200">
                <div className="text-center">
                  <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                    Create Your EV360 Account
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Join thousands of electric vehicle drivers across India
                  </p>
                </div>

                {/* Google Sign-up */}
                <Button
                  id="google-signup-btn"
                  variant="outline"
                  type="button"
                  className="w-full gap-2.5 rounded-full py-5 font-medium border-border/80 hover:bg-muted/50 cursor-pointer"
                  onClick={handleGoogle}
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Sign up with Google
                </Button>

                <div className="flex items-center gap-3">
                  <Separator className="flex-1" />
                  <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                    or fill your details
                  </span>
                  <Separator className="flex-1" />
                </div>

                {/* Registration Form */}
                <form onSubmit={handleRegister} noValidate className="space-y-4">
                  {/* Full Name */}
                  <div>
                    <Label htmlFor="reg-fullname" className="text-sm font-medium">
                      Full Name <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative mt-1.5">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="reg-fullname"
                        type="text"
                        placeholder="e.g. Rahul Sharma"
                        value={regFullName}
                        onChange={(e) => {
                          setRegFullName(e.target.value);
                          if (regErrors.fullName)
                            setRegErrors((p) => ({ ...p, fullName: undefined }));
                        }}
                        className={`pl-9 rounded-xl ${regErrors.fullName ? "border-destructive focus-visible:ring-destructive" : ""}`}
                        required
                      />
                    </div>
                    {regErrors.fullName && (
                      <p className="mt-1 text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {regErrors.fullName}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <Label htmlFor="reg-email" className="text-sm font-medium">
                      Email Address <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative mt-1.5">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="reg-email"
                        type="email"
                        placeholder="you@example.com"
                        value={regEmail}
                        onChange={(e) => {
                          setRegEmail(e.target.value);
                          if (regErrors.email) setRegErrors((p) => ({ ...p, email: undefined }));
                        }}
                        className={`pl-9 rounded-xl ${regErrors.email ? "border-destructive focus-visible:ring-destructive" : ""}`}
                        required
                      />
                    </div>
                    {regErrors.email && (
                      <p className="mt-1 text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {regErrors.email}
                      </p>
                    )}
                  </div>

                  {/* Mobile Number & City Row */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="reg-phone" className="text-sm font-medium">
                        Mobile Number <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative mt-1.5">
                        <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="reg-phone"
                          type="tel"
                          placeholder="+91 9876543210"
                          value={regPhone}
                          onChange={(e) => {
                            setRegPhone(e.target.value);
                            if (regErrors.phone) setRegErrors((p) => ({ ...p, phone: undefined }));
                          }}
                          className={`pl-9 rounded-xl ${regErrors.phone ? "border-destructive focus-visible:ring-destructive" : ""}`}
                          required
                        />
                      </div>
                      {regErrors.phone && (
                        <p className="mt-1 text-xs text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {regErrors.phone}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="reg-city" className="text-sm font-medium">
                        City / Location{" "}
                        <span className="text-xs text-muted-foreground">(Optional)</span>
                      </Label>
                      <div className="relative mt-1.5">
                        <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="reg-city"
                          type="text"
                          placeholder="e.g. Mumbai"
                          value={regCity}
                          onChange={(e) => setRegCity(e.target.value)}
                          className="pl-9 rounded-xl"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Profile Picture (Optional) */}
                  <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium flex items-center gap-1.5">
                        <Camera className="h-3.5 w-3.5 text-primary" />
                        Profile Picture (Optional)
                      </Label>
                      <button
                        type="button"
                        onClick={() => setShowCustomAvatarInput(!showCustomAvatarInput)}
                        className="text-[11px] text-primary hover:underline cursor-pointer"
                      >
                        {showCustomAvatarInput ? "Choose file instead" : "Or enter Image URL"}
                      </button>
                    </div>

                    <div className="mt-2 flex items-center gap-3">
                      {regAvatarUrl ? (
                        <img
                          src={regAvatarUrl}
                          alt="Avatar preview"
                          className="h-10 w-10 rounded-full object-cover border border-primary shadow-sm"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                          <User className="h-5 w-5" />
                        </div>
                      )}

                      {showCustomAvatarInput ? (
                        <Input
                          id="reg-avatar-url"
                          type="url"
                          placeholder="https://example.com/avatar.png"
                          value={regAvatarUrl}
                          onChange={(e) => setRegAvatarUrl(e.target.value)}
                          className="rounded-lg text-xs flex-1"
                        />
                      ) : (
                        <label
                          htmlFor="reg-avatar-upload"
                          className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
                        >
                          <Camera className="h-3.5 w-3.5" />
                          Choose photo
                          <input
                            id="reg-avatar-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleAvatarFile}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <Label htmlFor="reg-password" className="text-sm font-medium">
                      Password <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative mt-1.5">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="reg-password"
                        type={showRegPassword ? "text" : "password"}
                        placeholder="•••••••• (min 6 chars)"
                        value={regPassword}
                        onChange={(e) => {
                          setRegPassword(e.target.value);
                          if (regErrors.password)
                            setRegErrors((p) => ({ ...p, password: undefined }));
                        }}
                        className={`pl-9 pr-10 rounded-xl ${regErrors.password ? "border-destructive focus-visible:ring-destructive" : ""}`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                        aria-label="Toggle password visibility"
                      >
                        {showRegPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    {/* Password Strength Indicator */}
                    {regPassword && (
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">Password strength:</span>
                          <span className="font-semibold text-foreground">
                            {passwordStrength.label}
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                            style={{
                              width:
                                passwordStrength.score === 1
                                  ? "33%"
                                  : passwordStrength.score === 2
                                    ? "66%"
                                    : "100%",
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {regErrors.password && (
                      <p className="mt-1 text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {regErrors.password}
                      </p>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <Label htmlFor="reg-confirm-password" className="text-sm font-medium">
                      Confirm Password <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative mt-1.5">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="reg-confirm-password"
                        type={showRegConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={regConfirmPassword}
                        onChange={(e) => {
                          setRegConfirmPassword(e.target.value);
                          if (regErrors.confirmPassword)
                            setRegErrors((p) => ({ ...p, confirmPassword: undefined }));
                        }}
                        className={`pl-9 pr-10 rounded-xl ${regErrors.confirmPassword ? "border-destructive focus-visible:ring-destructive" : ""}`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegConfirmPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                        aria-label="Toggle password visibility"
                      >
                        {showRegConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {regErrors.confirmPassword && (
                      <p className="mt-1 text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {regErrors.confirmPassword}
                      </p>
                    )}
                  </div>

                  {/* Account Creation Date Notice */}
                  <div className="flex items-center gap-2 rounded-xl bg-muted/40 p-2.5 text-xs text-muted-foreground">
                    <Calendar className="h-4 w-4 text-primary shrink-0" />
                    <span>Account creation date: Today, {creationDateFormatted}</span>
                  </div>

                  {/* Submit Button */}
                  <Button
                    id="email-signup-btn"
                    type="submit"
                    disabled={regLoading}
                    className="w-full gap-2 rounded-full py-5 bg-gradient-primary shadow-glow hover:opacity-90 font-medium cursor-pointer"
                  >
                    {regLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Create Account
                  </Button>
                </form>

                <div className="text-center text-xs text-muted-foreground">
                  Already have an EV360 account?{" "}
                  <button
                    type="button"
                    onClick={() => setActiveTab("login")}
                    className="font-semibold text-primary hover:underline cursor-pointer"
                  >
                    Sign In
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl border border-border/80 bg-card p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setForgotOpen(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <KeyRound className="h-6 w-6" />
              </div>
              <h3 className="font-display text-xl font-bold text-foreground">
                Reset Your Password
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Enter your registered email address and we'll send you a secure link to reset your
                password.
              </p>
            </div>

            <form onSubmit={handleForgotSubmit} noValidate className="mt-6 space-y-4">
              <div>
                <Label htmlFor="forgot-email" className="text-xs font-medium">
                  Email Address
                </Label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="you@example.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="pl-9 rounded-xl text-sm"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 rounded-full text-xs cursor-pointer"
                  onClick={() => setForgotOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={forgotLoading}
                  className="flex-1 gap-2 rounded-full bg-gradient-primary shadow-glow hover:opacity-90 text-xs font-medium cursor-pointer"
                >
                  {forgotLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Send Reset Link
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
