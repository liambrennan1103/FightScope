import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/cn";

/** Browser-style frame for showcasing real FightScope UI on the landing page. */
export function LandingDeviceFrame({
  children,
  className,
  label = "FightScope",
}: {
  children: React.ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/[0.1] bg-[#0f0f12] shadow-[0_24px_80px_rgba(0,0,0,0.45)]",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-white/[0.06] bg-black/40 px-3 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <div className="ml-2 flex min-w-0 flex-1 items-center justify-center rounded-md border border-white/[0.06] bg-white/[0.03] px-3 py-1">
          <span className="truncate text-[11px] text-mute">{label}</span>
        </div>
      </div>
      <div className="p-3 sm:p-4">{children}</div>
    </div>
  );
}

export function LandingSection({
  children,
  className,
  id,
  fullBleed,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
  fullBleed?: boolean;
}) {
  return (
    <section id={id} className={cn("relative", className)}>
      <div className={cn(fullBleed ? "w-full" : "mx-auto max-w-[1240px] px-4 sm:px-6")}>{children}</div>
    </section>
  );
}

export function LandingEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold tracking-[0.2em] text-accent uppercase">{children}</p>
  );
}

export function LandingMark() {
  return <Logo className="text-ink" />;
}
