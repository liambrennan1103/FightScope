"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Logo, LogoMark } from "@/components/brand/Logo";
import { FighterPortrait } from "@/components/fighter/FighterPortrait";
import { DockedAnalysisNav } from "@/components/fight/AnalysisSectionNav";
import { AnalysisNavProvider, useAnalysisNav } from "@/components/fight/AnalysisNavContext";
import { useAccount } from "@/components/providers/AccountProvider";
import { Badge } from "@/components/ui/Badge";
import { LivingBackground } from "@/components/ui/LivingBackground";
import { SearchInput } from "@/components/ui/SearchInput";
import { NAV_ITEMS } from "@/data/constants";
import { cn } from "@/lib/cn";
import { formatCompactDate, formatRecord } from "@/lib/format";
import { routes } from "@/lib/routes";
import { signOutAction } from "@/server/auth/actions";
import type { SearchIndex } from "@/lib/types";

export type ProductSearchData = SearchIndex;

const SIDEBAR_COLLAPSED_KEY = "fightscope-sidebar-collapsed";

const NAV_ICONS: Record<string, () => React.ReactNode> = {
  [routes.app]: HomeIcon,
  [routes.events]: EventsIcon,
  [routes.fighters]: FightersIcon,
  [routes.compare]: CompareIcon,
  [routes.history]: HistoryIcon,
  [routes.pricing]: PricingIcon,
};

export function ProductChrome({
  children,
  searchData,
}: {
  children: React.ReactNode;
  searchData: ProductSearchData;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
        setMobileNavOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function toggleCollapsed() {
    setCollapsed((value) => {
      const next = !value;
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  return (
    <AnalysisNavProvider>
      <div className="relative flex min-h-full">
        <LivingBackground />
        <div className="relative z-10 flex min-h-full w-full min-w-0">
          <AppSidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />

          <div className="flex min-w-0 flex-1 flex-col">
            <ProductTopBar
              onSearch={() => setSearchOpen(true)}
              onOpenMobileNav={() => setMobileNavOpen(true)}
            />
            <main className="mx-auto w-full max-w-[1280px] flex-1 overflow-x-clip px-4 pt-6 pb-10 sm:px-6 sm:pt-8 lg:px-8 lg:pb-12">
              <PageShell>{children}</PageShell>
            </main>
          </div>

          {mobileNavOpen ? (
            <MobileNavDrawer onClose={() => setMobileNavOpen(false)} />
          ) : null}
          {searchOpen ? (
            <SearchOverlay data={searchData} onClose={() => setSearchOpen(false)} />
          ) : null}
        </div>
      </div>
    </AnalysisNavProvider>
  );
}

function AppSidebar({
  collapsed,
  onToggleCollapsed,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const pathname = usePathname();

  return (
    <div
      className={cn(
        "sticky top-0 z-40 hidden h-dvh shrink-0 p-3 lg:block",
        "transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
        collapsed ? "w-[88px]" : "w-[236px]",
      )}
    >
      <aside
        className={cn(
          "fs-glass fs-glass-frosted flex h-full flex-col overflow-hidden",
          collapsed ? "w-[64px]" : "w-[212px]",
        )}
        aria-label="Primary"
      >
        <div
          className={cn(
            "flex h-14 items-center",
            collapsed ? "justify-center px-2" : "px-4",
          )}
        >
          <Link href={routes.app} className="min-w-0" aria-label="FightScope home">
            {collapsed ? (
              <LogoMark className="text-white" />
            ) : (
              <Logo className="text-white" wordmarkClassName="text-white !text-[17px]" />
            )}
          </Link>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-2 pb-2">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === routes.app
                ? pathname === routes.app
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = NAV_ICONS[item.href] ?? HomeIcon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={cn(
                  "group flex items-center gap-3 rounded-full px-3 py-2.5 text-[13px] font-medium",
                  "transition-[color,background-color,transform] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
                  collapsed && "justify-center px-0",
                  active
                    ? "bg-[var(--glass-active)] text-ink shadow-[inset_0_0_0_1px_rgba(239,82,82,0.35)]"
                    : "text-mute hover:translate-x-0.5 hover:bg-white/[0.06] hover:text-ink",
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center transition-colors duration-200",
                    active && "text-accent",
                  )}
                >
                  <Icon />
                </span>
                {!collapsed ? <span className="truncate">{item.label}</span> : null}
              </Link>
            );
          })}
        </nav>

        <div className="px-2 pb-2">
          <Link
            href={routes.account}
            title="Account"
            className={cn(
              "flex items-center gap-3 rounded-full px-3 py-2.5 text-[13px] font-medium text-mute transition-colors duration-200 hover:bg-white/[0.06] hover:text-ink",
              collapsed && "justify-center px-0",
            )}
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center">
              <AccountIcon />
            </span>
            {!collapsed ? <span>Account</span> : null}
          </Link>
          <button
            type="button"
            onClick={onToggleCollapsed}
            className={cn(
              "mt-0.5 flex w-full items-center gap-3 rounded-full px-3 py-2.5 text-[13px] font-medium text-mute transition-colors duration-200 hover:bg-white/[0.06] hover:text-ink",
              collapsed && "justify-center px-0",
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center">
              <CollapseIcon flipped={collapsed} />
            </span>
            {!collapsed ? <span>Collapse</span> : null}
          </button>
        </div>
      </aside>
    </div>
  );
}

function ProductTopBar({
  onSearch,
  onOpenMobileNav,
}: {
  onSearch: () => void;
  onOpenMobileNav: () => void;
}) {
  const { displayName, isPro } = useAccount();
  const { active: analysisNavActive, docked } = useAnalysisNav();
  const showDockedNav = analysisNavActive && docked;

  return (
    <header className="sticky top-0 z-[40] px-3 pt-3 sm:px-4 lg:px-6">
      <div
        className={cn(
          "fs-glass fs-glass-frosted mx-auto flex h-14 max-w-[1280px] items-center gap-2 rounded-[24px] px-3 sm:gap-3 sm:px-4",
          "transition-[gap] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
        )}
      >
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--glass-border)] bg-white/[0.04] text-mute transition-colors duration-200 hover:text-ink lg:hidden"
          aria-label="Open navigation"
        >
          <MenuIcon />
        </button>
        <Link
          href={routes.app}
          className={cn("shrink-0 lg:hidden", showDockedNav && "hidden sm:block")}
          aria-label="FightScope home"
        >
          <Logo />
        </Link>

        {showDockedNav ? <DockedAnalysisNav /> : <div className="min-w-0 flex-1" />}

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onSearch}
            className={cn(
              "fs-glass fs-glass-capsule hidden h-9 items-center gap-2 px-3 text-sm text-mute transition-[filter,transform,width] duration-300 hover:brightness-110 hover:text-ink md:inline-flex",
              showDockedNav ? "w-10 justify-center px-0 lg:w-44 lg:justify-start lg:px-3" : "w-56",
            )}
            aria-label="Open search"
          >
            <SearchIcon />
            <span className={cn("flex-1 text-left", showDockedNav && "hidden lg:inline")}>
              Search
            </span>
            {!showDockedNav ? (
              <kbd className="rounded-full border border-[var(--glass-border)] px-1.5 py-0.5 text-[10px] text-mute">
                ⌘K
              </kbd>
            ) : null}
          </button>
          <button
            type="button"
            onClick={onSearch}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--glass-border)] bg-white/[0.04] text-mute transition-colors duration-200 hover:text-ink md:hidden"
            aria-label="Open search"
          >
            <SearchIcon />
          </button>
          <AccountMenu displayName={displayName} isPro={isPro} />
        </div>
      </div>
    </header>
  );
}

function MobileNavDrawer({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button type="button" className="absolute inset-0 bg-[rgba(14,15,18,0.55)] backdrop-blur-sm" aria-label="Close navigation" onClick={onClose} />
      <aside className="fs-glass fs-glass-frosted absolute inset-y-3 left-3 flex w-[260px] flex-col overflow-hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href={routes.app} onClick={onClose} aria-label="FightScope home">
            <Logo className="text-white" wordmarkClassName="text-white !text-[17px]" />
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-mute hover:bg-white/[0.06] hover:text-ink"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-2 pt-1">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === routes.app
                ? pathname === routes.app
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = NAV_ICONS[item.href] ?? HomeIcon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-full px-3 py-2.5 text-[13px] font-medium transition-colors duration-200",
                  active
                    ? "bg-[var(--glass-active)] text-ink shadow-[inset_0_0_0_1px_rgba(239,82,82,0.35)]"
                    : "text-mute hover:bg-white/[0.06] hover:text-ink",
                )}
              >
                <span className={cn("flex h-5 w-5 items-center justify-center", active && "text-accent")}>
                  <Icon />
                </span>
                {item.label}
              </Link>
            );
          })}
          <Link
            href={routes.account}
            onClick={onClose}
            className="mt-2 flex items-center gap-3 rounded-full px-3 py-2.5 text-[13px] font-medium text-mute hover:bg-white/[0.06] hover:text-ink"
          >
            <span className="flex h-5 w-5 items-center justify-center">
              <AccountIcon />
            </span>
            Account
          </Link>
        </nav>
      </aside>
    </div>
  );
}

function AccountMenu({ displayName, isPro }: { displayName: string; isPro: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        className="inline-flex h-9 items-center gap-2 rounded-full px-1.5 text-sm text-ink transition-colors duration-200 hover:bg-white/[0.06] sm:border sm:border-[var(--glass-border)] sm:bg-white/[0.04] sm:px-2.5 sm:backdrop-blur-md sm:hover:brightness-110"
        aria-label="Account"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-soft text-[10px] font-semibold text-accent">
          {displayName.slice(0, 1).toUpperCase()}
        </span>
        <span className="hidden sm:inline">{displayName}</span>
        {isPro ? (
          <span className="hidden text-[10px] font-semibold tracking-[0.12em] text-accent uppercase sm:inline">
            Pro
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="fs-glass fs-glass-panel absolute right-0 mt-2 w-44 overflow-hidden py-1">
          <Link
            href={routes.account}
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm text-ink hover:bg-white/[0.06]"
          >
            Account
          </Link>
          <form action={signOutAction}>
            <button
              type="submit"
              className="block w-full px-3 py-2 text-left text-sm text-mute hover:bg-white/[0.06] hover:text-ink"
            >
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function SearchOverlay({
  data,
  onClose,
}: {
  data: ProductSearchData;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return {
        fighters: [] as SearchIndex["fighters"],
        events: [] as SearchIndex["events"],
        fights: [] as SearchIndex["fights"],
      };
    }
    return {
      fighters: data.fighters
        .filter((fighter) =>
          `${fighter.name} ${fighter.nickname ?? ""} ${fighter.division ?? ""}`.toLowerCase().includes(q),
        )
        .slice(0, 8),
      events: data.events
        .filter((event) => `${event.name} ${event.location}`.toLowerCase().includes(q))
        .slice(0, 6),
      fights: data.fights
        .filter((view) =>
          `${view.fighterA.name} ${view.fighterB.name} ${view.event.name}`.toLowerCase().includes(q),
        )
        .slice(0, 8),
    };
  }, [data, query]);

  const flatResults = useMemo(() => {
    const items: Array<{ href: string; key: string }> = [];
    for (const view of results.fights) {
      items.push({ href: routes.fight(view.fight.slug), key: `fight:${view.fight.id}` });
    }
    for (const fighter of results.fighters) {
      items.push({ href: routes.fighter(fighter.slug), key: `fighter:${fighter.id}` });
    }
    for (const event of results.events) {
      items.push({ href: routes.event(event.slug), key: `event:${event.id}` });
    }
    return items;
  }, [results]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  function go(href: string) {
    router.push(href);
    onClose();
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (!flatResults.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % flatResults.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => (prev - 1 + flatResults.length) % flatResults.length);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const target = flatResults[activeIndex];
      if (target) go(target.href);
    }
  }

  const empty =
    query.trim().length > 0 &&
    results.fighters.length + results.events.length + results.fights.length === 0;

  let runningIndex = -1;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-[rgba(14,15,18,0.55)] backdrop-blur-sm"
        aria-label="Close search"
        onClick={onClose}
      />
      <div className="relative mx-auto mt-10 w-full max-w-xl px-4 sm:mt-24">
        <div className="fs-glass fs-glass-overlay overflow-hidden">
          <div className="border-b border-[var(--glass-border)] p-3">
            <SearchInput
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search fighters, events, fights"
              aria-label="Search FightScope"
              aria-activedescendant={
                flatResults[activeIndex] ? `search-result-${flatResults[activeIndex].key}` : undefined
              }
            />
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-2" role="listbox">
            {!query.trim() ? (
              <p className="px-3 py-6 text-center text-sm text-mute">Search fighters, events, and matchups.</p>
            ) : null}
            {empty ? (
              <p className="px-3 py-6 text-center text-sm text-mute">No matching fighters, events, or fights.</p>
            ) : null}
            {results.fights.length > 0 ? (
              <ResultGroup title="Fights">
                {results.fights.map((view) => {
                  runningIndex += 1;
                  const index = runningIndex;
                  const active = index === activeIndex;
                  return (
                    <button
                      key={view.fight.id}
                      id={`search-result-fight:${view.fight.id}`}
                      type="button"
                      role="option"
                      aria-selected={active}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => go(routes.fight(view.fight.slug))}
                      className={cn(
                        "flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]",
                        active ? "bg-elevated" : "hover:bg-elevated/70",
                      )}
                    >
                      <div className="flex -space-x-2">
                        <FighterPortrait fighter={view.fighterA} name={view.fighterA.name} portrait={view.fighterA.portrait} variant="avatar" />
                        <FighterPortrait fighter={view.fighterB} name={view.fighterB.name} portrait={view.fighterB.portrait} variant="avatar" />
                      </div>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-ink">
                          {view.fighterA.lastName} vs {view.fighterB.lastName}
                        </span>
                        <span className="text-xs text-mute">{view.event.name}</span>
                      </span>
                      <Badge tone="mute">Fight</Badge>
                    </button>
                  );
                })}
              </ResultGroup>
            ) : null}
            {results.fighters.length > 0 ? (
              <ResultGroup title="Fighters">
                {results.fighters.map((fighter) => {
                  runningIndex += 1;
                  const index = runningIndex;
                  const active = index === activeIndex;
                  return (
                    <button
                      key={fighter.id}
                      id={`search-result-fighter:${fighter.id}`}
                      type="button"
                      role="option"
                      aria-selected={active}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => go(routes.fighter(fighter.slug))}
                      className={cn(
                        "flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]",
                        active ? "bg-elevated" : "hover:bg-elevated/70",
                      )}
                    >
                      <FighterPortrait fighter={fighter} name={fighter.name} portrait={fighter.portrait} variant="avatar" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-ink">{fighter.name}</span>
                        <span className="text-xs text-mute">{formatRecord(fighter.record)}</span>
                      </span>
                      <Badge tone="mute">Fighter</Badge>
                    </button>
                  );
                })}
              </ResultGroup>
            ) : null}
            {results.events.length > 0 ? (
              <ResultGroup title="Events">
                {results.events.map((event) => {
                  runningIndex += 1;
                  const index = runningIndex;
                  const active = index === activeIndex;
                  return (
                    <button
                      key={event.id}
                      id={`search-result-event:${event.id}`}
                      type="button"
                      role="option"
                      aria-selected={active}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => go(routes.event(event.slug))}
                      className={cn(
                        "flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]",
                        active ? "bg-elevated" : "hover:bg-elevated/70",
                      )}
                    >
                      <span>
                        <span className="block text-sm text-ink">{event.name}</span>
                        <span className="text-xs text-mute">{formatCompactDate(event.date)}</span>
                      </span>
                      <Badge tone="mute">Event</Badge>
                    </button>
                  );
                })}
              </ResultGroup>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="fs-page-enter">
      {children}
    </div>
  );
}

function ResultGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <p className="px-3 py-1.5 text-[10px] font-semibold tracking-[0.16em] text-mute uppercase">{title}</p>
      {children}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.7" />
      <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path d="M4 10.5 12 4l8 6.5V20H4V10.5Z" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function EventsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 3.5V7M16 3.5V7M4 10h16" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function FightersIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="16" cy="9" r="2.4" stroke="currentColor" strokeWidth="1.7" />
      <path d="M4 19c.6-3 2.8-4.5 5-4.5s4.4 1.5 5 4.5" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function CompareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path d="M7 7h13M7 12h13M7 17h13M4 7h.01M4 12h.01M4 17h.01" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path d="M12 8v5l3 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3L4.5 9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function PricingIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 8v8M10 10.5c.6-.7 1.3-1 2-1 1.3 0 2 .7 2 1.6 0 2.1-4 1.4-4 3.3 0 .9.8 1.6 2 1.6.8 0 1.5-.3 2-1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function AccountIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M5 19c1-3.2 3.5-4.8 7-4.8s6 1.6 7 4.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function CollapseIcon({ flipped }: { flipped?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("h-5 w-5 transition-transform duration-200", flipped && "rotate-180")}
      fill="none"
      aria-hidden="true"
    >
      <path d="M14 6 8 12l6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
