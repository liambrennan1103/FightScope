import { FightMatchup } from "@/components/fight/MatchupBoard";
import { routes } from "@/lib/routes";
import type { FightView } from "@/lib/types";

export function FightCard({ view }: { view: FightView }) {
  return (
    <FightMatchup
      view={view}
      variant="card"
      showPrediction={false}
      href={routes.fight(view.fight.slug)}
    />
  );
}
