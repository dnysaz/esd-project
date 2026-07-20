"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Heart } from "lucide-react";

export default function Footer() {
  const [footerText, setFooterText] = useState<string | null>(null);

  // Listen for live config updates from settings page
  const handleConfigChange = useCallback((e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (detail?.footerText) {
      setFooterText(detail.footerText);
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("app_config")
      .select("footer_text")
      .single()
      .then(({ data }) => {
        if (data) setFooterText(data.footer_text);
      });

    // Listen for live config updates
    window.addEventListener("site-config-changed", handleConfigChange);
    return () =>
      window.removeEventListener("site-config-changed", handleConfigChange);
  }, [handleConfigChange]);

  return (
    <footer className="border-t border-gray-200 bg-white flex-shrink-0">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-5 text-center">
        <p className="text-xs text-gray-400 flex items-center justify-center gap-1.5">
          {footerText || (
            <>
              Created with <Heart className="w-3.5 h-3.5 text-red-400 fill-red-400" /> for all FBS
            </>
          )}
        </p>
      </div>
    </footer>
  );
}
