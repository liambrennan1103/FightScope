import type { EventMotifId } from "@/lib/event-identity";

/**
 * Recognizable city / special-event hero motifs.
 * Absolute decorative layer only — never participates in content layout.
 */
export function EventMotif({ motif }: { motif: EventMotifId }) {
  if (motif === "none") return null;

  return (
    <div className="fs-event-motif pointer-events-none absolute inset-0 z-[1] overflow-hidden" aria-hidden="true">
      {motif === "eiffel" ? <EiffelMotif /> : null}
      {motif === "sombrero" ? <SombreroMotif /> : null}
      {motif === "vegas" ? <VegasMotif /> : null}
      {motif === "luxury" ? <LuxuryMotif /> : null}
      {motif === "shanghai" ? <ShanghaiMotif /> : null}
      {motif === "metro" ? <MetroMotif /> : null}
    </div>
  );
}

function EiffelMotif() {
  return (
    <svg
      viewBox="0 0 120 220"
      className="absolute -right-[6%] bottom-[-18%] h-[145%] w-auto opacity-[0.16] sm:-right-[2%] sm:opacity-[0.22]"
      fill="currentColor"
    >
      <g className="text-[var(--event-accent-2)]">
        {/* recognizable Eiffel: tapering lattice + platforms */}
        <path
          d="M58 8 L62 8 L66 48 H54 Z
             M52 52 H68 L74 96 H46 Z
             M44 100 H76 L86 168 H34 Z
             M32 172 H88 L96 214 H24 Z
             M56 214 H64 V220 H56 Z"
          opacity="0.95"
        />
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          d="M54 52 H68 M46 100 H76 M34 172 H88
             M58 20 L50 96 M62 20 L70 96
             M52 60 L68 60 M48 112 L72 112 M42 148 L78 148
             M40 188 H80"
          opacity="0.7"
        />
        <path d="M48 96 Q60 84 72 96" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.85" />
        <path d="M36 168 Q60 150 84 168" fill="none" stroke="currentColor" strokeWidth="2.2" opacity="0.85" />
      </g>
    </svg>
  );
}

function SombreroMotif() {
  return (
    <svg
      viewBox="0 0 280 120"
      className="absolute left-1/2 top-[-22%] h-[58%] w-auto -translate-x-1/2 opacity-[0.22] sm:top-[-26%] sm:h-[64%] sm:opacity-[0.3]"
      fill="currentColor"
    >
      <g>
        {/* wide brim */}
        <ellipse cx="140" cy="86" rx="128" ry="26" className="text-[var(--event-accent-2)]" opacity="0.9" />
        <ellipse cx="140" cy="82" rx="118" ry="18" className="text-[var(--event-accent)]" opacity="0.35" />
        {/* crown */}
        <path
          d="M78 82 C86 34 194 34 202 82 C186 70 94 70 78 82 Z"
          className="text-[var(--event-accent)]"
          opacity="0.92"
        />
        {/* band */}
        <path
          d="M92 70 H188 C184 78 96 78 92 70 Z"
          className="text-[var(--event-accent-2)]"
          opacity="0.85"
        />
        {/* decorative dots on band */}
        <circle cx="120" cy="72" r="2.2" className="text-[var(--event-accent-2)]" />
        <circle cx="140" cy="71" r="2.6" className="text-[var(--event-accent-2)]" />
        <circle cx="160" cy="72" r="2.2" className="text-[var(--event-accent-2)]" />
        {/* soft shadow under brim */}
        <ellipse cx="140" cy="98" rx="90" ry="8" className="text-black" opacity="0.25" />
      </g>
    </svg>
  );
}

function VegasMotif() {
  return (
    <svg
      viewBox="0 0 100 150"
      className="absolute -right-[4%] bottom-[-10%] h-[118%] w-auto opacity-[0.18] sm:right-0 sm:opacity-[0.26]"
      fill="currentColor"
    >
      <g className="text-[var(--event-accent-2)]">
        {/* cabinet */}
        <rect x="18" y="10" width="52" height="108" rx="6" opacity="0.95" />
        <rect x="22" y="14" width="44" height="18" rx="3" className="text-[var(--event-accent)]" opacity="0.55" />
        {/* reel window */}
        <rect x="26" y="40" width="36" height="48" rx="3" fill="#0b0b0d" opacity="0.85" />
        <line x1="38" y1="40" x2="38" y2="88" stroke="currentColor" strokeWidth="1" opacity="0.35" />
        <line x1="50" y1="40" x2="50" y2="88" stroke="currentColor" strokeWidth="1" opacity="0.35" />
        {/* reel symbols */}
        <text x="29" y="58" fontSize="9" fontFamily="system-ui,sans-serif" className="text-[var(--event-accent)]" fill="currentColor" opacity="0.9">
          7
        </text>
        <text x="41" y="70" fontSize="9" fontFamily="system-ui,sans-serif" className="text-[var(--event-accent)]" fill="currentColor" opacity="0.9">
          7
        </text>
        <text x="53" y="58" fontSize="9" fontFamily="system-ui,sans-serif" className="text-[var(--event-accent)]" fill="currentColor" opacity="0.9">
          7
        </text>
        <text x="40" y="84" fontSize="8" fontFamily="system-ui,sans-serif" fill="currentColor" opacity="0.7">
          $
        </text>
        {/* lever */}
        <rect x="72" y="34" width="5" height="36" rx="2" className="text-[var(--event-accent)]" opacity="0.85" />
        <circle cx="74.5" cy="28" r="7" className="text-[var(--event-accent)]" opacity="0.95" />
        {/* base */}
        <rect x="12" y="118" width="64" height="12" rx="3" opacity="0.7" />
        <rect x="28" y="100" width="32" height="10" rx="2" opacity="0.45" />
      </g>
    </svg>
  );
}

function LuxuryMotif() {
  return (
    <svg
      viewBox="0 0 160 120"
      className="absolute -right-[2%] bottom-[-8%] h-[110%] w-auto opacity-[0.16] sm:opacity-[0.24]"
      fill="none"
    >
      <g stroke="currentColor" className="text-[var(--event-accent-2)]" strokeWidth="1.8">
        {/* grand arch facade */}
        <path d="M12 110 V48 C12 18 40 6 80 6 C120 6 148 18 148 48 V110" opacity="0.95" />
        <path d="M28 110 V56 C28 32 48 20 80 20 C112 20 132 32 132 56 V110" opacity="0.75" />
        <path d="M48 110 V68 C48 48 60 38 80 38 C100 38 112 48 112 68 V110" opacity="0.6" />
        <path d="M80 6 V110" opacity="0.35" />
        <path d="M20 72 H140 M36 92 H124" opacity="0.4" />
      </g>
      <g fill="currentColor" className="text-[var(--event-accent-2)]">
        <circle cx="80" cy="52" r="3" opacity="0.55" />
        <rect x="74" y="100" width="12" height="10" opacity="0.4" />
      </g>
    </svg>
  );
}

function ShanghaiMotif() {
  return (
    <svg
      viewBox="0 0 140 200"
      className="absolute -right-[8%] bottom-[-12%] h-[130%] w-auto opacity-[0.16] sm:-right-[2%] sm:opacity-[0.24]"
      fill="currentColor"
    >
      <g className="text-[var(--event-accent-2)]">
        {/* Oriental Pearl–inspired: stacked spheres + spire */}
        <rect x="66" y="8" width="8" height="34" opacity="0.85" />
        <circle cx="70" cy="52" r="18" opacity="0.9" />
        <rect x="66" y="70" width="8" height="28" opacity="0.75" />
        <circle cx="70" cy="112" r="28" opacity="0.95" />
        <rect x="66" y="140" width="8" height="22" opacity="0.7" />
        {/* supporting legs */}
        <path d="M48 150 L66 112 L70 140 Z" opacity="0.55" />
        <path d="M92 150 L74 112 L70 140 Z" opacity="0.55" />
        <path d="M40 190 L66 150 L70 170 Z" opacity="0.4" />
        <path d="M100 190 L74 150 L70 170 Z" opacity="0.4" />
        {/* adjacent modern towers */}
        <rect x="12" y="120" width="18" height="70" opacity="0.35" className="text-[var(--event-accent)]" />
        <rect x="108" y="100" width="22" height="90" opacity="0.4" className="text-[var(--event-accent)]" />
        <rect x="8" y="188" width="124" height="6" opacity="0.3" />
      </g>
    </svg>
  );
}

function MetroMotif() {
  return (
    <svg
      viewBox="0 0 180 110"
      className="absolute right-0 bottom-0 h-[70%] w-auto opacity-[0.14] sm:opacity-[0.2]"
      fill="currentColor"
    >
      <g className="text-[var(--event-accent-2)]">
        {/* NYC skyline silhouette */}
        <rect x="6" y="48" width="16" height="62" opacity="0.55" />
        <rect x="24" y="28" width="22" height="82" opacity="0.75" />
        <rect x="48" y="40" width="14" height="70" opacity="0.5" />
        <path d="M66 18 L72 8 L78 18 V110 H66 Z" opacity="0.9" />
        <rect x="80" y="34" width="18" height="76" opacity="0.65" />
        <rect x="100" y="22" width="26" height="88" opacity="0.8" />
        <rect x="128" y="46" width="14" height="64" opacity="0.45" />
        <rect x="144" y="30" width="28" height="80" opacity="0.7" className="text-[var(--event-accent)]" />
        <rect x="4" y="104" width="172" height="6" opacity="0.35" />
      </g>
    </svg>
  );
}
