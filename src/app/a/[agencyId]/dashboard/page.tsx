"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Bookmark,
  CalendarClock,
  CheckCircle2,
  FileText,
  Layers,
  Lightbulb,
  Rss,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAgency } from "@/lib/agency-context";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/labels";
import { FlowRail } from "@/components/flow-rail";
import { Badge, Card, ErrorState, PageHeader, Skeleton } from "@/components/ui";
import { contentStatusLabels } from "@/lib/labels";
import type { Content, DashboardData, Idea } from "@/lib/types";

export default function DashboardPage() {
  const { agencyId, agency } = useAgency();
  const { user } = useAuth();

  const dashboard = useQuery({
    queryKey: ["dashboard", agencyId],
    queryFn: () => api<DashboardData>(`/agencies/${agencyId}/dashboard`),
  });

  const recentContent = useQuery({
    queryKey: ["content", agencyId, "recent"],
    queryFn: () => api<Content[]>(`/agencies/${agencyId}/content`),
  });

  const pendingIdeas = useQuery({
    queryKey: ["ideas", agencyId, "pending"],
    queryFn: () => api<Idea[]>(`/agencies/${agencyId}/ideas`, { query: { status: "pending" } }),
  });

  if (dashboard.isError) {
    return (
      <ErrorState
        message={dashboard.error instanceof Error ? dashboard.error.message : "Chargement impossible"}
        onRetry={() => dashboard.refetch()}
      />
    );
  }

  const d = dashboard.data;
  const ideasTotal = d ? Object.values(d.ideas).reduce((a, b) => a + (b ?? 0), 0) : 0;

  return (
    <>
      <PageHeader
        title={`Bonjour ${user?.full_name.split(" ")[0] ?? ""}`}
        description={`L'état du pipeline éditorial de ${agency?.name ?? "votre agence"}, en un coup d'œil.`}
      />

      {/* Le rail de flux : la signature du produit appliquée aux vraies données */}
      <Card className="mb-6 px-8 pb-4 pt-7">
        {d ? (
          <FlowRail
            steps={[
              { label: "Articles veille (7 j)", count: d.curation.articles_this_week },
              { label: "Idées", count: ideasTotal },
              { label: "Brouillons", count: d.content.draft ?? 0 },
              { label: "En relecture", count: d.content.review ?? 0 },
              { label: "Publiés", count: d.content.published ?? 0 },
            ]}
            activeIndex={4}
          />
        ) : (
          <Skeleton className="h-10 w-full" />
        )}
      </Card>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Idées en attente", value: d?.ideas.pending ?? 0, href: "ideas", icon: Lightbulb },
          { label: "Idées approuvées", value: d?.ideas.approved ?? 0, href: "ideas", icon: CheckCircle2 },
          {
            label: "Contenus au total",
            value: d ? Object.values(d.content).reduce((a, b) => a + (b ?? 0), 0) : 0,
            href: "content",
            icon: FileText,
          },
          { label: "Planifiés (7 j)", value: d?.calendar.upcoming_7d ?? 0, href: "calendar", icon: CalendarClock },
          { label: "Piliers éditoriaux", value: d?.topics ?? 0, href: "topics", icon: Layers },
          { label: "Membres de l'équipe", value: d?.members ?? 0, href: "settings/members", icon: Users },
          { label: "Flux de veille", value: d?.curation.feeds ?? 0, href: "curation", icon: Rss },
          { label: "Articles sauvegardés", value: d?.curation.saved ?? 0, href: "curation", icon: Bookmark },
        ].map(({ label, value, href, icon: Icon }) => (
          <Link key={label} href={`/a/${agencyId}/${href}`}>
            <Card className="group flex items-start justify-between p-4 transition-colors hover:border-accent">
              <div>
                {d ? (
                  <p className="font-display text-3xl tabular-nums">{value}</p>
                ) : (
                  <Skeleton className="h-9 w-12" />
                )}
                <p className="mt-1 text-[13px] text-soft">{label}</p>
              </div>
              <span className="rounded-md bg-accent-soft p-2 text-accent-strong transition-colors group-hover:bg-accent group-hover:text-white">
                <Icon className="h-4 w-4" />
              </span>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Derniers contenus</h2>
            <Link href={`/a/${agencyId}/content`} className="text-xs text-accent hover:underline">
              Tout voir
            </Link>
          </div>
          {recentContent.isPending ? (
            <div className="space-y-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : recentContent.data && recentContent.data.length > 0 ? (
            <ul className="divide-y divide-line">
              {recentContent.data.slice(0, 6).map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/a/${agencyId}/content/${c.id}`}
                    className="flex items-center justify-between gap-3 py-2 hover:text-accent-strong"
                  >
                    <span className="truncate text-[13px]">{c.title}</span>
                    <Badge
                      tone={c.status === "published" ? "green" : c.status === "review" ? "amber" : "neutral"}
                    >
                      {contentStatusLabels[c.status]}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-[13px] text-soft">
              Aucun contenu pour l&apos;instant. Créez-en un depuis l&apos;onglet Contenus.
            </p>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Idées à trier</h2>
            <Link href={`/a/${agencyId}/ideas`} className="text-xs text-accent hover:underline">
              Tout voir
            </Link>
          </div>
          {pendingIdeas.isPending ? (
            <div className="space-y-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : pendingIdeas.data && pendingIdeas.data.length > 0 ? (
            <ul className="divide-y divide-line">
              {pendingIdeas.data.slice(0, 6).map((idea) => (
                <li key={idea.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="truncate text-[13px]">{idea.title}</span>
                  <span className="whitespace-nowrap text-xs text-faint">{formatDate(idea.created_at)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-[13px] text-soft">
              Rien à trier. Générez des idées depuis l&apos;onglet Idées.
            </p>
          )}
        </Card>
      </div>
    </>
  );
}
