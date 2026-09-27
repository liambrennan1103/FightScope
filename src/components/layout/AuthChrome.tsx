import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { routes } from "@/lib/routes";

export function AuthChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="shrink-0 border-b border-white/[0.06]">
        <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center px-4 sm:px-6">
          <Link href={routes.landing} aria-label="FightScope">
            <Logo />
          </Link>
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
