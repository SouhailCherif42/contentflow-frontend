"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAgency } from "@/lib/agency-context";
import { PageHeader, cn } from "@/components/ui";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const { agencyId } = useAgency();
  const pathname = usePathname();
  const base = `/a/${agencyId}/settings`;

  const tabs = [
    { href: base, label: "Agence" },
    { href: `${base}/members`, label: "Membres" },
    { href: `${base}/notion`, label: "Notion" },
  ];

  return (
    <>
      <PageHeader title="Paramètres" description="Agence, équipe et intégrations." />
      <div className="mb-6 flex gap-1 border-b border-line">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "-mb-px border-b-2 px-3 py-2 text-sm transition-colors",
                active
                  ? "border-accent font-medium text-accent-strong"
                  : "border-transparent text-soft hover:text-ink",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
      {children}
    </>
  );
}
