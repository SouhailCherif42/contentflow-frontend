import { cn } from "./ui";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-display text-lg text-ink", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo_favicon.svg" alt="" aria-hidden className="h-6 w-auto" />
      ContentFlow
    </span>
  );
}
