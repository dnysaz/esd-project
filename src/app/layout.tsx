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
    <html lang="en">
      <body className="min-h-screen bg-white">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
