import { cn } from "./ui";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-display text-lg text-ink", className)}>
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
        {/* trois segments qui convergent : le flux éditorial */}
        <path d="M2 5h9" stroke="#1e7a4a" strokeWidth="2" strokeLinecap="round" />
        <path d="M2 10h13" stroke="#1e7a4a" strokeWidth="2" strokeLinecap="round" />
        <path d="M2 15h9" stroke="#1e7a4a" strokeWidth="2" strokeLinecap="round" />
        <circle cx="16.5" cy="10" r="2.5" fill="#1e7a4a" />
      </svg>
      ContentFlow
    </span>
  );
}
