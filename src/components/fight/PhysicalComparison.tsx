import { displayValue, formatHeight, formatReach, formatRecord } from "@/lib/format";
import type { Fighter } from "@/lib/types";

export function PhysicalComparison({ fighterA, fighterB }: { fighterA: Fighter; fighterB: Fighter }) {
  return (
    <div>
      <div className="mb-1 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-3">
        <p className="truncate text-[11px] font-semibold tracking-[0.12em] text-mute uppercase">
          {fighterA.lastName}
        </p>
        <span className="w-16" />
        <p className="truncate text-right text-[11px] font-semibold tracking-[0.12em] text-mute uppercase">
          {fighterB.lastName}
        </p>
      </div>
      <div className="divide-y divide-white/[0.06] rounded-xl border border-white/[0.06] bg-surface px-4">
        <PhysRow label="Age" left={displayValue(fighterA.age)} right={displayValue(fighterB.age)} />
        <PhysRow
          label="Height"
          left={formatHeight(fighterA.heightCm)}
          right={formatHeight(fighterB.heightCm)}
          delta={
            fighterA.heightCm != null && fighterB.heightCm != null
              ? fighterB.heightCm - fighterA.heightCm
              : undefined
          }
          unit="cm"
          leftName={fighterA.lastName}
          rightName={fighterB.lastName}
        />
        <PhysRow
          label="Reach"
          left={formatReach(fighterA.reachCm)}
          right={formatReach(fighterB.reachCm)}
          delta={
            fighterA.reachCm != null && fighterB.reachCm != null
              ? fighterB.reachCm - fighterA.reachCm
              : undefined
          }
          unit="cm"
          leftName={fighterA.lastName}
          rightName={fighterB.lastName}
        />
        <PhysRow label="Stance" left={displayValue(fighterA.stance)} right={displayValue(fighterB.stance)} />
        <PhysRow label="Record" left={formatRecord(fighterA.record)} right={formatRecord(fighterB.record)} />
      </div>
    </div>
  );
}

function PhysRow({
  label,
  left,
  right,
  delta,
  unit,
  leftName,
  rightName,
}: {
  label: string;
  left: string;
  right: string;
  delta?: number;
  unit?: string;
  leftName?: string;
  rightName?: string;
}) {
  const showDelta = delta != null && Math.abs(delta) >= 2 && leftName && rightName;
  const winner = delta != null && delta > 0 ? rightName : leftName;
  const abs = delta != null ? Math.abs(delta) : 0;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 py-3.5">
      <p className="truncate text-sm font-medium text-ink">{left}</p>
      <div className="text-center">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-mute uppercase">{label}</p>
        {showDelta ? (
          <p className="mt-0.5 text-[10px] text-mute">
            +{abs} {unit} {winner}
          </p>
        ) : null}
      </div>
      <p className="truncate text-right text-sm font-medium text-ink">{right}</p>
    </div>
  );
}
