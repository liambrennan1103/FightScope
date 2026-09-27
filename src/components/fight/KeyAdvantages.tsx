import type { Fighter } from "@/lib/types";

interface KeyAdvantagesProps {
  fighterA: Fighter;
  fighterB: Fighter;
  advantagesA: string[];
  advantagesB: string[];
}

export function KeyAdvantages({
  fighterA,
  fighterB,
  advantagesA,
  advantagesB,
}: KeyAdvantagesProps) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <AdvantageColumn name={fighterA.lastName} items={advantagesA} />
      <AdvantageColumn name={fighterB.lastName} items={advantagesB} />
    </div>
  );
}

function AdvantageColumn({ name, items }: { name: string; items: string[] }) {
  return (
    <div>
      <p className="text-[11px] font-semibold tracking-[0.14em] text-mute uppercase">{name}</p>
      <ul className="mt-2.5 space-y-1.5">
        {items.map((item) => (
          <li key={item} className="text-sm text-ink">
            <span className="mr-1.5 text-mute">+</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
