import { PixelLanding } from "@/components/landing/pixel/PixelLanding";
import { hasLandingPortrait } from "@/lib/landing-demos";
import { getCatalog, toSearchIndex } from "@/server/mma/store";

export const metadata = {
  title: {
    absolute: "FightScope",
  },
  description: "Predict every fight before it starts.",
};

export const revalidate = 1800;

export default async function LandingPage() {
  const catalog = await getCatalog();
  const search = toSearchIndex(catalog);
  const carouselFighters = catalog.fighters.filter(hasLandingPortrait).slice(0, 24);

  return <PixelLanding fighters={search.fighters} carouselFighters={carouselFighters} />;
}
