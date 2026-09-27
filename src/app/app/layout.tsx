import { ProductChrome } from "@/components/layout/ProductChrome";
import { AccountProvider } from "@/components/providers/AccountProvider";
import { getSession } from "@/server/auth/get-session";
import {
  isDevPlanOverrideActive,
  resolveAnalysisPlan,
} from "@/server/entitlements";
import { getCatalog, toSearchIndex } from "@/server/mma/store";

export const revalidate = 1800;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [catalog, user, plan] = await Promise.all([
    getCatalog(),
    getSession(),
    resolveAnalysisPlan(),
  ]);
  const searchData = toSearchIndex(catalog);
  const devPlanOverride = isDevPlanOverrideActive();
  return (
    <AccountProvider user={user} serverPlan={plan} devPlanOverride={devPlanOverride}>
      <ProductChrome searchData={searchData}>{children}</ProductChrome>
    </AccountProvider>
  );
}
