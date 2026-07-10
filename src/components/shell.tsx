"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Calendar,
  FileText,
  LayoutDashboard,
  Layers,
  Lightbulb,
  LogOut,
  Rss,
  Settings,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { useAgency } from "@/lib/agency-context";
import { fetchMyAgencies } from "@/lib/agencies";
import { agencyStore } from "@/lib/api";
import { roleLabels, initials } from "@/lib/labels";
import { Logo } from "./logo";
import { cn } from "./ui";

const navItems = [
  { href: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "topics", label: "Piliers éditoriaux", icon: Layers },
  { href: "ideas", label: "Idées", icon: Lightbulb },
  { href: "content", label: "Contenus", icon: FileText },
  { href: "curation", label: "Curation", icon: Rss },
  { href: "calendar", label: "Calendrier", icon: Calendar },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { agencyId, agency, role } = useAgency();
  const pathname = usePathname();
  const router = useRouter();

  const base = `/a/${agencyId}`;

  const myAgencies = useQuery({ queryKey: ["my-agencies"], queryFn: fetchMyAgencies });
  const switchable = (myAgencies.data?.length ?? 0) > 1;

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-20 flex w-60 flex-col border-r border-line bg-panel">
        <div className="px-4 py-4">
          <Link href={base + "/dashboard"}>
            <Logo />
          </Link>
        </div>

        <div className="mx-4 mb-3 rounded-md border border-line bg-surface px-3 py-2">
          {switchable ? (
            <select
              aria-label="Changer d'agence"
              className="w-full cursor-pointer bg-transparent text-[13px] font-medium text-ink focus:outline-none"
              value={agencyId}
              onChange={(e) => {
                agencyStore.set(e.target.value);
                router.push(`/a/${e.target.value}/dashboard`);
              }}
            >
              {myAgencies.data?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          ) : (
            <p className="truncate text-[13px] font-medium text-ink">{agency?.name ?? "…"}</p>
          )}
          <p className="text-xs text-soft">{role ? roleLabels[role] : ""}</p>
        </div>

        <nav className="flex-1 space-y-0.5 px-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(`${base}/${href}`);
            return (
              <Link
                key={href}
                href={`${base}/${href}`}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors",
                  active
                    ? "bg-accent-soft font-medium text-accent-strong"
                    : "text-soft hover:bg-surface hover:text-ink",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-0.5 border-t border-line p-2">
          <Link
            href={`${base}/settings`}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors",
              pathname.startsWith(`${base}/settings`)
                ? "bg-accent-soft font-medium text-accent-strong"
                : "text-soft hover:bg-surface hover:text-ink",
            )}
          >
            <Settings className="h-4 w-4" />
            Paramètres
          </Link>
          <div className="flex items-center gap-2.5 px-2.5 py-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-medium text-white">
              {user ? initials(user.full_name) : "?"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-ink">{user?.full_name}</p>
              <p className="truncate text-xs text-soft">{user?.email}</p>
            </div>
            <button
              onClick={async () => {
                await logout();
                router.push("/login");
              }}
              aria-label="Se déconnecter"
              title="Se déconnecter"
              className="rounded p-1.5 text-soft hover:bg-surface hover:text-ink cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="ml-60 flex-1 px-8 py-7">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
