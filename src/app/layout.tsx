import type { Metadata, Viewport } from "next";
import ThemeProvider from "@/components/ui/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "ESD Classroom",
  description:
    "A simple platform for lecturers to collect and manage student assignment links — inspired by Google Classroom.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ESD Classroom",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#1a73e8",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/*
          Inline script to apply theme BEFORE React hydrates — eliminates blue flash.
          Reads saved theme from localStorage and sets CSS vars on <html> instantly.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var t = JSON.parse(localStorage.getItem("esd-config"));
                if (t && t.primary) {
                  var r = document.documentElement;
                  r.style.setProperty("--color-primary", t.primary, "important");
                  r.style.setProperty("--color-primary-dark", t.dark, "important");
                  r.style.setProperty("--color-primary-light", t.light, "important");
                }
              } catch(e){}
            `,
          }}
        />
        {/*
          Block finger zoom (pinch & double-tap) across the whole app.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                function blockZoom(e) {
                  if (e.touches && e.touches.length > 1) e.preventDefault();
                }
                function blockGesture(e) { e.preventDefault(); }
                function blockCtrl(e) {
                  if (e.ctrlKey && (e.key === "+" || e.key === "-" || e.key === "=" || e.key === "0")) e.preventDefault();
                }
                document.addEventListener("touchmove", blockZoom, { passive: false });
                document.addEventListener("gesturestart", blockGesture, { passive: false });
                document.addEventListener("gesturechange", blockGesture, { passive: false });
                document.addEventListener("gestureend", blockGesture, { passive: false });
                document.addEventListener("wheel", function (e) { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
                document.addEventListener("keydown", blockCtrl);
              })();
            `,
          }}
        />
        {/*
          Register the service worker for PWA install & offline support.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ("serviceWorker" in navigator) {
                window.addEventListener("load", function () {
                  navigator.serviceWorker.register("/sw.js").catch(function () {});
                });
              }
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-white">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
