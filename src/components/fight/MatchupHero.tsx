import { FightMatchup } from "@/components/fight/MatchupBoard";
import type { FightView } from "@/lib/types";

export function MatchupHero({
  view,
  showPrediction = true,
}: {
  view: FightView;
  showPrediction?: boolean;
}) {
  return (
    <FightMatchup
      view={view}
      variant="hero"
      showPick={view.fight.status === "upcoming"}
      showPrediction={showPrediction}
    />
  );
}
