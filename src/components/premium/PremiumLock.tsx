"use client";

import { useAccount } from "@/components/providers/AccountProvider";
import { ButtonLink } from "@/components/ui/Button";
import { PREMIUM_COPY } from "@/data/pricing";
import { cn } from "@/lib/cn";
import { routes } from "@/lib/routes";

type LockKey = keyof typeof PREMIUM_COPY;

interface PremiumLockProps {
  feature: LockKey;
  children: React.ReactNode;
  /** Ignored for security — locked state never renders real children. */
  preview?: React.ReactNode;
  className?: string;
}

/**
 * Pro gate. Locked users see skeleton placeholders only — never real Pro children in the DOM.
 */
export function PremiumLock({ feature, children, className }: PremiumLockProps) {
  const { isPro } = useAccount();
  const copy = PREMIUM_COPY[feature];

  if (isPro) {
    return <>{children}</>;
  }

  return (
    <div className={cn("relative overflow-hidden rounded-xl border border-white/[0.08] bg-surface", className)}>
      <div className="pointer-events-none select-none p-4 sm:p-5" aria-hidden="true">
        <div className="space-y-2">
          <div className="fs-lock-blur h-3 w-[88%] rounded bg-white/10" />
          <div className="fs-lock-blur h-3 w-[72%] rounded bg-white/10" />
          <div className="fs-lock-blur h-3 w-[80%] rounded bg-white/10" />
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="fs-lock-blur h-16 rounded-lg bg-white/10" />
            <div className="fs-lock-blur h-16 rounded-lg bg-white/10" />
          </div>
        </div>
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,12,16,0.5)_0%,rgba(12,12,16,0.88)_100%)] backdrop-blur-[16px]" />
      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 py-6 text-center">
        <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-mute">
          <LockIcon />
        </div>
        <h3 className="text-[15px] font-semibold text-ink">{copy.title}</h3>
        <p className="mt-1.5 max-w-md text-sm leading-6 text-mute">{copy.body}</p>
        <ButtonLink href={routes.pricing} size="sm" className="mt-4">
          Unlock Pro analysis
        </ButtonLink>
      </div>
    </div>
  );
}

export function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
      <rect x="6" y="11" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8.5 11V8.5a3.5 3.5 0 0 1 7 0V11" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}
