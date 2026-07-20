"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GraduationCap, LogOut, Settings } from "lucide-react";
import { readLocalConfig } from "@/components/ui/theme-provider";

interface NavbarProps {
  /** Extra content on the left side (before logo), e.g. mobile menu toggle */
  leftContent?: React.ReactNode;
  /** Extra content on the right side (before auth section), e.g. Dashboard link */
  rightContent?: React.ReactNode;
  /** If true, hides the sign in / user info section entirely */
  hideAuth?: boolean;
  /** If true, shows the Sign Out button (dashboard only) */
  showSignOut?: boolean;
}

export default function Navbar({ leftContent, rightContent, hideAuth, showSignOut }: NavbarProps) {
  const [userName, setUserName] = useState<string | null>(null);
  // Read siteTitle from localStorage sync to avoid flash of default
  const [siteTitle, setSiteTitle] = useState(() =>
    readLocalConfig().siteTitle || "ESD Project"
  );
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Listen for live config updates from settings page
  const handleConfigChange = useCallback((e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (detail?.siteTitle) {
      setSiteTitle(detail.siteTitle);
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();

    // Fetch auth + app config in parallel
    Promise.all([
      supabase.auth.getUser(),
      supabase.from("app_config").select("site_title").maybeSingle(),
    ]).then(([{ data: userData }, { data: config }]) => {
      if (userData.user) {
        const name =
          userData.user.user_metadata?.display_name ||
          userData.user.user_metadata?.full_name ||
          userData.user.email?.split("@")[0] ||
          "";
        setUserName(name);
      }
      if (config) {
        setSiteTitle(config.site_title || "ESD Project");
      }
      setLoading(false);
    });

    // Listen for live config updates
    window.addEventListener("site-config-changed", handleConfigChange);
    return () =>
      window.removeEventListener("site-config-changed", handleConfigChange);
  }, [handleConfigChange]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <nav className="navbar">
      {/* Left section */}
      <div className="flex items-center gap-2">
        {leftContent}

        <Link href="/" className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="min-w-0">
            <span className="font-semibold text-[13px] sm:text-[15px] text-text tracking-tight truncate block max-w-[100px] sm:max-w-none">
              {siteTitle}
            </span>
            <span className="text-[11px] text-text-secondary hidden sm:block -mt-0.5 leading-tight">
              · by Diantari Kusuma
            </span>
          </div>
        </Link>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2 ml-auto">
        {rightContent}

        {!hideAuth && !loading && (
          userName ? (
            <>
              {/* Dashboard link — always shown when logged in */}
              <Link
                href="/dashboard"
                className="text-sm font-medium text-primary hover:text-primary-dark transition-colors hidden sm:block whitespace-nowrap"
              >
                Dashboard
              </Link>
              <span className="text-xs sm:text-sm font-medium text-text-secondary whitespace-nowrap truncate max-w-[70px] sm:max-w-none" title={userName || ""}>
                Hi, {userName}
              </span>
              {/* Settings & Sign Out — only in dashboard */}
              {showSignOut && (
                <>
                  <Link
                    href="/dashboard/settings"
                    className="btn-ghost text-sm p-1.5 sm:px-4 sm:py-2"
                    title="Settings"
                  >
                    <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Settings</span>
                  </Link>
                  <button onClick={handleLogout} className="btn-ghost text-sm p-1.5 sm:px-4 sm:py-2" title="Sign Out">
                    <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </button>
                </>
              )}
            </>
          ) : (
            <Link
              href="/login"
              className="text-sm font-medium text-primary hover:text-primary-dark transition-colors"
            >
              Sign in
            </Link>
          )
        )}
      </div>
    </nav>
  );
}
