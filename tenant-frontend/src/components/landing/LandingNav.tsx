"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

const links = [
  { href: "#capabilities", label: "What you get" },
  { href: "#compliance", label: "Compliance" },
  { href: "#process", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
];

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color] duration-300 ${
        scrolled ? "border-b border-[var(--m-border)] bg-[var(--m-bg)]/90 backdrop-blur-md" : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-[4.5rem] max-w-[76rem] items-center justify-between px-6 lg:px-10">
        <Link href="/" className="group flex items-center gap-3">
          <Image
            src="/favicon.png"
            alt="Demoz"
            width={36}
            height={36}
            className="rounded-xl"
            priority
          />
          <span className="m-display text-xl text-[var(--m-cream)]">Demoz</span>
        </Link>

        <nav className="hidden items-center gap-10 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[0.8125rem] font-medium text-[var(--m-muted)] transition-colors hover:text-[var(--m-cream)]"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/login" className="m-btn-ghost py-2.5 px-5 text-[0.8125rem]">
            Sign in
          </Link>
          <Link href="/login" className="m-btn-primary py-2.5 px-5 text-[0.8125rem]">
            Start free trial
          </Link>
        </div>

        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--m-border)] md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
          aria-expanded={open}
        >
          <span className="text-[var(--m-cream)]">{open ? "✕" : "☰"}</span>
        </button>
      </div>

      {open && (
        <div className="border-b border-[var(--m-border)] bg-[var(--m-bg)]/95 px-6 py-4 md:hidden">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block py-3 text-sm text-[var(--m-muted)]"
            >
              {l.label}
            </a>
          ))}
          <Link href="/login" className="m-btn-primary mt-4 block w-full text-center">
            Start free trial
          </Link>
        </div>
      )}
    </header>
  );
}
