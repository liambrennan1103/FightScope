import { cn } from "@/lib/cn";

interface PageHeaderProps {
  kicker?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({ kicker, title, description, action, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        "mb-8 flex flex-col gap-3 sm:mb-10 sm:flex-row sm:items-end sm:justify-between sm:gap-4",
        className,
      )}
    >
      <div className="min-w-0">
        {kicker ? (
          <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">{kicker}</p>
        ) : null}
        <h1 className="mt-1 text-[1.65rem] font-semibold tracking-tight text-ink sm:text-3xl">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-xl text-sm leading-6 text-mute">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0 self-start sm:self-auto sm:pb-0.5">{action}</div> : null}
    </header>
  );
}
