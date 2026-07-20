import type { Metadata } from "next";
import ThemeProvider from "@/components/ui/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "ESD Classroom",
  description:
    "A simple platform for lecturers to collect and manage student assignment links — inspired by Google Classroom.",
  icons: {
    icon: "/favicon.ico",
  },
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
                var t = JSON.parse(localStorage.getItem("esd-theme"));
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
      </head>
      <body className="min-h-screen bg-white">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
