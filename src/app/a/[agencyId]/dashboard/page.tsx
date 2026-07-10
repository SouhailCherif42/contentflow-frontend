"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAgency } from "@/lib/agency-context";
import { formatDate } from "@/lib/labels";
import { FlowRail } from "@/components/flow-rail";
import { Badge, Card, ErrorState, PageHeader, Skeleton } from "@/components/ui";
import { contentStatusLabels } from "@/lib/labels";
import type { Content, DashboardData, Idea } from "@/lib/types";

export default function DashboardPage() {
  const { agencyId, agency } = useAgency();

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
        title={`Bonjour — ${agency?.name ?? ""}`}
        description="L'état de votre pipeline éditorial, en un coup d'œil."
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
          { label: "Idées en attente", value: d?.ideas.pending ?? 0, href: "ideas" },
          { label: "Idées approuvées", value: d?.ideas.approved ?? 0, href: "ideas" },
          { label: "Flux de veille", value: d?.curation.feeds ?? 0, href: "curation" },
          {
            label: "Contenus au total",
            value: d ? Object.values(d.content).reduce((a, b) => a + (b ?? 0), 0) : 0,
            href: "content",
          },
        ].map((stat) => (
          <Link key={stat.label} href={`/a/${agencyId}/${stat.href}`}>
            <Card className="p-4 transition-colors hover:border-accent">
              {d ? (
                <p className="font-display text-3xl tabular-nums">{stat.value}</p>
              ) : (
                <Skeleton className="h-9 w-12" />
              )}
              <p className="mt-1 text-[13px] text-soft">{stat.label}</p>
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
