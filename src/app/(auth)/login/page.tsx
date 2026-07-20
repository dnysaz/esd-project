"use client";

import { Suspense } from "react";
import LoginForm from "./login-form";

// Inner component with useSearchParams must be wrapped in Suspense
// https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md animate-fade-in">
          <div className="skeleton w-16 h-16 rounded-full mx-auto mb-4" />
          <div className="skeleton h-8 w-48 mx-auto mb-2" />
          <div className="skeleton h-4 w-64 mx-auto mb-8" />
          <div className="rounded-xl border border-border p-6 space-y-4">
            <div className="skeleton h-12 w-full rounded-lg" />
            <div className="skeleton h-12 w-full rounded-lg" />
            <div className="skeleton h-12 w-full rounded-full" />
          </div>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
