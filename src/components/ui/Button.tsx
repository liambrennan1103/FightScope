import Link from "next/link";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "glass";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variants: Record<ButtonVariant, string> = {
  primary: "fs-glass-cta text-white focus-visible:outline-accent",
  secondary:
    "fs-glass fs-glass-capsule text-ink hover:brightness-110 focus-visible:outline-accent",
  ghost: "text-mute hover:text-ink hover:bg-white/5",
  glass: "fs-glass fs-glass-capsule text-ink hover:brightness-110 focus-visible:outline-accent",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-sm",
};

export function buttonClass(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
) {
  return cn(
    "fs-phys-press inline-flex items-center justify-center gap-2 font-medium disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100",
    variant === "primary" || variant === "secondary" || variant === "glass"
      ? "rounded-full"
      : "rounded-lg",
    "transition-[transform,background-color,border-color,box-shadow,filter] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />;
}

interface ButtonLinkProps {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: React.ReactNode;
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
}: ButtonLinkProps) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)}>
      {children}
    </Link>
  );
}
