import { CompareClient } from "@/components/compare/CompareClient";
import { getCatalog } from "@/server/mma/store";

export const metadata = { title: "Fight Analysis" };
export const revalidate = 1800;

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const catalog = await getCatalog();
  const { a, b } = await searchParams;
  return <CompareClient fighters={catalog.fighters} initialA={a ?? null} initialB={b ?? null} />;
}
