import { cn } from "@/lib/cn";
import { ProBadge } from "./Badge";

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  pro?: boolean;
  className?: string;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  pro,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("mb-5 flex items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-mute">
            {eyebrow}
          </p>
        ) : null}
        <div className="flex items-center gap-2">
          <h2 className="text-[1.05rem] font-semibold tracking-tight text-ink sm:text-lg">
            {title}
          </h2>
          {pro ? <ProBadge /> : null}
        </div>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-mute">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
