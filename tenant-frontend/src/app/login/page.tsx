"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ToastProvider, toast } from "../../components/ui/toast";

function BiometricLoginContent() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Biometric toggle simulation
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // Auto load biometric state if set previously
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const checkoutToken = urlParams.get("checkout_token");
      if (checkoutToken) {
        // Retrieve subscription workspace parameters securely using short-lived opaque token
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/subscription/checkout/state/${checkoutToken}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              localStorage.setItem("demoz_tier", data.tier);
              localStorage.setItem("demoz_company", data.companyName);
              localStorage.setItem("demoz_phone", data.phone);
              setPhoneNumber(data.phone);
              toast.success("Workspace Provisioned", `Registered ${data.companyName} on the ${data.tier} tier.`);
            }
          })
          .catch((err) => {
            console.error("Failed to load secure checkout token:", err);
          });
      }
    }

    const enabled = localStorage.getItem("demoz_biometrics") === "true";
    setBiometricsEnabled(enabled);
    if (enabled) {
      const storedPhone = localStorage.getItem("demoz_phone") || "";
      setPhoneNumber(storedPhone);
    }
  }, []);

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber || pinCode.length !== 4) {
      toast.warning("Verification Blocked", "Please enter a valid Phone and 4-digit security PIN.");
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      localStorage.setItem("demoz_phone", phoneNumber);
      
      if (!biometricsEnabled) {
        // Prompt biometrics setup dialog
        const enable = window.confirm("Enable quick biometrics (Touch/Face ID simulation) for faster future logins?");
        if (enable) {
          localStorage.setItem("demoz_biometrics", "true");
          setBiometricsEnabled(true);
        }
      }

      toast.success("Security Cleared", "Welcome back to Demoz Workforce Cloud.");
      router.push("/dashboard");
    }, 1200);
  };

  const handleTriggerBiometricScan = () => {
    if (!biometricsEnabled) {
      toast.info("Biometrics Setup Required", "Log in manually with your PIN first to link biometrics.");
      return;
    }

    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      toast.success("Touch ID Matched", "Biometric signature validated.");
      router.push("/dashboard");
    }, 1500);
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

          {/* Interactive Biometrics quick login trigger */}
          {biometricsEnabled && (
            <div className="flex flex-col items-center justify-center p-4 bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10 rounded-2xl animate-fade-in text-center space-y-3">
              <div 
                onClick={handleTriggerBiometricScan}
                className={`w-16 h-16 rounded-full border border-emerald-200 dark:border-emerald-500/20 bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center text-3xl cursor-pointer hover:bg-emerald-200 dark:hover:bg-emerald-500/20 active:scale-95 transition-all duration-300 relative select-none ${
                  isScanning ? "animate-pulse border-emerald-400" : ""
                }`}
              >
                <span>👤</span>
                {isScanning && (
                  <div className="absolute inset-0 border-2 border-emerald-400 rounded-full animate-ping pointer-events-none" />
                )}
              </div>
              <div>
                <button
                  type="button"
                  onClick={handleTriggerBiometricScan}
                  className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 uppercase tracking-widest cursor-pointer"
                >
                  {isScanning ? "Scanning touch signature..." : "Click to Scan Touch ID"}
                </button>
                <p className="text-[9px] text-slate-500 dark:text-slate-500 mt-1">Biometrics linked with phone {phoneNumber}</p>
              </div>
            </div>
          )}

          {/* Manual input authentication */}
          <form onSubmit={handleManualLogin} className="space-y-4">
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
              disabled={isLoading || isScanning}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-900/20 dark:shadow-emerald-950/35 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-40"
            >
              {isLoading ? "Validating credentials..." : "Access Corporate Console →"}
            </button>
          </form>

          {/* Quick links */}
          <div className="flex justify-between items-center text-[9px] text-slate-500 dark:text-slate-500 border-t border-slate-200 dark:border-zinc-800/60 pt-4">
            <span className="hover:text-slate-700 dark:hover:text-zinc-300 cursor-pointer">Regulatory Guide</span>
            <span 
              onClick={() => {
                localStorage.clear();
                setBiometricsEnabled(false);
                setPhoneNumber("");
                setPinCode("");
                toast.info("Cache Purged", "Simulated biometric tokens cleared.");
              }}
              className="hover:text-red-500 dark:hover:text-red-400 cursor-pointer"
            >
              Reset Session
            </span>
          </div>

        </div>
      </main>

      {/* Footer copyright */}
      <footer className="text-center text-[9px] text-slate-500 dark:text-slate-500 z-10 select-none">
        © 2026 Demoz Workforce Cloud. Powered by secure CBE & Chapa APIs. Hawassa & Bole Lemi Industrial Parks Compliance.
      </footer>

      {/* DISBURSING PROGRESS SPLASH OVERLAY */}
      {isLoading && (
        <div className="fixed inset-0 bg-white/80 dark:bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-xs bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-zinc-800 p-6 rounded-3xl shadow-2xl text-center space-y-4 animate-slide-up">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 font-outfit">Symmetric PIN match</h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                Authorizing session keys with multi-tenant registry limits.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BiometricLoginPage() {
  return (
    <ToastProvider>
      <BiometricLoginContent />
    </ToastProvider>
  );
}
