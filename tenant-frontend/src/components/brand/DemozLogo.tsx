import Image from "next/image";
import Link from "next/link";

type Props = {
  href?: string;
  size?: number;
  showWordmark?: boolean;
  wordmarkClassName?: string;
  className?: string;
};

export function DemozLogo({
  href,
  size = 36,
  showWordmark = true,
  wordmarkClassName = "",
  className = "",
}: Props) {
  const content = (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Image
        src="/favicon.png"
        alt="Demoz"
        width={size}
        height={size}
        className="rounded-xl shrink-0"
        priority
      />
      {showWordmark && (
        <span
          className={`font-semibold tracking-tight text-[var(--text-primary)] ${wordmarkClassName}`}
        >
          Demoz
        </span>
      )}
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center hover:opacity-90 transition-opacity">
        {content}
      </Link>
    );
  }

  return content;
}
