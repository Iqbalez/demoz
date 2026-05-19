"use client";

import React, { useState, useEffect, createContext, useContext } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type: ToastType;
  duration?: number;
}

type ToastContextType = {
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, "id">) => void;
  removeToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

let globalAddToast: ((toast: Omit<ToastMessage, "id">) => void) | null = null;

export const toast = {
  success: (title: string, description?: string) => {
    globalAddToast?.({ title, description, type: "success" });
  },
  error: (title: string, description?: string) => {
    globalAddToast?.({ title, description, type: "error" });
  },
  info: (title: string, description?: string) => {
    globalAddToast?.({ title, description, type: "info" });
  },
  warning: (title: string, description?: string) => {
    globalAddToast?.({ title, description, type: "warning" });
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (t: Omit<ToastMessage, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { ...t, id };
    setToasts((prev) => [...prev, newToast]);

    const duration = t.duration || 4000;
    setTimeout(() => {
      removeToast(id);
    }, duration);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  };

  useEffect(() => {
    globalAddToast = addToast;
    return () => {
      globalAddToast = null;
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      {/* Dynamic Floating Toast Overlay Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((msg) => {
          let bgClass = "bg-white dark:bg-slate-900 border-slate-200 dark:border-zinc-800/80";
          let textClass = "text-slate-800 dark:text-zinc-100";
          let icon = "🔔";

          if (msg.type === "success") {
            bgClass = "bg-emerald-500/10 dark:bg-emerald-950/20 border-emerald-500/20 dark:border-emerald-500/30";
            textClass = "text-emerald-700 dark:text-emerald-400";
            icon = "✓";
          } else if (msg.type === "error") {
            bgClass = "bg-red-500/10 dark:bg-red-950/20 border-red-500/20 dark:border-red-500/30";
            textClass = "text-red-700 dark:text-red-400";
            icon = "✕";
          } else if (msg.type === "warning") {
            bgClass = "bg-amber-500/10 dark:bg-amber-950/20 border-amber-500/20 dark:border-amber-500/30";
            textClass = "text-amber-700 dark:text-amber-400";
            icon = "⚠️";
          } else if (msg.type === "info") {
            bgClass = "bg-blue-500/10 dark:bg-blue-950/20 border-blue-500/20 dark:border-blue-500/30";
            textClass = "text-blue-700 dark:text-blue-400";
            icon = "ℹ️";
          }

          return (
            <div
              key={msg.id}
              className={`p-4 rounded-2xl border backdrop-blur-md shadow-2xl flex gap-3 items-start pointer-events-auto animate-slide-up transition-all ${bgClass}`}
            >
              <div className="w-6 h-6 rounded-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 flex items-center justify-center font-bold text-xs select-none shrink-0">
                {icon}
              </div>
              <div className="flex-1 space-y-0.5">
                <h4 className={`text-xs font-bold font-outfit ${textClass}`}>{msg.title}</h4>
                {msg.description && (
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400 leading-relaxed font-medium">
                    {msg.description}
                  </p>
                )}
              </div>
              <button
                onClick={() => removeToast(msg.id)}
                className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 font-bold select-none cursor-pointer"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside a ToastProvider");
  }
  return context;
}
