export const STORAGE_KEY = "fightscope-compare-draft";

export type CompareDraft = {
  aSlug: string | null;
  bSlug: string | null;
};

const EMPTY: CompareDraft = { aSlug: null, bSlug: null };

function canUseSessionStorage(): boolean {
  return typeof window !== "undefined" && typeof sessionStorage !== "undefined";
}

export function readCompareDraft(): CompareDraft {
  if (!canUseSessionStorage()) return EMPTY;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<CompareDraft>;
    return {
      aSlug: typeof parsed.aSlug === "string" ? parsed.aSlug : null,
      bSlug: typeof parsed.bSlug === "string" ? parsed.bSlug : null,
    };
  } catch {
    return EMPTY;
  }
}

export function writeCompareDraft(draft: CompareDraft): void {
  if (!canUseSessionStorage()) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Ignore quota / private-mode failures.
  }
}

export function clearCompareDraft(): void {
  if (!canUseSessionStorage()) return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}
