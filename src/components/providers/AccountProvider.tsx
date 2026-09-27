"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { canAccessProAnalysis, canGenerateAnalysis, planLabel } from "@/lib/entitlements";
import type { PlanId } from "@/lib/types";
import { setDevPlanAction } from "@/server/auth/plan-actions";
import type { SessionUser } from "@/server/auth/session";

interface AccountState {
  plan: PlanId;
}

interface AccountContextValue extends AccountState {
  user: SessionUser | null;
  signedIn: boolean;
  isPro: boolean;
  isStarter: boolean;
  canAnalyze: boolean;
  planLabel: string;
  displayName: string;
  /** True when non-production plan override pathways are available. */
  devPlanOverride: boolean;
  setPlan: (plan: PlanId) => void;
}

const STORAGE_KEY = "fightscope-plan";
const EVENT_KEY = "fightscope-plan-change";

const defaultState: AccountState = { plan: "free" };

let snapshotRaw = "";
let snapshotState: AccountState = defaultState;

function parseState(raw: string | null): AccountState {
  if (!raw) return defaultState;
  try {
    const parsed = JSON.parse(raw) as { plan?: PlanId };
    if (parsed.plan === "pro" || parsed.plan === "starter" || parsed.plan === "free") {
      return { plan: parsed.plan };
    }
    return defaultState;
  } catch {
    return defaultState;
  }
}

function getSnapshot(): AccountState {
  const raw = localStorage.getItem(STORAGE_KEY) ?? "";
  if (raw === snapshotRaw) return snapshotState;
  snapshotRaw = raw;
  snapshotState = parseState(raw);
  return snapshotState;
}

function getServerSnapshot(): AccountState {
  return defaultState;
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener(EVENT_KEY, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(EVENT_KEY, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function writeState(next: AccountState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  snapshotRaw = JSON.stringify(next);
  snapshotState = next;
  window.dispatchEvent(new Event(EVENT_KEY));
}

const AccountContext = createContext<AccountContextValue | null>(null);

export function AccountProvider({
  user,
  children,
  serverPlan,
  devPlanOverride = false,
}: {
  user: SessionUser | null;
  children: React.ReactNode;
  serverPlan?: PlanId;
  devPlanOverride?: boolean;
}) {
  const local = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [clientOverride, setClientOverride] = useState<PlanId | null>(null);

  useEffect(() => {
    setClientOverride(null);
  }, [serverPlan]);

  const setPlan = useCallback(
    (plan: PlanId) => {
      writeState({ plan });
      if (devPlanOverride) {
        setClientOverride(plan);
        void setDevPlanAction(plan);
      }
    },
    [devPlanOverride],
  );

  // Entitlement source of truth:
  // 1) optimistic client override after Account switch (dev)
  // 2) server-resolved plan (env/cookie/production billing)
  // 3) localStorage (UI only — API still enforces server plan)
  const plan: PlanId = clientOverride ?? serverPlan ?? local.plan;

  const value = useMemo<AccountContextValue>(
    () => ({
      plan,
      user,
      signedIn: Boolean(user),
      isPro: canAccessProAnalysis(plan),
      isStarter: plan === "starter",
      canAnalyze: canGenerateAnalysis(plan),
      planLabel: planLabel(plan),
      displayName: user?.name ?? "Account",
      devPlanOverride,
      setPlan,
    }),
    [devPlanOverride, plan, setPlan, user],
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount() {
  const context = useContext(AccountContext);
  if (!context) {
    throw new Error("useAccount must be used within AccountProvider");
  }
  return context;
}
