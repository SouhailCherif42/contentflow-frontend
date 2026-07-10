"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Plus, Sparkles, X } from "lucide-react";
import { api } from "@/lib/api";
import { useAgency } from "@/lib/agency-context";
import { useToast } from "@/components/toast";
import { ArticlePicker } from "@/components/article-picker";
import { formatDate, ideaStatusLabels } from "@/lib/labels";
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
import type { DuplicateCheck, Idea, IdeaStatus, Topic } from "@/lib/types";

const statusTones: Record<IdeaStatus, BadgeTone> = {
  pending: "neutral",
  approved: "green",
  rejected: "red",
  used: "blue",
};

export default function IdeasPage() {
  const { agencyId, canEdit } = useAgency();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [topicFilter, setTopicFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const topics = useQuery({
    queryKey: ["topics", agencyId],
    queryFn: () => api<Topic[]>(`/agencies/${agencyId}/topics`),
  });

  const ideas = useQuery({
    queryKey: ["ideas", agencyId, topicFilter, statusFilter],
    queryFn: () =>
      api<Idea[]>(`/agencies/${agencyId}/ideas`, {
        query: { topic_id: topicFilter || undefined, status: statusFilter || undefined },
      }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["ideas", agencyId] });

  const setStatus = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "approve" | "reject" }) =>
      api<Idea>(`/agencies/${agencyId}/ideas/${id}/${action}`, { method: "POST" }),
    onSuccess: (_, { action }) => {
      invalidate();
      toast(action === "approve" ? "Idée approuvée" : "Idée rejetée");
    },
    onError: (err) => toast(err instanceof Error ? err.message : "Action impossible", "error"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`/agencies/${agencyId}/ideas/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      invalidate();
      toast("Idée supprimée");
    },
    onError: (err) => toast(err instanceof Error ? err.message : "Suppression impossible", "error"),
  });

  /* --- Génération IA --- */
  const [genOpen, setGenOpen] = useState(false);
  const [genForm, setGenForm] = useState({ topic_id: "", count: 5, additional_instructions: "" });
  const [genArticles, setGenArticles] = useState<string[]>([]);
  const [genError, setGenError] = useState<string | null>(null);

  const generate = useMutation({
    mutationFn: () =>
      api<Idea[]>(`/agencies/${agencyId}/ideas/generate`, {
        method: "POST",
        body: {
          topic_id: genForm.topic_id,
          count: genForm.count,
          curated_article_ids: genArticles,
          additional_instructions: genForm.additional_instructions || null,
        },
      }),
    onSuccess: (created) => {
      invalidate();
      setGenOpen(false);
      toast(`${created.length} idée${created.length > 1 ? "s" : ""} générée${created.length > 1 ? "s" : ""}`);
    },
    onError: (err) => setGenError(err instanceof Error ? err.message : "Génération impossible"),
  });

  /* --- Création manuelle avec anti-duplicate --- */
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ title: "", description: "", topic_id: "" });
  const [createError, setCreateError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<DuplicateCheck | null>(null);

  const create = useMutation({
    mutationFn: async ({ force }: { force: boolean }) => {
      if (!force) {
        const check = await api<DuplicateCheck>(`/agencies/${agencyId}/ideas/check-duplicate`, {
          method: "POST",
          body: { title: createForm.title, description: createForm.description || null },
        });
        if (check.is_duplicate) {
          setDuplicate(check);
          return null;
        }
      }
      return api<Idea>(`/agencies/${agencyId}/ideas`, {
        method: "POST",
        body: {
          title: createForm.title,
          description: createForm.description || null,
          topic_id: createForm.topic_id || null,
        },
      });
    },
    onSuccess: (idea) => {
      if (!idea) return; // doublon détecté, on attend la décision
      invalidate();
      setCreateOpen(false);
      toast("Idée créée");
    },
    onError: (err) => setCreateError(err instanceof Error ? err.message : "Création impossible"),
  });

  const openCreate = () => {
    setCreateForm({ title: "", description: "", topic_id: "" });
    setCreateError(null);
    setDuplicate(null);
    setCreateOpen(true);
  };

  const topicName = (id: string | null) => topics.data?.find((t) => t.id === id)?.name ?? "—";

  return (
    <>
      <PageHeader
        title="Idées"
        description="Le vivier d'idées de l'agence : générez, triez, approuvez."
        actions={
          canEdit && (
            <>
              <Button variant="secondary" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Idée manuelle
              </Button>
              <Button
                onClick={() => {
                  setGenForm({ topic_id: topics.data?.[0]?.id ?? "", count: 5, additional_instructions: "" });
                  setGenArticles([]);
                  setGenError(null);
                  setGenOpen(true);
                }}
              >
                <Sparkles className="h-4 w-4" />
                Générer des idées
              </Button>
            </>
          )
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Select
          aria-label="Filtrer par pilier"
          className="w-52"
          value={topicFilter}
          onChange={(e) => setTopicFilter(e.target.value)}
        >
          <option value="">Tous les piliers</option>
          {topics.data?.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filtrer par statut"
          className="w-44"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Tous les statuts</option>
          {Object.entries(ideaStatusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      {ideas.isPending ? (
        <Spinner />
      ) : ideas.isError ? (
        <ErrorState
          message={ideas.error instanceof Error ? ideas.error.message : "Chargement impossible"}
          onRetry={() => ideas.refetch()}
        />
      ) : ideas.data.length === 0 ? (
        <EmptyState
          title="Aucune idée ici"
          description={
            topicFilter || statusFilter
              ? "Aucune idée ne correspond à ces filtres."
              : "Générez vos premières idées à partir d'un pilier éditorial, ou ajoutez-les à la main."
          }
          action={
            canEdit &&
            !topicFilter &&
            !statusFilter && (
              <Button
                onClick={() => {
                  setGenForm({ topic_id: topics.data?.[0]?.id ?? "", count: 5, additional_instructions: "" });
                  setGenArticles([]);
                  setGenOpen(true);
                }}
              >
                <Sparkles className="h-4 w-4" />
                Générer des idées
              </Button>
            )
          }
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Idée</Th>
              <Th>Pilier</Th>
              <Th>Statut</Th>
              <Th>Source</Th>
              <Th>Créée le</Th>
              {canEdit && <Th className="text-right">Actions</Th>}
            </tr>
          </thead>
          <tbody>
            {ideas.data.map((idea) => (
              <tr key={idea.id} className="hover:bg-canvas">
                <Td>
                  <p className="font-medium">{idea.title}</p>
                  {idea.description && (
                    <p className="mt-0.5 line-clamp-2 max-w-md text-[13px] text-soft">{idea.description}</p>
                  )}
                </Td>
                <Td className="whitespace-nowrap text-soft">{topicName(idea.topic_id)}</Td>
                <Td>
                  <Badge tone={statusTones[idea.status]}>{ideaStatusLabels[idea.status]}</Badge>
                </Td>
                <Td className="text-soft">{idea.source === "generated" ? "IA" : "Manuelle"}</Td>
                <Td className="whitespace-nowrap text-soft">{formatDate(idea.created_at)}</Td>
                {canEdit && (
                  <Td>
                    <div className="flex justify-end gap-1">
                      {idea.status === "pending" && (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            title="Approuver"
                            onClick={() => setStatus.mutate({ id: idea.id, action: "approve" })}
                          >
                            <Check className="h-3.5 w-3.5 text-accent" />
                            Approuver
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Rejeter"
                            onClick={() => setStatus.mutate({ id: idea.id, action: "reject" })}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Supprimer l'idée « ${idea.title} » ?`)) remove.mutate(idea.id);
                        }}
                      >
                        Supprimer
                      </Button>
                    </div>
                  </Td>
                )}
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {/* Dialog génération IA */}
      <Dialog open={genOpen} onClose={() => setGenOpen(false)} title="Générer des idées" wide>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setGenError(null);
            generate.mutate();
          }}
          className="space-y-4"
        >
          {topics.data && topics.data.length === 0 ? (
            <p className="text-sm text-soft">
              Créez d&apos;abord un pilier éditorial : la génération s&apos;appuie sur ses mots-clés.
            </p>
          ) : (
            <>
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
              <Field label="Nombre d'idées" htmlFor="gen-count">
                <Input
                  id="gen-count"
                  type="number"
                  min={1}
                  max={10}
                  value={genForm.count}
                  onChange={(e) => setGenForm({ ...genForm, count: Number(e.target.value) })}
                />
              </Field>
              <Field label="Instructions complémentaires" htmlFor="gen-instructions" hint="Optionnel.">
                <Textarea
                  id="gen-instructions"
                  rows={3}
                  value={genForm.additional_instructions}
                  onChange={(e) => setGenForm({ ...genForm, additional_instructions: e.target.value })}
                  placeholder="Angle B2B, ton pédagogique, cibler les dirigeants de PME…"
                />
              </Field>
              <Field label="Ancrer dans la veille" hint="Les articles cochés servent de matière première aux idées.">
                <ArticlePicker selected={genArticles} onChange={setGenArticles} />
              </Field>
              {genError && <p className="text-sm text-danger">{genError}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="secondary" onClick={() => setGenOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" loading={generate.isPending}>
                  <Sparkles className="h-4 w-4" />
                  Générer
                </Button>
              </div>
            </>
          )}
        </form>
      </Dialog>

      {/* Dialog création manuelle */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="Nouvelle idée">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setCreateError(null);
            setDuplicate(null);
            create.mutate({ force: false });
          }}
          className="space-y-4"
        >
          <Field label="Titre" htmlFor="idea-title">
            <Input
              id="idea-title"
              required
              value={createForm.title}
              onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
              placeholder="10 erreurs SEO des sites vitrines"
            />
          </Field>
          <Field label="Description" htmlFor="idea-desc">
            <Textarea
              id="idea-desc"
              rows={3}
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
            />
          </Field>
          <Field label="Pilier éditorial" htmlFor="idea-topic">
            <Select
              id="idea-topic"
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

          {duplicate?.is_duplicate && (
            <div className="rounded-md border border-warn/30 bg-warn-soft px-3 py-2.5 text-sm text-warn">
              <p className="font-medium">Une idée très proche existe déjà</p>
              <p className="mt-0.5">
                Similarité : {(duplicate.similarity_score * 100).toFixed(0)} %. Vous pouvez créer quand même
                ou reformuler.
              </p>
            </div>
          )}
          {createError && <p className="text-sm text-danger">{createError}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            {duplicate?.is_duplicate ? (
              <Button
                type="button"
                loading={create.isPending}
                onClick={() => create.mutate({ force: true })}
              >
                Créer quand même
              </Button>
            ) : (
              <Button type="submit" loading={create.isPending}>
                Créer l&apos;idée
              </Button>
            )}
          </div>
        </form>
      </Dialog>
    </>
  );
}
