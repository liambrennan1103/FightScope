import { FightersDirectory } from "@/components/fighter/FightersDirectory";
import { getCatalog } from "@/server/mma/store";

export const metadata = { title: "Fighters" };
export const revalidate = 1800;

export default async function FightersPage() {
  const catalog = await getCatalog();
  return <FightersDirectory fighters={catalog.fighters} />;
}
