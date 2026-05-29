"use client";

import { useCallback, type MouseEvent } from "react";
import { Reveal } from "./Reveal";

const cards = [
  {
    id: "payroll",
    span: "lg:col-span-2 lg:row-span-2",
    title: "Payroll that speaks birr, not buzzwords",
    body: "Set salaries once. Demoz handles ERCA tax, pension, and allowances every month. No more hunting formulas in row 47.",
    tag: "Payroll",
  },
  {
    id: "chapa",
    span: "",
    title: "Pay everyone without the group chat panic",
    body: "Send net pay through Chapa in bulk. You see who got paid and who is still pending before anyone pings you.",
    tag: "Payments",
  },
  {
    id: "mobile",
    span: "",
    title: "Your staff stop knocking on HR's door",
    body: "Payslips, leave, and clock in from their phones. You keep the record. They get answers at 9pm too.",
    tag: "Mobile",
  },
  {
    id: "security",
    span: "lg:col-span-2",
    title: "Your data stays yours",
    body: "Each company lives in its own lane. Strong login, tracked changes, and records you can pull when finance or audit asks.",
    tag: "Trust",
  },
  {
    id: "realtime",
    span: "",
    title: "Finance and HR see the same screen",
    body: "When disbursement runs, everyone watches progress live. Fewer calls. Fewer \"did it go through?\" messages.",
    tag: "Live updates",
  },
];

function SpotlightCard({
  title,
  body,
  tag,
  className,
}: {
  title: string;
  body: string;
  tag: string;
  className?: string;
}) {
  const onMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--spot-x", `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty("--spot-y", `${e.clientY - rect.top}px`);
  }, []);

  return (
    <div
      className={`m-card m-spotlight group flex flex-col justify-between p-7 lg:p-8 ${className ?? ""}`}
      onMouseMove={onMove}
    >
      <span className="mb-6 inline-flex w-fit rounded-full border border-[var(--m-border)] px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-widest text-[var(--m-gold)]">
        {tag}
      </span>
      <div>
        <h3 className="m-display text-2xl text-[var(--m-cream)]">{title}</h3>
        <p className="m-body mt-3 text-[0.9375rem]">{body}</p>
      </div>
    </div>
  );
}

export function BentoFeatures() {
  return (
    <section id="capabilities" className="py-28 lg:py-36">
      <div className="mx-auto max-w-[76rem] px-6 lg:px-10">
        <Reveal>
          <p className="m-label mb-4">What you get</p>
          <h2 className="m-display max-w-[22ch] text-[clamp(2rem,4vw,3.25rem)] text-[var(--m-cream)]">
            Imagine month end without the apology tour.
          </h2>
          <p className="m-body mt-5 max-w-xl">
            You are not buying another dashboard. You are buying back the week your team loses to fixes,
            rechecks, and last minute transfers.
          </p>
        </Reveal>

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:auto-rows-[minmax(12rem,auto)]">
          {cards.map((c) => (
            <Reveal key={c.id} className={c.span}>
              <SpotlightCard title={c.title} body={c.body} tag={c.tag} className="h-full min-h-[12rem]" />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
