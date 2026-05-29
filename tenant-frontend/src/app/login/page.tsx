"use client";

import React, { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GoogleOAuthProvider, GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { ToastProvider, toast } from "../../components/ui/toast";
import { ApiError, apiRequest } from "../../lib/api";
import { env } from "../../lib/env";
import { getPostLoginPath } from "../../lib/auth-redirect";
import type { UserRole } from "../../context/AuthContext";

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

  // Auto-load subscription workspace parameters from checkout token
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const checkoutToken = urlParams.get("checkout_token");
      if (checkoutToken) {
        apiRequest<any>(`/subscription/checkout/state/${checkoutToken}`)
          .then((data) => {
            if (data?.success) {
              setPhoneNumber(data.phone || "");
              toast.success(
                "Workspace Provisioned",
                `Registered ${data.companyName} on the ${data.tier} tier. Please log in.`,
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
      toast.warning("Validation Failed", "Please enter your email and password.");
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
      toast.warning("Verification Blocked", "Please enter a valid Phone and 4-digit security PIN.");
      return;
    }

    setIsLoading(true);
    try {
      const data = await apiRequest<any>("/api/v1/auth/employee-login", {
        method: "POST",
        body: JSON.stringify({ phoneNumber, pin: pinCode }),
      });
      if (data?.accessToken) {
        toast.success("Security Cleared", "Welcome back to Demoz Workforce Cloud.");
        router.push("/dashboard");
      } else {
        toast.error("Login Failed", data.message || "Invalid phone or PIN.");
      }
    } catch (err: any) {
      toast.error("Connection Error", err.message || "Could not reach the Demoz backend.");
    } finally {
      setIsLoading(false);
    }
  };

  const appendPinDigit = (digit: string) => {
    if (pinCode.length < 4) {
      setPinCode((prev) => prev + digit);
    }
  };

  const clearPinDigit = () => {
    setPinCode((prev) => prev.slice(0, -1));
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070b13] flex flex-col justify-between p-6 relative select-none transition-colors">
      
      {/* Background visual graphics */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] aspect-square rounded-full bg-emerald-500/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] aspect-square rounded-full bg-teal-500/10 blur-[150px] pointer-events-none" />

      {/* Header Brand logo */}
      <header className="flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-500 dark:to-teal-400 bg-clip-text text-transparent font-outfit tracking-tight">
            Demoz Workforce Cloud
          </span>
          <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/25 uppercase tracking-widest">
            PRO SECURE
          </span>
        </div>

        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
          System: <span className="text-emerald-600 dark:text-emerald-500 font-bold">ONLINE ✓</span>
        </div>
      </header>

      {/* Main glassmorphic console body */}
      <main className="flex-1 flex items-center justify-center py-10 z-10">
        <div className="w-full max-w-md bg-white/80 dark:bg-[#0c1424]/60 border border-slate-200 dark:border-zinc-800/80 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-2xl flex flex-col justify-between gap-6 min-h-[500px]">
          
          <div className="text-center space-y-1.5">
            <h2 className="text-lg font-bold text-slate-900 dark:text-zinc-100 font-outfit">Enterprise Terminal Access</h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Compliant payroll administration for corporate factories and retail networks.
            </p>
          </div>

          {/* Mode Selector */}
          <div className="flex bg-slate-100 dark:bg-zinc-900/60 rounded-xl p-1 gap-1">
            <button
              type="button"
              onClick={() => setLoginMode("owner")}
              className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                loginMode === "owner"
                  ? "bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-zinc-300"
              }`}
            >
              Owner / HR
            </button>
            <button
              type="button"
              onClick={() => setLoginMode("employee")}
              className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                loginMode === "employee"
                  ? "bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-zinc-300"
              }`}
            >
              Employee
            </button>
          </div>

          {workspaceDenied && loginMode === "owner" && (
            <div
              className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-left text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
              role="alert"
            >
              Access Denied. Your workspace is not registered. Contact your HR administrator.
            </div>
          )}

          {/* OWNER / HR Login Form */}
          {loginMode === "owner" && (
            <form onSubmit={handleOwnerLogin} className="space-y-4 animate-fade-in">
              <div className="space-y-3">
                <div className="space-y-1 text-xs">
                  <label className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="admin@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1 text-xs">
                  <label className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-900/20 dark:shadow-emerald-950/35 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-40"
              >
                {isLoading ? "Validating credentials..." : "Access Corporate Console →"}
              </button>

              {googleClientId && (
                <div className="pt-2">
                  <div className="relative py-2 text-center text-[9px] uppercase tracking-widest text-slate-400">
                    <span className="bg-white/80 dark:bg-[#0c1424]/60 px-2 relative z-10">or</span>
                    <span className="absolute left-0 right-0 top-1/2 border-t border-slate-200 dark:border-zinc-800" />
                  </div>
                  <div className="flex justify-center">
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={() =>
                        toast.error("Google sign-in failed", "Try email and password instead.")
                      }
                      theme="filled_black"
                      size="large"
                      shape="pill"
                      text="continue_with"
                    />
                  </div>
                </div>
              )}
            </form>
          )}

          {/* EMPLOYEE Login Form */}
          {loginMode === "employee" && (
            <form onSubmit={handleEmployeeLogin} className="space-y-4 animate-fade-in">
              <div className="space-y-3">
                <div className="space-y-1 text-xs">
                  <label className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Corporate Phone Number</label>
                  <input
                    type="text"
                    required
                    placeholder="0911000000"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs text-slate-900 dark:text-zinc-100 font-mono text-center tracking-wider focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1 text-xs">
                  <label className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">4-Digit Security PIN</label>
                  <input
                    type="password"
                    required
                    maxLength={4}
                    placeholder="••••"
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-lg text-slate-900 dark:text-zinc-100 font-mono text-center tracking-[1em] pl-[1.4em] focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Custom Interactive PIN Pad */}
              <div className="grid grid-cols-3 gap-2 py-2 select-none">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => appendPinDigit(digit)}
                    className={`py-2 bg-slate-100 dark:bg-zinc-900/60 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white rounded-xl text-xs font-mono font-bold transition-all cursor-pointer active:scale-95 border border-slate-200 dark:border-zinc-800/40 ${
                      digit === "0" ? "col-span-2" : ""
                    }`}
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={clearPinDigit}
                  className="py-2 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30 text-red-500 dark:text-red-400 rounded-xl text-[10px] font-bold transition-all cursor-pointer active:scale-95 border border-red-100 dark:border-red-900/20"
                >
                  Clear
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-900/20 dark:shadow-emerald-950/35 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-40"
              >
                {isLoading ? "Validating credentials..." : "Access Corporate Console →"}
              </button>
            </form>
          )}

          {/* Quick links */}
          <div className="flex justify-between items-center text-[9px] text-slate-500 dark:text-slate-500 border-t border-slate-200 dark:border-zinc-800/60 pt-4">
            <span className="hover:text-slate-700 dark:hover:text-zinc-300 cursor-pointer">Regulatory Guide</span>
            <span 
              onClick={() => router.push("/")}
              className="hover:text-emerald-500 dark:hover:text-emerald-400 cursor-pointer"
            >
              ← Back to Home
            </span>
          </div>

        </div>
      </main>

      {/* Footer copyright */}
      <footer className="text-center text-[9px] text-slate-500 dark:text-slate-500 z-10 select-none">
        © 2026 Demoz Workforce Cloud. Powered by secure CBE &amp; Chapa APIs. Hawassa &amp; Bole Lemi Industrial Parks Compliance.
      </footer>

      {/* LOADING OVERLAY */}
      {isLoading && (
        <div className="fixed inset-0 bg-white/80 dark:bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-xs bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-zinc-800 p-6 rounded-3xl shadow-2xl text-center space-y-4 animate-slide-up">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 font-outfit">Authenticating</h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                Authorizing session keys with multi-tenant registry.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LoginPageWrapper() {
  const clientId = env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const content = (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 dark:bg-[#070b13]" />}>
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
