"use client";

import Navbar from "@/components/ui/navbar";
import Footer from "@/components/ui/footer";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background pt-16 flex flex-col">
      {/* Simple Navbar — same as homepage */}
      <Navbar showSignOut />

      {/* Main content */}
      <main className="pt-24 pb-8 px-4 md:px-8 max-w-7xl mx-auto w-full flex-1">
        {children}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
