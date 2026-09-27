import { cn } from "@/lib/cn";

export { Skeleton } from "@/components/ui/Skeleton";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-white/[0.06] bg-surface/60 px-6 py-12 text-center",
        className,
      )}
    >
      <p className="text-sm font-medium text-ink">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-mute">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
