import { cn } from "@/lib/cn";

type BadgeTone = "neutral" | "accent" | "pro" | "mute";

interface BadgeProps {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}

const tones: Record<BadgeTone, string> = {
  neutral: "bg-elevated text-ink border-line",
  accent: "bg-accent-soft text-accent border-accent/20",
  pro: "bg-accent-soft text-accent border-accent/30",
  mute: "bg-transparent text-mute border-line",
};

export function Badge({ children, tone = "neutral", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function ProBadge({ className }: { className?: string }) {
  return (
    <Badge tone="pro" className={className}>
      Pro
    </Badge>
  );
}
