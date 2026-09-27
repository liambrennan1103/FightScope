"use client";

import { GlassPanel } from "@/components/ui/GlassPanel";
import { LivingBackground } from "@/components/ui/LivingBackground";
import { Button } from "@/components/ui/Button";

/**
 * Visual QA strip for the three extreme glass materials + living background.
 * Route: /app/dev/glass
 */
export function GlassShowcase() {
  return (
    <div className="relative isolate min-h-[70vh] overflow-hidden rounded-[28px]">
      <LivingBackground className="is-local absolute inset-0 z-0 rounded-[28px]" />
      <div className="relative z-10 space-y-8 p-2 sm:p-4">
        <header className="space-y-2">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-accent uppercase">
            Extreme Liquid Glass
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Three materials + living mesh
          </h1>
          <p className="max-w-2xl text-sm text-mute">
            Frosted Nav (stable chrome), Floating Data Glass (analysis cards), Deep Glass
            (Pro / conversion). Palette unchanged — motion and material only.
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-3">
          <GlassPanel tone="frosted" className="p-5">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-mute uppercase">
              1 · Frosted Nav
            </p>
            <p className="mt-3 text-sm leading-6 text-ink">
              Dense blur(24px), high opacity. Header and sidebar stay readable while the page
              moves.
            </p>
            <p className="mt-4 font-mono text-[12px] text-mute">blur 24 · stable</p>
          </GlassPanel>

          <GlassPanel tone="data" className="p-5">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-accent uppercase">
              2 · Floating Data
            </p>
            <p className="mt-3 text-sm leading-6 text-mute">
              Lighter blur(12px), soft float, Corner Red edge glow on hover. Use on Predicted
              Edge / scenarios.
            </p>
            <p className="mt-4 text-4xl font-semibold tabular-nums text-accent">72%</p>
            <p className="mt-4 font-mono text-[12px] text-mute">blur 12 · breathe</p>
          </GlassPanel>

          <GlassPanel tone="deep" className="p-5">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-amber uppercase">
              3 · Deep Glass
            </p>
            <p className="mt-3 text-sm leading-6 text-ink">
              Layered aurora from Corner Red / Tape Blue / Amber alphas. Pro lock and primary
              conversion only.
            </p>
            <Button className="mt-5 fs-phys-press" size="md">
              Unlock Pro
            </Button>
            <p className="mt-4 font-mono text-[12px] text-mute">aurora · premium</p>
          </GlassPanel>
        </div>
      </div>
    </div>
  );
}
