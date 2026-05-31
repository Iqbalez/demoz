"use client";

import React, { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GoogleOAuthProvider, GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { ToastProvider, toast } from "../../components/ui/toast";
import { ApiError, apiRequest } from "../../lib/api";
import { env } from "../../lib/env";
import { getPostLoginPath } from "../../lib/auth-redirect";
import type { UserRole } from "../../context/AuthContext";
import { DemozLogo } from "../../components/brand/DemozLogo";
import Link from "next/link";

function BiometricLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [workspaceDenied, setWorkspaceDenied] = useState(false);

  const [loginMode, setLoginMode] = useState<"owner" | "employee">("owner");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const googleClientId = env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const finishLogin = (role: UserRole) => {
    const next = searchParams.get("next");
    router.push(getPostLoginPath(role, next));
  };

  const handleAuthError = (err: unknown) => {
    if (err instanceof ApiError && err.errorCode === "ERR_UNAUTHORIZED_WORKSPACE") {
      setWorkspaceDenied(true);
      toast.error("Access denied", err.message);
      return;
    }
    if (err instanceof ApiError) {
      const title = err.status === 401 ? "Login failed" : "Request failed";
      toast.error(title, err.message);
      return;
    }
    const message = err instanceof Error ? err.message : "Could not reach the Demoz backend.";
    toast.error("Connection error", message);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("demoz_tenant_id");
      const urlParams = new URLSearchParams(window.location.search);
      const checkoutToken = urlParams.get("checkout_token");
      if (checkoutToken) {
        apiRequest<any>(`/subscription/checkout/state/${checkoutToken}`)
          .then((data) => {
            if (data?.success) {
              setPhoneNumber(data.phone || "");
              if (data.email) setEmail(data.email);
              setLoginMode("owner");
              toast.success(
                "Workspace ready",
                `Registered ${data.companyName} on the ${data.tier} tier. Sign in to continue.`,
              );
            }
          })
          .catch((err) => {
            console.error("Failed to load secure checkout token:", err);
          });
      }
    }
  }, []);

  const handleOwnerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.warning("Missing fields", "Enter your email and password.");
      return;
    }

    setIsLoading(true);
    setWorkspaceDenied(false);
    try {
      const data = await apiRequest<{ accessToken: string; user: { role: UserRole } }>(
        "/api/v1/auth/login",
        {
          method: "POST",
          body: JSON.stringify({ email, password }),
        },
      );
      if (data?.accessToken) {
        toast.success("Welcome back", "You are signed in.");
        finishLogin(data.user.role);
      } else {
        toast.error("Login failed", "Invalid credentials.");
      }
    } catch (err: unknown) {
      handleAuthError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (response: CredentialResponse) => {
    if (!response.credential) return;
    setIsLoading(true);
    setWorkspaceDenied(false);
    try {
      const data = await apiRequest<{ accessToken: string; user: { role: UserRole } }>(
        "/api/v1/auth/google",
        {
          method: "POST",
          body: JSON.stringify({ credential: response.credential }),
        },
      );
      toast.success("Welcome back", "Signed in with Google.");
      finishLogin(data.user.role);
    } catch (err: unknown) {
      handleAuthError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmployeeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber || pinCode.length !== 4) {
      toast.warning("Check your details", "Enter a valid phone number and 4-digit PIN.");
      return;
    }

    setIsLoading(true);
    try {
      const data = await apiRequest<any>("/api/v1/auth/employee-login", {
        method: "POST",
        body: JSON.stringify({ phoneNumber, pin: pinCode }),
      });
      if (data?.accessToken) {
        toast.success("Signed in", "Welcome back.");
        router.push("/dashboard");
      } else {
        toast.error("Login failed", data.message || "Invalid phone or PIN.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not reach the server.";
      toast.error("Connection error", message);
    } finally {
      setIsLoading(false);
    }
  };

  const appendPinDigit = (digit: string) => {
    if (pinCode.length < 4) setPinCode((prev) => prev + digit);
  };

  const clearPinDigit = () => setPinCode((prev) => prev.slice(0, -1));

  return (
    <div className="workspace-theme min-h-screen bg-white flex">
      {/* Brand panel */}
      <aside className="hidden lg:flex lg:w-[44%] xl:w-[42%] flex-col justify-between p-10 xl:p-14 bg-[var(--brand-primary-light)] border-r border-[var(--border)]">
        <DemozLogo href="/" size={44} wordmarkClassName="text-xl" />

        <div className="space-y-6 max-w-md">
          <h1 className="text-3xl xl:text-4xl font-bold text-[var(--text-primary)] tracking-tight leading-tight">
            HR &amp; payroll built for Ethiopian teams
          </h1>
          <p className="text-base text-[var(--text-secondary)] leading-relaxed">
            ERCA-ready tax, attendance, leave, and Chapa disbursements — without spreadsheet month-end chaos.
          </p>
          <ul className="space-y-3 text-sm text-[var(--text-secondary)]">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)]" />
              Compliant payroll &amp; pension
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-teal)]" />
              USSD &amp; mobile attendance
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-gold)]" />
              Fayda-ready employee records
            </li>
          </ul>
        </div>

        <p className="text-xs text-[var(--text-muted)]">© {new Date().getFullYear()} Demoz</p>
      </aside>

      {/* Sign-in panel */}
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="flex items-center justify-between px-6 py-5 lg:px-10 border-b border-[var(--border)] lg:border-none">
          <div className="lg:hidden">
            <DemozLogo href="/" size={36} />
          </div>
          <Link
            href="/"
            className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--brand-primary)] transition-colors ml-auto"
          >
            ← Back to home
          </Link>
        </header>

        <main className="flex-1 flex items-center justify-center px-6 py-8 lg:px-12">
          <div className="w-full max-w-[400px] space-y-8">
            <div className="space-y-2 text-center lg:text-left">
              <h2 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Sign in</h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Access your company workspace
              </p>
            </div>

            <div className="flex rounded-xl bg-[var(--bg-subtle)] p-1 border border-[var(--border)]">
              <button
                type="button"
                onClick={() => setLoginMode("owner")}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  loginMode === "owner"
                    ? "bg-white text-[var(--brand-primary)] shadow-sm border border-[var(--border)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                }`}
              >
                Owner / HR
              </button>
              <button
                type="button"
                onClick={() => setLoginMode("employee")}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  loginMode === "employee"
                    ? "bg-white text-[var(--brand-primary)] shadow-sm border border-[var(--border)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                }`}
              >
                Employee
              </button>
            </div>

            {workspaceDenied && loginMode === "owner" && (
              <div
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                role="alert"
              >
                Your workspace is not registered. Contact your HR administrator.
              </div>
            )}

            {loginMode === "owner" && (
              <form onSubmit={handleOwnerLogin} className="space-y-5">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-[var(--text-primary)]">Email</label>
                    <input
                      type="email"
                      required
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-[var(--text-primary)]">Password</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-field"
                    />
                  </div>
                </div>

                <button type="submit" disabled={isLoading} className="btn-primary w-full py-3 text-sm">
                  {isLoading ? "Signing in…" : "Sign in"}
                </button>

                {googleClientId && (
                  <div className="space-y-3">
                    <div className="relative text-center text-xs text-[var(--text-muted)]">
                      <span className="bg-white px-2 relative z-10">or continue with</span>
                      <span className="absolute left-0 right-0 top-1/2 border-t border-[var(--border)]" />
                    </div>
                    <div className="flex justify-center">
                      <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={() =>
                          toast.error("Google sign-in failed", "Try email and password instead.")
                        }
                        theme="outline"
                        size="large"
                        shape="rectangular"
                        text="continue_with"
                        width={360}
                      />
                    </div>
                  </div>
                )}
              </form>
            )}

            {loginMode === "employee" && (
              <form onSubmit={handleEmployeeLogin} className="space-y-5">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-[var(--text-primary)]">Phone number</label>
                    <input
                      type="text"
                      required
                      placeholder="0911000000"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="input-field text-center font-mono tracking-wide"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-[var(--text-primary)]">4-digit PIN</label>
                    <input
                      type="password"
                      required
                      maxLength={4}
                      placeholder="••••"
                      value={pinCode}
                      onChange={(e) => setPinCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      className="input-field text-center text-lg font-mono tracking-[0.5em]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map((digit) => (
                    <button
                      key={digit}
                      type="button"
                      onClick={() => appendPinDigit(digit)}
                      className={`py-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-primary)] font-mono font-semibold hover:bg-[var(--bg-elevated)] transition-colors ${
                        digit === "0" ? "col-span-2" : ""
                      }`}
                    >
                      {digit}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={clearPinDigit}
                    className="py-3 rounded-xl border border-red-200 bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100"
                  >
                    Clear
                  </button>
                </div>

                <button type="submit" disabled={isLoading} className="btn-primary w-full py-3 text-sm">
                  {isLoading ? "Signing in…" : "Sign in"}
                </button>
              </form>
            )}
          </div>
        </main>
      </div>

      {isLoading && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="flex flex-col items-center gap-4 p-8 rounded-2xl border border-[var(--border)] bg-white shadow-lg">
            <div className="w-10 h-10 border-[3px] border-[var(--brand-primary)] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium text-[var(--text-secondary)]">Signing you in…</p>
          </div>
        </div>
      )}
    </div>
  );
}

function LoginPageWrapper() {
  const clientId = env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const content = (
    <Suspense fallback={<div className="workspace-theme min-h-screen bg-white" />}>
      <BiometricLoginContent />
    </Suspense>
  );

  return clientId ? (
    <GoogleOAuthProvider clientId={clientId}>{content}</GoogleOAuthProvider>
  ) : (
    content
  );
}

export default function BiometricLoginPage() {
  return (
    <ToastProvider>
      <LoginPageWrapper />
    </ToastProvider>
  );
}
