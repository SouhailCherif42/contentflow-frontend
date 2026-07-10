"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { useAgency } from "@/lib/agency-context";
import { contentFormatLabels, contentStatusLabels, formatDate } from "@/lib/labels";
import { ArticlePicker } from "@/components/article-picker";
import {
  Badge,
  Button,
  Dialog,
  EmptyState,
  ErrorState,
  Field,
  Input,
  PageHeader,
  Select,
  Spinner,
  Table,
  Td,
  Textarea,
  Th,
  type BadgeTone,
} from "@/components/ui";
import type { Content, ContentStatus, Idea, Topic } from "@/lib/types";

const statusTones: Record<ContentStatus, BadgeTone> = {
  draft: "neutral",
  review: "amber",
  published: "green",
};

export default function ContentListPage() {
  const { agencyId, canEdit } = useAgency();
  const router = useRouter();

  const [topicFilter, setTopicFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [formatFilter, setFormatFilter] = useState("");

  const topics = useQuery({
    queryKey: ["topics", agencyId],
    queryFn: () => api<Topic[]>(`/agencies/${agencyId}/topics`),
  });

  const contents = useQuery({
    queryKey: ["content", agencyId, topicFilter, statusFilter, formatFilter],
    queryFn: () =>
      api<Content[]>(`/agencies/${agencyId}/content`, {
        query: {
          topic_id: topicFilter || undefined,
          status: statusFilter || undefined,
          format: formatFilter || undefined,
        },
      }),
  });

  /* --- Génération IA --- */
  const [genOpen, setGenOpen] = useState(false);
  const [genForm, setGenForm] = useState({ topic_id: "", idea_id: "", brief: "", format: "blog_post" });
  const [genArticles, setGenArticles] = useState<string[]>([]);
  const [genError, setGenError] = useState<string | null>(null);

  const approvedIdeas = useQuery({
    queryKey: ["ideas", agencyId, "approved-for-gen"],
    queryFn: () => api<Idea[]>(`/agencies/${agencyId}/ideas`, { query: { status: "approved" } }),
    enabled: genOpen,
  });

  const generate = useMutation({
    mutationFn: () =>
      api<Content>(`/agencies/${agencyId}/content/generate`, {
        method: "POST",
        body: {
          topic_id: genForm.topic_id,
          idea_id: genForm.idea_id || null,
          brief: genForm.brief || null,
          format: genForm.format,
          curated_article_ids: genArticles,
          context_mode: genForm.idea_id || genArticles.length > 0 ? "full" : "brief_only",
        },
      }),
    onSuccess: (content) => router.push(`/a/${agencyId}/content/${content.id}`),
    onError: (err) => setGenError(err instanceof Error ? err.message : "Génération impossible"),
  });

  /* --- Création manuelle --- */
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ title: "", topic_id: "", format: "blog_post" });
  const [createError, setCreateError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () =>
      api<Content>(`/agencies/${agencyId}/content`, {
        method: "POST",
        body: {
          title: createForm.title,
          topic_id: createForm.topic_id || null,
          format: createForm.format,
        },
      }),
    onSuccess: (content) => router.push(`/a/${agencyId}/content/${content.id}`),
    onError: (err) => setCreateError(err instanceof Error ? err.message : "Création impossible"),
  });

  const topicName = (id: string | null) => topics.data?.find((t) => t.id === id)?.name ?? "—";

  return (
    <>
      <PageHeader
        title="Contenus"
        description="Brouillons, relectures et publications de l'agence."
        actions={
          canEdit && (
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  setCreateForm({ title: "", topic_id: "", format: "blog_post" });
                  setCreateError(null);
                  setCreateOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Contenu vierge
              </Button>
              <Button
                onClick={() => {
                  setGenForm({ topic_id: topics.data?.[0]?.id ?? "", idea_id: "", brief: "", format: "blog_post" });
                  setGenArticles([]);
                  setGenError(null);
                  setGenOpen(true);
                }}
              >
                <Sparkles className="h-4 w-4" />
                Générer un contenu
              </Button>
            </>
          )
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Select aria-label="Filtrer par pilier" className="w-52" value={topicFilter} onChange={(e) => setTopicFilter(e.target.value)}>
          <option value="">Tous les piliers</option>
          {topics.data?.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
        <Select aria-label="Filtrer par statut" className="w-44" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Tous les statuts</option>
          {Object.entries(contentStatusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Select aria-label="Filtrer par format" className="w-48" value={formatFilter} onChange={(e) => setFormatFilter(e.target.value)}>
          <option value="">Tous les formats</option>
          {Object.entries(contentFormatLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      {contents.isPending ? (
        <Spinner />
      ) : contents.isError ? (
        <ErrorState
          message={contents.error instanceof Error ? contents.error.message : "Chargement impossible"}
          onRetry={() => contents.refetch()}
        />
      ) : contents.data.length === 0 ? (
        <EmptyState
          title="Aucun contenu"
          description={
            topicFilter || statusFilter || formatFilter
              ? "Aucun contenu ne correspond à ces filtres."
              : "Générez un premier contenu depuis une idée approuvée, ou partez d'une page vierge."
          }
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Titre</Th>
              <Th>Pilier</Th>
              <Th>Format</Th>
              <Th>Statut</Th>
              <Th>Notion</Th>
              <Th>Modifié le</Th>
            </tr>
          </thead>
          <tbody>
            {contents.data.map((c) => (
              <tr
                key={c.id}
                onClick={() => router.push(`/a/${agencyId}/content/${c.id}`)}
                className="cursor-pointer hover:bg-canvas"
              >
                <Td>
                  <Link
                    href={`/a/${agencyId}/content/${c.id}`}
                    className="font-medium hover:text-accent-strong"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {c.title}
                  </Link>
                </Td>
                <Td className="whitespace-nowrap text-soft">{topicName(c.topic_id)}</Td>
                <Td className="whitespace-nowrap text-soft">{contentFormatLabels[c.format]}</Td>
                <Td>
                  <Badge tone={statusTones[c.status]}>{contentStatusLabels[c.status]}</Badge>
                </Td>
                <Td>{c.notion_page_id ? <Badge tone="green">Synchronisé</Badge> : <span className="text-faint">—</span>}</Td>
                <Td className="whitespace-nowrap text-soft">{formatDate(c.updated_at)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {/* Dialog génération */}
      <Dialog open={genOpen} onClose={() => setGenOpen(false)} title="Générer un contenu" wide>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setGenError(null);
            generate.mutate();
          }}
          className="space-y-4"
        >
          {topics.data && topics.data.length === 0 ? (
            <p className="text-sm text-soft">Créez d&apos;abord un pilier éditorial.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Pilier éditorial" htmlFor="gen-topic">
                  <Select
                    id="gen-topic"
                    required
                    value={genForm.topic_id}
                    onChange={(e) => setGenForm({ ...genForm, topic_id: e.target.value })}
                  >
                    {topics.data?.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Format" htmlFor="gen-format">
                  <Select
                    id="gen-format"
                    value={genForm.format}
                    onChange={(e) => setGenForm({ ...genForm, format: e.target.value })}
                  >
                    {Object.entries(contentFormatLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field
                label="Partir d'une idée approuvée"
                htmlFor="gen-idea"
                hint="Optionnel — sinon décrivez un brief ci-dessous."
              >
                <Select
                  id="gen-idea"
                  value={genForm.idea_id}
                  onChange={(e) => setGenForm({ ...genForm, idea_id: e.target.value })}
                >
                  <option value="">Aucune idée — brief libre</option>
                  {approvedIdeas.data?.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.title}
                    </option>
                  ))}
                </Select>
              </Field>
              {!genForm.idea_id && (
                <Field label="Brief" htmlFor="gen-brief">
                  <Textarea
                    id="gen-brief"
                    rows={3}
                    required
                    value={genForm.brief}
                    onChange={(e) => setGenForm({ ...genForm, brief: e.target.value })}
                    placeholder="Sujet, angle, audience, points à couvrir…"
                  />
                </Field>
              )}
              <Field
                label="Ancrer dans la veille"
                hint="Les articles cochés nourrissent la rédaction (sources, angles, données)."
              >
                <ArticlePicker selected={genArticles} onChange={setGenArticles} />
              </Field>
              {genError && <p className="text-sm text-danger">{genError}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="secondary" onClick={() => setGenOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" loading={generate.isPending}>
                  <Sparkles className="h-4 w-4" />
                  {generate.isPending ? "Génération en cours…" : "Générer"}
                </Button>
              </div>
            </>
          )}
        </form>
      </Dialog>

      {/* Dialog création manuelle */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="Nouveau contenu">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setCreateError(null);
            create.mutate();
          }}
          className="space-y-4"
        >
          <Field label="Titre" htmlFor="content-title">
            <Input
              id="content-title"
              required
              value={createForm.title}
              onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Pilier éditorial" htmlFor="content-topic">
              <Select
                id="content-topic"
                value={createForm.topic_id}
                onChange={(e) => setCreateForm({ ...createForm, topic_id: e.target.value })}
              >
                <option value="">Sans pilier</option>
                {topics.data?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Format" htmlFor="content-format">
              <Select
                id="content-format"
                value={createForm.format}
                onChange={(e) => setCreateForm({ ...createForm, format: e.target.value })}
              >
                {Object.entries(contentFormatLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          {createError && <p className="text-sm text-danger">{createError}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" loading={create.isPending}>
              Créer et ouvrir
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
