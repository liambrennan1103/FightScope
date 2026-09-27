import { formatUpdated } from "@/lib/format";

export function DataFreshness({ lastUpdated, stale }: { lastUpdated: string; stale?: boolean }) {
  const label = stale ? "Showing saved data" : formatUpdated(lastUpdated);
  if (!label) return null;
  return <p className="text-[11px] text-mute">{label}</p>;
}
