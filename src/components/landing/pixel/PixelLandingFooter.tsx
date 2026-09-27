"use client";

import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { usePixelLocale } from "@/components/landing/pixel/PixelLocaleContext";
import { routes } from "@/lib/routes";

export function PixelLandingFooter() {
  const { copy, locale } = usePixelLocale();
  const year = new Date().getFullYear();

  const product =
    locale === "fr"
      ? [
          { href: routes.app, label: "Événements" },
          { href: routes.fighters, label: "Combattants" },
          { href: routes.pricing, label: "Tarifs" },
          { href: "#faq", label: "FAQ" },
        ]
      : [
          { href: routes.app, label: "Events" },
          { href: routes.fighters, label: "Fighters" },
          { href: routes.pricing, label: "Pricing" },
          { href: "#faq", label: "FAQ" },
        ];

  const legal = [
    { href: "/terms", label: locale === "fr" ? "Conditions" : "Terms of Service" },
    { href: "/privacy", label: locale === "fr" ? "Confidentialité" : "Privacy Policy" },
    { href: "/cookies", label: locale === "fr" ? "Cookies" : "Cookie Policy" },
    { href: "/legal", label: locale === "fr" ? "Mentions légales" : "Legal Notice" },
    { href: "/disclaimer", label: "Disclaimer" },
  ];

  const account = [
    { href: routes.signIn, label: locale === "fr" ? "Connexion" : "Sign in" },
    { href: routes.signUp, label: locale === "fr" ? "Créer un compte" : "Start free" },
  ];

  return (
    <footer className="pixel-site-footer">
      <div className="pixel-site-footer-grid">
        <div className="pixel-site-footer-brand">
          <Logo className="text-white" wordmarkClassName="text-white" />
          <p className="pixel-site-footer-tagline">{copy.footer.tagline}</p>
        </div>
        <FooterCol title={copy.footer.product} links={product} />
        <FooterCol title={copy.footer.account} links={account} />
        <FooterCol title={copy.footer.legal} links={legal} />
      </div>
      <div className="pixel-site-footer-bottom">
        <p>
          © {year} FightScope. {copy.footer.copyright}
        </p>
        <p>{copy.footer.disclaimer}</p>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: Array<{ href: string; label: string }> }) {
  return (
    <div>
      <p className="pixel-site-footer-col-title">{title}</p>
      <ul className="pixel-site-footer-links">
        {links.map((link) => (
          <li key={link.href + link.label}>
            <Link href={link.href}>{link.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
