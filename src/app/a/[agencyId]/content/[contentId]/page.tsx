"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, History, Send, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { useAgency } from "@/lib/agency-context";
import { useToast } from "@/components/toast";
import { ArticlePicker } from "@/components/article-picker";
import { contentFormatLabels, contentStatusLabels, formatDateTime } from "@/lib/labels";
import {
  Badge,
  Button,
  Card,
  Dialog,
  ErrorState,
  Field,
  Input,
  Select,
  Spinner,
  Textarea,
  type BadgeTone,
} from "@/components/ui";
import type { Content, ContentStatus, ContentVersion, NotionStatus } from "@/lib/types";

const statusTones: Record<ContentStatus, BadgeTone> = {
  draft: "neutral",
  review: "amber",
  published: "green",
};

export default function ContentEditorPage() {
  const { contentId } = useParams<{ contentId: string }>();
  const { agencyId, canEdit } = useAgency();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const content = useQuery({
    queryKey: ["content", agencyId, contentId],
    queryFn: () => api<Content>(`/agencies/${agencyId}/content/${contentId}`),
  });

  const notionStatus = useQuery({
    queryKey: ["notion-status", agencyId],
    queryFn: () => api<NotionStatus>(`/agencies/${agencyId}/notion/status`),
  });

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (content.data && !dirty) {
      setTitle(content.data.title);
      setBody(content.data.body ?? "");
    }
  }, [content.data, dirty]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["content", agencyId] });
    queryClient.invalidateQueries({ queryKey: ["versions", contentId] });
  };

  const save = useMutation({
    mutationFn: () =>
      api<Content>(`/agencies/${agencyId}/content/${contentId}`, {
        method: "PUT",
        body: { title, body },
      }),
    onSuccess: () => {
      setDirty(false);
      invalidate();
      toast("Contenu enregistré");
    },
    onError: (err) => toast(err instanceof Error ? err.message : "Enregistrement impossible", "error"),
  });

  const setStatus = useMutation({
    mutationFn: (status: ContentStatus) =>
      api<Content>(`/agencies/${agencyId}/content/${contentId}/status`, {
        method: "PUT",
        body: { status },
      }),
    onSuccess: (updated) => {
      invalidate();
      toast(`Statut : ${contentStatusLabels[updated.status]}`);
    },
    onError: (err) => toast(err instanceof Error ? err.message : "Changement impossible", "error"),
  });

  const syncNotion = useMutation({
    mutationFn: () => api(`/agencies/${agencyId}/notion/sync/content/${contentId}`, { method: "POST" }),
    onSuccess: () => {
      invalidate();
      toast("Contenu synchronisé vers Notion");
    },
    onError: (err) => toast(err instanceof Error ? err.message : "Sync impossible", "error"),
  });

  /* --- Amélioration IA --- */
  const [improveOpen, setImproveOpen] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [improveArticles, setImproveArticles] = useState<string[]>([]);
  const [improveError, setImproveError] = useState<string | null>(null);

  const improve = useMutation({
    mutationFn: () =>
      api<Content>(`/agencies/${agencyId}/content/${contentId}/improve`, {
        method: "POST",
        body: { instructions, curated_article_ids: improveArticles },
      }),
    onSuccess: (updated) => {
      setDirty(false);
      setTitle(updated.title);
      setBody(updated.body ?? "");
      setImproveOpen(false);
      invalidate();
      toast("Contenu amélioré — nouvelle version créée");
    },
    onError: (err) => setImproveError(err instanceof Error ? err.message : "Amélioration impossible"),
  });

  /* --- Versions --- */
  const [versionsOpen, setVersionsOpen] = useState(false);
  const versions = useQuery({
    queryKey: ["versions", contentId],
    queryFn: () => api<ContentVersion[]>(`/agencies/${agencyId}/content/${contentId}/versions`),
    enabled: versionsOpen,
  });

  const restore = useMutation({
    mutationFn: (versionId: string) =>
      api<Content>(`/agencies/${agencyId}/content/${contentId}/versions/${versionId}/restore`, {
        method: "POST",
      }),
    onSuccess: (updated) => {
      setDirty(false);
      setTitle(updated.title);
      setBody(updated.body ?? "");
      setVersionsOpen(false);
      invalidate();
      toast("Version restaurée");
    },
    onError: (err) => toast(err instanceof Error ? err.message : "Restauration impossible", "error"),
  });

  if (content.isPending) return <Spinner />;
  if (content.isError) {
    return (
      <ErrorState
        message={content.error instanceof Error ? content.error.message : "Contenu introuvable"}
        onRetry={() => content.refetch()}
      />
    );
  }

  const c = content.data;

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/a/${agencyId}/content`}
          className="inline-flex items-center gap-1.5 text-sm text-soft hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Contenus
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={statusTones[c.status]}>{contentStatusLabels[c.status]}</Badge>
          <Badge>{contentFormatLabels[c.format]}</Badge>
          {canEdit && (
            <>
              <Select
                aria-label="Changer le statut"
                className="w-40"
                value={c.status}
                onChange={(e) => setStatus.mutate(e.target.value as ContentStatus)}
                disabled={setStatus.isPending}
              >
                {Object.entries(contentStatusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
              <Button variant="secondary" size="sm" onClick={() => setVersionsOpen(true)}>
                <History className="h-3.5 w-3.5" />
                Versions
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setInstructions("");
                  setImproveArticles([]);
                  setImproveError(null);
                  setImproveOpen(true);
                }}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Améliorer
              </Button>
              {notionStatus.data?.connected && (
                <Button
                  variant="secondary"
                  size="sm"
                  loading={syncNotion.isPending}
                  onClick={() => syncNotion.mutate()}
                >
                  <Send className="h-3.5 w-3.5" />
                  {c.notion_page_id ? "Resynchroniser Notion" : "Envoyer vers Notion"}
                </Button>
              )}
              <Button size="sm" loading={save.isPending} disabled={!dirty} onClick={() => save.mutate()}>
                Enregistrer
              </Button>
            </>
          )}
        </div>
      </div>

      <Card className="p-6">
        {canEdit ? (
          <>
            <Input
              aria-label="Titre du contenu"
              className="mb-4 border-none px-0 font-display !text-2xl focus:outline-none"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setDirty(true);
              }}
            />
            <Textarea
              aria-label="Corps du contenu"
              rows={24}
              className="border-none px-0 font-mono text-[13px] leading-relaxed focus:outline-none"
              value={body}
              placeholder="Rédigez ici, ou générez une première version avec l'IA."
              onChange={(e) => {
                setBody(e.target.value);
                setDirty(true);
              }}
            />
          </>
        ) : (
          <>
            <h1 className="mb-4 font-display text-2xl">{c.title}</h1>
            <div className="whitespace-pre-wrap text-sm leading-relaxed">{c.body ?? ""}</div>
          </>
        )}
      </Card>

      <p className="mt-3 text-xs text-faint">
        Dernière modification : {formatDateTime(c.updated_at)}
        {dirty && <span className="ml-2 text-warn">Modifications non enregistrées</span>}
      </p>

      {/* Dialog amélioration */}
      <Dialog open={improveOpen} onClose={() => setImproveOpen(false)} title="Améliorer avec l'IA" wide>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setImproveError(null);
            improve.mutate();
          }}
          className="space-y-4"
        >
          <Field
            label="Instructions"
            htmlFor="improve-instructions"
            hint="La version actuelle est conservée dans l'historique."
          >
            <Textarea
              id="improve-instructions"
              rows={4}
              required
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Raccourcir l'introduction, ajouter un exemple chiffré, ton plus direct…"
            />
          </Field>
          <Field label="Ancrer dans la veille" hint="Les articles cochés servent de sources pour l'amélioration.">
            <ArticlePicker selected={improveArticles} onChange={setImproveArticles} />
          </Field>
          {improveError && <p className="text-sm text-danger">{improveError}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setImproveOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" loading={improve.isPending}>
              <Sparkles className="h-4 w-4" />
              {improve.isPending ? "Amélioration en cours…" : "Améliorer"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Dialog versions */}
      <Dialog open={versionsOpen} onClose={() => setVersionsOpen(false)} title="Historique des versions" wide>
        {versions.isPending ? (
          <Spinner label="Chargement des versions…" />
        ) : versions.isError ? (
          <ErrorState
            message={versions.error instanceof Error ? versions.error.message : "Chargement impossible"}
            onRetry={() => versions.refetch()}
          />
        ) : versions.data.length === 0 ? (
          <p className="py-6 text-center text-sm text-soft">
            Aucune version archivée. Une version est créée à chaque amélioration IA ou restauration.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {versions.data.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    v{v.version_number} — {v.title}
                  </p>
                  <p className="text-xs text-soft">{formatDateTime(v.created_at)}</p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={restore.isPending}
                  onClick={() => restore.mutate(v.id)}
                >
                  Restaurer
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Dialog>
    </>
  );
}
