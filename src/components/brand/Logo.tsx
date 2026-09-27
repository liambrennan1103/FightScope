import { cn } from "@/lib/cn";

interface LogoMarkProps {
  className?: string;
}

export function LogoMark({ className }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("h-7 w-7", className)}
    >
      <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="1.5" />
      <path d="M16 3.5v3.5M16 25v3.5M3.5 16h3.5M25 16h3.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M11.5 10.25h8.75M11.5 10.25V22M11.5 16.1h5.8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="square"
      />
      <circle cx="16" cy="16" r="1.45" fill="#E33B3B" />
    </svg>
  );
}

interface LogoProps {
  className?: string;
  wordmarkClassName?: string;
}

export function Logo({ className, wordmarkClassName }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-ink", className)}>
      <LogoMark />
      <span className={cn("text-[15px] font-semibold tracking-tight", wordmarkClassName)}>
        FightScope
      </span>
    </span>
  );
}
