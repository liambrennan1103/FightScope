"use client";

import { useId, useState } from "react";
import { usePixelLocale } from "@/components/landing/pixel/PixelLocaleContext";
import { PIXEL_SECTIONS, localY } from "@/components/landing/pixel/layout-spec";

const FAQ_Y = [5127.1, 5260.6, 5393.7, 5526.9] as const;

export function PixelFaq() {
  const { copy } = usePixelLocale();
  const [open, setOpen] = useState<number | null>(null);
  const sectionTop = PIXEL_SECTIONS[5].y;
  const baseId = useId();

  return (
    <>
      <h2
        className="pixel-abs pixel-heading pixel-fluid-faq-heading"
        style={{
          top: localY(sectionTop, 4904.2),
          color: "#FFFFFF",
          zIndex: 2,
        }}
      >
        {copy.faq.heading}
      </h2>
      {copy.faq.items.map((item, index) => {
        const isOpen = open === index;
        const panelId = `${baseId}-panel-${index}`;
        return (
          <div
            key={item.q}
            className={`pixel-faq-row${isOpen ? " pixel-faq-row--open" : ""}`}
            style={{ top: localY(sectionTop, FAQ_Y[index]) }}
          >
            <button
              type="button"
              className={`pixel-faq-item${isOpen ? " pixel-faq-item--open" : ""}`}
              onClick={() => setOpen(isOpen ? null : index)}
              aria-expanded={isOpen}
              aria-controls={panelId}
            >
              <span className="pixel-faq-question">{item.q}</span>
              <span
                className={`pixel-faq-chevron${isOpen ? " pixel-faq-chevron--open" : ""}`}
                aria-hidden="true"
              />
            </button>
            <div
              id={panelId}
              role="region"
              className={isOpen ? "pixel-faq-panel pixel-faq-panel--open" : "pixel-faq-panel"}
            >
              <p className="pixel-faq-answer">{item.a}</p>
            </div>
          </div>
        );
      })}
    </>
  );
}
