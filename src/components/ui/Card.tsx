import { cn } from "@/lib/cn";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "md";
  hover?: boolean;
}

export function Card({ className, padding = "md", hover, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-white/[0.06] bg-surface",
        padding === "sm" && "p-3.5",
        padding === "md" && "p-4 sm:p-5",
        hover &&
          "transition-[border-color,background-color,transform] duration-200 hover:-translate-y-px hover:border-white/14 hover:bg-elevated/40",
        className,
      )}
      {...props}
    />
  );
}
