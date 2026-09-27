import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { routes } from "@/lib/routes";

export function LandingFinalCta() {
  return (
    <section className="relative overflow-hidden border-b border-white/[0.05] bg-surface">
      <div className="relative mx-auto max-w-[900px] px-4 py-24 text-center sm:px-6 sm:py-32">
        <Reveal>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-5xl lg:text-[3.5rem] lg:leading-[1.05]">
            Understand the fight
            <br />
            <span className="text-accent">before it happens.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-base leading-7 text-mute">
            Start free — open an upcoming card, compare fighters and read the matchup with real
            fight data.
          </p>
          <div className="mt-10 flex justify-center">
            <ButtonLink href={routes.signUp} size="lg" className="min-w-[12rem]">
              Start free
            </ButtonLink>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className="border-t border-white/[0.06] bg-[#0a0b0e]">
      <div className="mx-auto grid max-w-[1240px] gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.2fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-6 text-mute">
            FightScope provides analytical predictions and informational content. Predictions are
            not guarantees of fight outcomes. Not a betting platform.
          </p>
        </div>
        <FooterCol
          title="Product"
          links={[
            { href: routes.app, label: "Events" },
            { href: routes.fighters, label: "Fighters" },
            { href: routes.pricing, label: "Pricing" },
            { href: "/#faq", label: "FAQ" },
          ]}
        />
        <FooterCol
          title="Account"
          links={[
            { href: routes.signIn, label: "Sign in" },
            { href: routes.signUp, label: "Start free" },
          ]}
        />
        <FooterCol
          title="Legal"
          links={[
            { href: "/terms", label: "Terms of Service" },
            { href: "/privacy", label: "Privacy Policy" },
            { href: "/cookies", label: "Cookie Policy" },
            { href: "/legal", label: "Legal Notice" },
            { href: "/disclaimer", label: "Disclaimer" },
          ]}
        />
      </div>
      <div className="border-t border-white/[0.05]">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-2 px-4 py-5 text-[12px] text-mute sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} FightScope. All rights reserved.</p>
          <p>Not affiliated with UFC. Analysis product only — no betting.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: Array<{ href: string; label: string }>;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold tracking-[0.16em] text-mute uppercase">{title}</p>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.label}>
            <Link href={link.href} className="text-sm text-ink/85 transition-colors hover:text-ink">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
