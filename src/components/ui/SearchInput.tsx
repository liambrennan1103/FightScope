import { cn } from "@/lib/cn";

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  ref?: React.Ref<HTMLInputElement>;
}

export function SearchInput({ className, ref, ...props }: SearchInputProps) {
  return (
    <label className={cn("relative block", className)}>
      <span className="sr-only">{props["aria-label"] ?? "Search"}</span>
      <svg
        viewBox="0 0 24 24"
        className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-mute"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.7" />
        <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
      <input
        ref={ref}
        className="h-10 w-full rounded-lg border border-white/10 bg-elevated pr-3 pl-10 text-sm text-ink placeholder:text-mute transition-colors duration-200 hover:border-white/18 focus:border-accent/60 focus:outline-none"
        {...props}
      />
    </label>
  );
}
