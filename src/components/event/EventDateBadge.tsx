import { cn } from "@/lib/cn";
import { eventDateParts } from "@/lib/format";

export function EventDateBadge({
  date,
  className,
  size = "md",
}: {
  date: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const { month, day } = eventDateParts(date);
  const padded = day.padStart(2, "0");
  return (
    <div
      className={cn(
        "flex shrink-0 flex-col items-center justify-center rounded-lg border border-white/12 bg-black/25",
        size === "md" ? "w-14 py-2" : "w-12 py-1.5",
        className,
      )}
    >
      <span className="text-[10px] font-semibold tracking-[0.16em] text-mute">{month}</span>
      <span
        className={cn(
          "tabular font-semibold leading-none text-ink",
          size === "md" ? "text-xl" : "text-lg",
        )}
      >
        {padded}
      </span>
    </div>
  );
}
