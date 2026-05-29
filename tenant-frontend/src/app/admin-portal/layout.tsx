"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ToastProvider } from "@/components/ui/toast";

function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login?next=/admin-portal");
      return;
    }
    if (user.role !== "SUPER_ADMIN") {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  if (loading || !user || user.role !== "SUPER_ADMIN") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#060708] text-sm text-[#8e8983]">
        Verifying platform access…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060708] text-[#f3efe6]">
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-[#d9b06a]">Demoz Platform</p>
          <h1 className="text-lg font-semibold">Super Admin</h1>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-[#8e8983]">{user.email}</span>
          <Link href="/" className="text-[#8e8983] hover:text-[#f3efe6]">
            Marketing site
          </Link>
          <button
            type="button"
            onClick={() => logout().then(() => router.push("/login"))}
            className="text-[#d9b06a] hover:underline"
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10 space-y-8">{children}</main>
    </div>
  );
}

export default function AdminPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <AdminShell>{children}</AdminShell>
      </AuthProvider>
    </ToastProvider>
  );
}
