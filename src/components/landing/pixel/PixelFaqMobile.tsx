"use client";

import { useId, useState } from "react";
import { usePixelLocale } from "@/components/landing/pixel/PixelLocaleContext";

/** Flow-layout FAQ for mobile landing (same copy as desktop PixelFaq). */
export function PixelFaqMobile() {
  const { copy } = usePixelLocale();
  const [open, setOpen] = useState<number | null>(null);
  const baseId = useId();

  return (
    <div className="pixel-mobile-faq">
      <h2 className="pixel-mobile-heading pixel-mobile-heading--center pixel-mobile-faq-heading">
        {copy.faq.heading}
      </h2>
      <p className="pixel-mobile-body pixel-mobile-body--center pixel-mobile-faq-intro">{copy.faq.intro}</p>
      <div className="pixel-mobile-faq-list">
        {copy.faq.items.map((item, index) => {
          const isOpen = open === index;
          const panelId = `${baseId}-m-panel-${index}`;
          return (
            <div key={item.q} className={`pixel-mobile-faq-row${isOpen ? " is-open" : ""}`}>
              <button
                type="button"
                className="pixel-mobile-faq-item"
                onClick={() => setOpen(isOpen ? null : index)}
                aria-expanded={isOpen}
                aria-controls={panelId}
              >
                <span className="pixel-mobile-faq-q">{item.q}</span>
                <span className={`pixel-mobile-faq-chevron${isOpen ? " is-open" : ""}`} aria-hidden="true" />
              </button>
              <div
                id={panelId}
                role="region"
                className={`pixel-mobile-faq-panel${isOpen ? " is-open" : ""}`}
                hidden={!isOpen}
              >
                <p className="pixel-mobile-faq-a">{item.a}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
