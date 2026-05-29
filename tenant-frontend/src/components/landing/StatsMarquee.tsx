const items = [
  "ERCA payroll tax",
  "Chapa salary send",
  "Employee mobile app",
  "Attendance and leave",
  "Bulk staff import",
  "Payslips on phone",
  "Owner approvals",
  "Audit history",
  "Multi company ready",
  "Role based access",
];

export function StatsMarquee() {
  const doubled = [...items, ...items];

  return (
    <section className="overflow-hidden border-y border-[var(--m-border)] bg-[var(--m-bg-elevated)]/80 py-5">
      <div className="flex">
        <div className="m-marquee-track flex shrink-0 items-center gap-12 whitespace-nowrap px-6">
          {doubled.map((item, i) => (
            <span
              key={`${item}-${i}`}
              className="flex items-center gap-12 text-[0.8125rem] font-medium text-[var(--m-muted)]"
            >
              <span className="h-1 w-1 rounded-full bg-[var(--m-gold)]" />
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
