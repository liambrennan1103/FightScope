"use client";

import { LockIcon } from "@/components/premium/PremiumLock";
import { ButtonLink } from "@/components/ui/Button";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/cn";

/**
 * Starter-facing Pro upsell.
 * Decorative skeleton only — never real Pro analysis copy.
 */
export function ProLockedModules({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        "group relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-surface min-h-[320px] sm:min-h-[360px] shadow-[var(--glass-shadow)]",
        className,
      )}
      style={{ viewTransitionName: "fs-pro-lock" }}
    >
      <div
        className="pointer-events-none absolute inset-0 select-none px-5 py-6 blur-[10px] sm:px-8"
        aria-hidden="true"
      >
        <p className="text-[11px] font-semibold tracking-[0.16em] text-mute uppercase">
          Pro analysis
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/[0.08] bg-elevated/80 p-4">
            <p className="text-[10px] tracking-[0.14em] text-mute uppercase">FightScope Rating</p>
            <p className="mt-2 text-4xl font-semibold tabular text-ink">––</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-[70%] rounded-full bg-accent-fill" />
            </div>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-elevated/80 p-4">
            <p className="text-[10px] tracking-[0.14em] text-mute uppercase">Deep analysis</p>
            <div className="mt-3 space-y-2">
              <div className="h-2.5 w-full rounded bg-white/18" />
              <div className="h-2.5 w-[92%] rounded bg-white/14" />
              <div className="h-2.5 w-[80%] rounded bg-white/16" />
            </div>
          </div>
        </div>
      </div>

      <div className="absolute inset-0 bg-[rgba(14,15,18,0.45)]" />
      <div className="fs-glass fs-glass-deep absolute inset-4 sm:inset-6" />

      <div className="relative z-[1] flex min-h-[320px] flex-col items-center justify-center px-6 py-10 text-center sm:min-h-[360px]">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--glass-border)] bg-[rgba(14,15,18,0.55)] text-mute backdrop-blur-md">
          <LockIcon />
        </div>
        <p className="text-[11px] font-semibold tracking-[0.16em] text-accent uppercase">Pro</p>
        <h3 className="mt-2 text-lg font-semibold text-ink">Unlock Pro analysis</h3>
        <ul className="mt-5 max-w-md space-y-4 text-left text-sm text-mute">
          <ProFeatureItem
            label="FightScope Rating"
            detail="One score summarizing matchup confidence and model agreement."
          />
          <ProFeatureItem
            label="Deep Analysis"
            detail="Detailed tactical interpretation of the matchup."
          />
          <ProFeatureItem
            label="Advanced statistical interpretation"
            detail="What the model sees behind the raw numbers."
          />
          <ProFeatureItem
            label="Extended fight scenarios"
            detail="Deeper tactical paths and matchup branches."
          />
        </ul>
        <ButtonLink href={routes.pricing} className="mt-6" size="md" variant="primary">
          Unlock Pro analysis
        </ButtonLink>
      </div>
    </section>
  );
}

function ProFeatureItem({ label, detail }: { label: string; detail: string }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent-fill/15 text-[10px] text-accent">
        ◆
      </span>
      <div>
        <p className="font-semibold text-ink">{label}</p>
        <p className="mt-0.5 text-[13px] leading-5 text-mute">{detail}</p>
      </div>
    </li>
  );
}
