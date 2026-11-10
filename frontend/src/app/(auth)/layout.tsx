"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/context/auth-context";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.replace("/chats");
  }, [status, router]);

  return (
    <main className="flex min-h-full items-center justify-center bg-gradient-to-br from-indigo-50 via-slate-100 to-slate-100 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2 text-indigo-600">
          <svg viewBox="0 0 24 24" fill="currentColor" className="size-8" aria-hidden>
            <path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2z" />
          </svg>
          <span className="text-xl font-bold tracking-tight text-slate-900">Chat</span>
        </div>
        {status === "loading" || status === "authenticated" ? (
          <div className="flex justify-center py-16 text-indigo-600">
            <Spinner className="size-8" />
          </div>
        ) : (
          <div className="animate-dialog-in rounded-2xl bg-white p-8 shadow-xl shadow-slate-200/60 ring-1 ring-slate-200">
            {children}
          </div>
        )}
      </div>
    </main>
  );
}
