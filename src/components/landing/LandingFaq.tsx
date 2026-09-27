"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

const FAQ_ITEMS = [
  {
    q: "What is FightScope?",
    a: "FightScope is an MMA analysis product. It turns fighter records, physical attributes, recent form and matchup context into readable fight predictions and breakdowns.",
  },
  {
    q: "How are FightScope predictions generated?",
    a: "Each matchup combines fighter attributes, physical profiles, recent performances and style context into a FightScope win probability and method distribution. Predictions are analytical estimates based on available fight data — not guarantees.",
  },
  {
    q: "Is FightScope a betting platform?",
    a: "No. FightScope does not place, accept or broker bets. It is a fight-analysis and education product that helps you understand matchups before fight night.",
  },
  {
    q: "Can FightScope guarantee fight results?",
    a: "No. MMA outcomes are uncertain. FightScope predictions are analytical estimates only and must never be treated as guaranteed results or financial advice.",
  },
  {
    q: "Can I compare fighters who are not scheduled to fight?",
    a: "Yes. Fight Analysis lets you put any two fighters on the board and explore a hypothetical matchup.",
  },
  {
    q: "How often is fighter information updated?",
    a: "FightScope syncs UFC event and fighter data on a regular refresh cycle (about every 30 minutes in production) so upcoming cards and roster details stay current.",
  },
  {
    q: "What does FightScope Pro include?",
    a: "Pro unlocks unlimited full fight analyses, advanced fighter attributes, complete matchup breakdowns, unlimited comparisons and deeper prediction insights.",
  },
] as const;

export function LandingFaq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div id="faq" className="mx-auto max-w-3xl scroll-mt-24">
      <div className="text-center">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-accent uppercase">Support</p>
        <h2 className="font-display mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Frequently asked questions
        </h2>
      </div>
      <div className="mt-10 divide-y divide-white/[0.06] border border-white/[0.08] bg-surface">
        {FAQ_ITEMS.map((item, index) => {
          const isOpen = open === index;
          return (
            <div key={item.q}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : index)}
              >
                <span className="text-sm font-semibold text-ink sm:text-base">{item.q}</span>
                <span className="font-mono text-mute" aria-hidden="true">
                  {isOpen ? "−" : "+"}
                </span>
              </button>
              <div
                className={cn(
                  "grid transition-[grid-template-rows] duration-200",
                  isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                )}
              >
                <div className="overflow-hidden">
                  <p className="px-5 pb-5 text-sm leading-6 text-mute sm:px-6">{item.a}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
