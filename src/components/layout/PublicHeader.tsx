import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { routes } from "@/lib/routes";

const NAV = [
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
] as const;

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-4 px-4 sm:px-6">
        <Link href={routes.landing} className="shrink-0" aria-label="FightScope home">
          <Logo />
        </Link>
        <nav
          className="ml-6 hidden items-center gap-5 sm:flex lg:gap-6"
          aria-label="Landing"
        >
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm text-mute transition-colors hover:text-ink"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <nav className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3" aria-label="Account">
          <ButtonLink href={routes.signIn} variant="ghost" size="sm">
            Sign in
          </ButtonLink>
          <ButtonLink href={routes.signUp} size="sm">
            Get started
          </ButtonLink>
        </nav>
      </div>
    </header>
  );
}
