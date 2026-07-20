"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  GraduationCap,
  BookOpen,
  ChevronRight,
  School,
} from "lucide-react";
import type { Class } from "@/types";
import Navbar from "@/components/ui/navbar";
import Footer from "@/components/ui/footer";

export default function HomePage() {
  const router = useRouter();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function init() {
      // If lecturer is logged in, redirect to dashboard
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        router.replace("/dashboard");
        return;
      }

      // Otherwise show student homepage
      const { data } = await supabase
        .from("classes")
        .select("*")
        .order("created_at", { ascending: false });
      if (data) setClasses(data);
      setLoading(false);
    }

    init();
  }, [router]);

  return (
    <div className="min-h-screen bg-white flex flex-col pt-16">
      <Navbar />

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 pt-6 pb-8 md:pb-12 flex-1 w-full">
        {/* Welcome Hero */}
        <div className="text-center md:text-left mb-8 md:mb-10 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 bg-primary-light text-primary text-xs font-medium rounded-full px-3 py-1 mb-3">
                <School className="w-3.5 h-3.5" />
                ESD Learning Platform
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-text leading-tight">
                Welcome, Students!
              </h1>
              <p className="text-text-secondary text-sm sm:text-base mt-2 max-w-lg">
                Select your class below to view assignments and submit your
                work. Make sure to choose the correct class.
              </p>
            </div>

            {/* Quick stat */}
            {!loading && classes.length > 0 && (
              <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-5 py-3 border border-gray-100 shrink-0">
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-lg font-bold text-text leading-tight">
                    {classes.length}
                  </p>
                  <p className="text-xs text-text-secondary">
                    Class{classes.length !== 1 ? "es" : ""}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section heading */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base sm:text-lg font-semibold text-text">
            Available Classes
          </h2>
          {!loading && classes.length > 0 && (
            <span className="text-xs text-text-secondary">
              {classes.length} class{classes.length !== 1 ? "es" : ""} total
            </span>
          )}
        </div>

        {/* Class Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-gray-200 overflow-hidden"
              >
                <div className="skeleton h-24" />
                <div className="p-4 space-y-2">
                  <div className="skeleton h-4 w-3/4" />
                  <div className="skeleton h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : classes.length === 0 ? (
          <div className="text-center py-16 md:py-20">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-text mb-1">
              No classes available yet
            </h3>
            <p className="text-sm text-text-secondary">
              Check back later for available classes.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {classes.map((cls) => (
              <Link
                key={cls.id}
                href={`/class/${cls.id}`}
                className="group rounded-xl border border-gray-200 overflow-hidden transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 bg-white"
              >
                {/* Header band — solid blue */}
                <div className="bg-primary h-24 px-5 py-4 flex flex-col justify-end relative">
                  <h3 className="text-white font-semibold text-base leading-tight line-clamp-2">
                    {cls.name}
                  </h3>
                  {cls.description && (
                    <p className="text-white/70 text-xs mt-0.5 line-clamp-1">
                      {cls.description}
                    </p>
                  )}
                </div>

                {/* Footer */}
                <div className="px-5 py-3 flex items-center justify-between">
                  <span className="text-xs text-text-secondary">
                    Tap to open
                  </span>
                  <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-primary transition-colors">
                    <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
