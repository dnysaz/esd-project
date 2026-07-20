"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  Save,
  User,
  Lock,
  Palette,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { THEMES, applyTheme, saveLocalConfig } from "@/components/ui/theme-provider";

export default function SettingsPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [originalName, setOriginalName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [siteTitle, setSiteTitle] = useState("");
  const [originalSiteTitle, setOriginalSiteTitle] = useState("");
  const [footerText, setFooterText] = useState("");
  const [originalFooterText, setOriginalFooterText] = useState("");
  const [selectedTheme, setSelectedTheme] = useState("blue");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null); // section being saved
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        router.push("/login");
        return;
      }

      const name =
        userData.user.user_metadata?.display_name ||
        userData.user.user_metadata?.full_name ||
        userData.user.email?.split("@")[0] ||
        "";
      setDisplayName(name);
      setOriginalName(name);

      // Fetch app config
      const { data: config } = await supabase
        .from("app_config")
        .select("*")
        .single();
      if (config) {
        setSiteTitle(config.site_title);
        setOriginalSiteTitle(config.site_title);
        setFooterText(config.footer_text);
        setOriginalFooterText(config.footer_text);
        const theme = THEMES.find((t) => t.primary === config.theme_color);
        setSelectedTheme(theme?.id || "blue");
      }

      setLoading(false);
    }

    fetchData();
  }, [router]);

  const handleSaveName = async () => {
    if (!displayName.trim()) return;
    setSaving("name");
    setMessage(null);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      data: { display_name: displayName.trim() },
    });

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setOriginalName(displayName.trim());
      setMessage({ type: "success", text: "Display name updated!" });
    }
    setSaving(null);
  };

  const handleSavePassword = async () => {
    if (!password) return;
    if (password.length < 6) {
      setMessage({ type: "error", text: "Password must be at least 6 characters." });
      return;
    }
    if (password !== confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match." });
      return;
    }
    setSaving("password");
    setMessage(null);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setPassword("");
      setConfirmPassword("");
      setMessage({ type: "success", text: "Password changed successfully!" });
    }
    setSaving(null);
  };

  const handleSaveConfig = async () => {
    if (!siteTitle.trim()) return;
    setSaving("config");
    setMessage(null);

    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("app_config")
      .update({
        site_title: siteTitle.trim(),
        footer_text: footerText.trim() || "Created with ❤️ for all FBS",
        updated_by: userData.user?.id,
      })
      .eq("id", "00000000-0000-0000-0000-000000000001");

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      const newTitle = siteTitle.trim();
      const newFooter = footerText.trim() || "Created with ❤️ for all FBS";
      setOriginalSiteTitle(newTitle);
      setOriginalFooterText(newFooter);
      setMessage({ type: "success", text: "Site settings updated!" });

      // Persist to localStorage so Navbar & Footer load instantly on reload
      const theme = THEMES.find((t) => t.id === selectedTheme) || THEMES[0];
      saveLocalConfig({
        siteTitle: newTitle,
        footerText: newFooter,
        primary: theme.primary,
        dark: theme.dark,
        light: theme.light,
      });

      // Dispatch custom event so Navbar & Footer update instantly (no reload)
      window.dispatchEvent(
        new CustomEvent("site-config-changed", {
          detail: {
            siteTitle: newTitle,
            footerText: newFooter,
            themeColor: theme.primary,
            themeDark: theme.dark,
            themeLight: theme.light,
          },
        })
      );
    }
    setSaving(null);
  };

  if (loading) {
    return (
      <div className="animate-fade-in">
        {/* Back button skeleton */}
        <div className="skeleton h-8 w-28 rounded-full mb-6" />
        {/* Card skeleton */}
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-xl border border-border p-6">
              <div className="skeleton h-5 w-32 mb-4" />
              <div className="space-y-3">
                <div className="skeleton h-10 w-full rounded-lg" />
                <div className="skeleton h-10 w-full rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      {/* Back button */}
      <Link href="/dashboard" className="btn-ghost mb-6 -ml-2">
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      <h1 className="text-2xl font-bold text-text mb-6">Settings</h1>

      {/* Success/Error message */}
      {message && (
        <div
          className={`mb-6 px-4 py-3 rounded-xl text-sm flex items-center gap-2.5 ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-600 border border-red-200"
          }`}
        >
          {message.type === "success" ? (
            <Check className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        {/* ===== Profile Section ===== */}
        <div className="rounded-xl border border-border bg-white p-6">
          <div className="flex items-center gap-2 mb-1">
            <User className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-text">Profile</h2>
          </div>
          <p className="text-sm text-text-secondary mb-5">
            Update your display name shown across the app.
          </p>

          <div className="max-w-md space-y-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="input-field"
                placeholder="Your display name"
              />
            </div>

            <button
              onClick={handleSaveName}
              disabled={saving === "name" || !displayName.trim() || displayName.trim() === originalName}
              className="btn-primary"
            >
              {saving === "name" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Name
            </button>
          </div>
        </div>

        {/* ===== Password Section ===== */}
        <div className="rounded-xl border border-border bg-white p-6">
          <div className="flex items-center gap-2 mb-1">
            <Lock className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-text">Password</h2>
          </div>
          <p className="text-sm text-text-secondary mb-5">
            Change your account password. Minimum 6 characters.
          </p>

          <div className="max-w-md space-y-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-10"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                Re-type Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field pr-10"
                  placeholder="Re-type new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              onClick={handleSavePassword}
              disabled={saving === "password" || !password}
              className="btn-primary"
            >
              {saving === "password" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Change Password
            </button>
          </div>
        </div>

        {/* ===== Site Settings Section ===== */}
        <div className="rounded-xl border border-border bg-white p-6">
          <div className="flex items-center gap-2 mb-1">
            <Palette className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-text">Appearance</h2>
          </div>
          <p className="text-sm text-text-secondary mb-5">
            Customize the site title, footer text, and color theme.
          </p>

          {/* Theme Color Picker */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-text mb-3">
              Theme Color
            </label>
            <div className="flex items-center gap-3">
              {THEMES.map((theme) => (
                <button
                  key={theme.id}
                  onClick={async () => {
                    setSelectedTheme(theme.id);
                    // Apply instantly to UI
                    applyTheme(theme.primary, theme.dark, theme.light);
                    // Save to DB
                    const supabase = createClient();
                    await supabase
                      .from("app_config")
                      .update({
                        theme_color: theme.primary,
                        theme_dark: theme.dark,
                        theme_light: theme.light,
                      })
                      .eq("id", "00000000-0000-0000-0000-000000000001");
                    // Persist theme to localStorage
                    saveLocalConfig({
                      primary: theme.primary,
                      dark: theme.dark,
                      light: theme.light,
                    });
                    // Dispatch event for other components
                    window.dispatchEvent(
                      new CustomEvent("site-config-changed", {
                        detail: {
                          themeColor: theme.primary,
                          themeDark: theme.dark,
                          themeLight: theme.light,
                        },
                      })
                    );
                  }}
                  className={`w-11 h-11 rounded-full transition-all duration-200 border-2 flex items-center justify-center ${
                    selectedTheme === theme.id
                      ? "border-text scale-110"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: theme.primary }}
                  title={theme.name}
                >
                  {selectedTheme === theme.id && (
                    <Check className="w-5 h-5 text-white drop-shadow-sm" />
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs text-text-secondary mt-2">
              {THEMES.find((t) => t.id === selectedTheme)?.name} — changes instantly
            </p>
          </div>

          <div className="max-w-md space-y-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                Site Title
              </label>
              <input
                type="text"
                value={siteTitle}
                onChange={(e) => setSiteTitle(e.target.value)}
                className="input-field"
                placeholder="ESD Project"
              />
              <p className="text-xs text-text-secondary mt-1">
                Shown in the navbar. Default: &quot;ESD Project&quot;
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                Footer Text
              </label>
              <input
                type="text"
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                className="input-field"
                placeholder="Created with ❤️ for all FBS"
              />
              <p className="text-xs text-text-secondary mt-1">
                Shown in the footer. Default: &quot;Created with ❤️ for all FBS&quot;
              </p>
            </div>

            <button
              onClick={handleSaveConfig}
              disabled={
                saving === "config" ||
                !siteTitle.trim() ||
                (siteTitle.trim() === originalSiteTitle &&
                  footerText.trim() === originalFooterText)
              }
              className="btn-primary"
            >
              {saving === "config" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
