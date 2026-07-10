"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, ExternalLink, Link2, Plus, RefreshCw, Search } from "lucide-react";
import { api } from "@/lib/api";
import { useAgency } from "@/lib/agency-context";
import { useToast } from "@/components/toast";
import { formatDate } from "@/lib/labels";
import {
  Badge,
  Button,
  Card,
  Dialog,
  EmptyState,
  ErrorState,
  Field,
  Input,
  PageHeader,
  Select,
  Spinner,
  cn,
} from "@/components/ui";
import type { Article, Feed, Topic } from "@/lib/types";

type Tab = "articles" | "feeds";

export default function CurationPage() {
  const { agencyId, canEdit, isAdmin } = useAgency();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("articles");

  const topics = useQuery({
    queryKey: ["topics", agencyId],
    queryFn: () => api<Topic[]>(`/agencies/${agencyId}/topics`),
  });

  /* ---------- Articles ---------- */
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [feedFilter, setFeedFilter] = useState("");
  const [savedOnly, setSavedOnly] = useState(false);

  const feeds = useQuery({
    queryKey: ["feeds", agencyId],
    queryFn: () => api<Feed[]>(`/agencies/${agencyId}/curation/feeds`),
  });

  const articles = useQuery({
    queryKey: ["articles", agencyId, search, feedFilter, savedOnly],
    queryFn: () =>
      api<Article[]>(`/agencies/${agencyId}/curation/articles`, {
        query: {
          search: search || undefined,
          feed_id: feedFilter || undefined,
          is_saved: savedOnly ? true : undefined,
        },
      }),
  });

  const invalidateArticles = () => queryClient.invalidateQueries({ queryKey: ["articles", agencyId] });

  const saveArticle = useMutation({
    mutationFn: (id: string) => api<Article>(`/agencies/${agencyId}/curation/articles/${id}/save`, { method: "POST" }),
    onSuccess: () => {
      invalidateArticles();
      toast("Article sauvegardé");
    },
    onError: (err) => toast(err instanceof Error ? err.message : "Sauvegarde impossible", "error"),
  });

  const deleteArticle = useMutation({
    mutationFn: (id: string) => api(`/agencies/${agencyId}/curation/articles/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      invalidateArticles();
      toast("Article supprimé");
    },
    onError: (err) => toast(err instanceof Error ? err.message : "Suppression impossible", "error"),
  });

  /* --- Tag article --- */
  const [tagArticle, setTagArticle] = useState<Article | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

  const tag = useMutation({
    mutationFn: () =>
      api<Article>(`/agencies/${agencyId}/curation/articles/${tagArticle!.id}/tag`, {
        method: "POST",
        body: { topic_ids: selectedTopics },
      }),
    onSuccess: () => {
      invalidateArticles();
      setTagArticle(null);
      toast("Piliers associés");
    },
    onError: (err) => toast(err instanceof Error ? err.message : "Association impossible", "error"),
  });

  /* --- Import URL --- */
  const [importOpen, setImportOpen] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importError, setImportError] = useState<string | null>(null);

  const doImport = useMutation({
    mutationFn: () =>
      api<Article>(`/agencies/${agencyId}/curation/articles/import-url`, {
        method: "POST",
        body: { url: importUrl },
      }),
    onSuccess: () => {
      invalidateArticles();
      setImportOpen(false);
      toast("Article importé");
    },
    onError: (err) => setImportError(err instanceof Error ? err.message : "Import impossible"),
  });

  /* ---------- Feeds ---------- */
  const [feedDialogOpen, setFeedDialogOpen] = useState(false);
  const [feedForm, setFeedForm] = useState({ name: "", url: "", topic_id: "", refresh_frequency_hours: 24 });
  const [feedError, setFeedError] = useState<string | null>(null);

  const invalidateFeeds = () => queryClient.invalidateQueries({ queryKey: ["feeds", agencyId] });

  const createFeed = useMutation({
    mutationFn: () =>
      api<Feed>(`/agencies/${agencyId}/curation/feeds`, {
        method: "POST",
        body: {
          name: feedForm.name,
          url: feedForm.url,
          topic_id: feedForm.topic_id || null,
          refresh_frequency_hours: feedForm.refresh_frequency_hours,
        },
      }),
    onSuccess: () => {
      invalidateFeeds();
      setFeedDialogOpen(false);
      toast("Flux ajouté");
    },
    onError: (err) => setFeedError(err instanceof Error ? err.message : "Ajout impossible"),
  });

  const refreshFeed = useMutation({
    mutationFn: (id: string) => api<Article[]>(`/agencies/${agencyId}/curation/feeds/${id}/refresh`, { method: "POST" }),
    onSuccess: (fetched) => {
      invalidateFeeds();
      invalidateArticles();
      toast(`${fetched.length} nouvel${fetched.length > 1 ? "s" : ""} article${fetched.length > 1 ? "s" : ""}`);
    },
    onError: (err) => toast(err instanceof Error ? err.message : "Rafraîchissement impossible", "error"),
  });

  const refreshAll = useMutation({
    mutationFn: () => api(`/agencies/${agencyId}/curation/feeds/refresh-all`, { method: "POST" }),
    onSuccess: () => {
      invalidateFeeds();
      invalidateArticles();
      toast("Tous les flux ont été rafraîchis");
    },
    onError: (err) => toast(err instanceof Error ? err.message : "Rafraîchissement impossible", "error"),
  });

  const deleteFeed = useMutation({
    mutationFn: (id: string) => api(`/agencies/${agencyId}/curation/feeds/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      invalidateFeeds();
      toast("Flux supprimé");
    },
    onError: (err) => toast(err instanceof Error ? err.message : "Suppression impossible", "error"),
  });

  const feedName = (id: string | null) => feeds.data?.find((f) => f.id === id)?.name ?? "Import manuel";

  return (
    <>
      <PageHeader
        title="Curation"
        description="Votre veille : flux RSS, imports et articles à transformer en contenus."
        actions={
          canEdit && (
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  setImportUrl("");
                  setImportError(null);
                  setImportOpen(true);
                }}
              >
                <Link2 className="h-4 w-4" />
                Importer une URL
              </Button>
              <Button
                onClick={() => {
                  setFeedForm({ name: "", url: "", topic_id: "", refresh_frequency_hours: 24 });
                  setFeedError(null);
                  setFeedDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Ajouter un flux
              </Button>
            </>
          )
        }
      />

      <div className="mb-5 flex gap-1 border-b border-line">
        {(
          [
            ["articles", "Articles"],
            ["feeds", "Flux RSS"],
          ] as [Tab, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm transition-colors cursor-pointer",
              tab === value
                ? "border-accent font-medium text-accent-strong"
                : "border-transparent text-soft hover:text-ink",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "articles" && (
        <>
          <form
            className="mb-4 flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(searchInput);
            }}
          >
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-faint" />
              <Input
                aria-label="Rechercher un article"
                className="w-64 pl-8"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Rechercher…"
              />
            </div>
            <Select aria-label="Filtrer par flux" className="w-52" value={feedFilter} onChange={(e) => setFeedFilter(e.target.value)}>
              <option value="">Toutes les sources</option>
              {feeds.data?.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </Select>
            <Button
              type="button"
              variant={savedOnly ? "primary" : "secondary"}
              onClick={() => setSavedOnly(!savedOnly)}
            >
              <Bookmark className="h-4 w-4" />
              Sauvegardés
            </Button>
          </form>

          {articles.isPending ? (
            <Spinner />
          ) : articles.isError ? (
            <ErrorState
              message={articles.error instanceof Error ? articles.error.message : "Chargement impossible"}
              onRetry={() => articles.refetch()}
            />
          ) : articles.data.length === 0 ? (
            <EmptyState
              title="Aucun article"
              description={
                search || feedFilter || savedOnly
                  ? "Aucun article ne correspond à ces critères."
                  : "Ajoutez un flux RSS ou importez une URL pour alimenter votre veille."
              }
            />
          ) : (
            <div className="space-y-3">
              {articles.data.map((a) => (
                <Card key={a.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <a
                        href={a.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-medium hover:text-accent-strong"
                      >
                        {a.title}
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-faint" />
                      </a>
                      {a.summary && <p className="mt-1 line-clamp-2 text-[13px] text-soft">{a.summary}</p>}
                      <p className="mt-1.5 text-xs text-faint">
                        {feedName(a.feed_id)}
                        {a.author && ` · ${a.author}`}
                        {` · ${formatDate(a.published_at ?? a.created_at)}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {a.is_used && <Badge tone="blue">Utilisé</Badge>}
                      {a.is_saved && <Badge tone="green">Sauvegardé</Badge>}
                      {canEdit && (
                        <>
                          {!a.is_saved && (
                            <Button variant="ghost" size="sm" onClick={() => saveArticle.mutate(a.id)}>
                              <Bookmark className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setTagArticle(a);
                              setSelectedTopics([]);
                            }}
                          >
                            Taguer
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm(`Supprimer « ${a.title} » ?`)) deleteArticle.mutate(a.id);
                            }}
                          >
                            Supprimer
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "feeds" && (
        <>
          {canEdit && feeds.data && feeds.data.length > 0 && (
            <div className="mb-4 flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                loading={refreshAll.isPending}
                onClick={() => refreshAll.mutate()}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Tout rafraîchir
              </Button>
            </div>
          )}
          {feeds.isPending ? (
            <Spinner />
          ) : feeds.isError ? (
            <ErrorState
              message={feeds.error instanceof Error ? feeds.error.message : "Chargement impossible"}
              onRetry={() => feeds.refetch()}
            />
          ) : feeds.data.length === 0 ? (
            <EmptyState
              title="Aucun flux RSS"
              description="Ajoutez les blogs et médias de référence de vos clients : les articles arriveront ici automatiquement."
              action={
                canEdit && (
                  <Button onClick={() => setFeedDialogOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Ajouter un flux
                  </Button>
                )
              }
            />
          ) : (
            <div className="space-y-3">
              {feeds.data.map((f) => (
                <Card key={f.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{f.name}</p>
                    <p className="truncate text-xs text-faint">{f.url}</p>
                    <p className="mt-1 text-xs text-soft">
                      Rafraîchi toutes les {f.refresh_frequency_hours} h · Dernier passage :{" "}
                      {f.last_fetched_at ? formatDate(f.last_fetched_at) : "jamais"}
                    </p>
                  </div>
                  {canEdit && (
                    <div className="flex shrink-0 gap-1.5">
                      <Button
                        variant="secondary"
                        size="sm"
                        loading={refreshFeed.isPending}
                        onClick={() => refreshFeed.mutate(f.id)}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Rafraîchir
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Supprimer le flux « ${f.name} » ?`)) deleteFeed.mutate(f.id);
                          }}
                        >
                          Supprimer
                        </Button>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Dialog import URL */}
      <Dialog open={importOpen} onClose={() => setImportOpen(false)} title="Importer une URL">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setImportError(null);
            doImport.mutate();
          }}
          className="space-y-4"
        >
          <Field label="URL de l'article" htmlFor="import-url">
            <Input
              id="import-url"
              type="url"
              required
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              placeholder="https://exemple.com/article"
            />
          </Field>
          {importError && <p className="text-sm text-danger">{importError}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setImportOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" loading={doImport.isPending}>
              Importer
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Dialog nouveau flux */}
      <Dialog open={feedDialogOpen} onClose={() => setFeedDialogOpen(false)} title="Ajouter un flux RSS">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setFeedError(null);
            createFeed.mutate();
          }}
          className="space-y-4"
        >
          <Field label="Nom" htmlFor="feed-name">
            <Input
              id="feed-name"
              required
              value={feedForm.name}
              onChange={(e) => setFeedForm({ ...feedForm, name: e.target.value })}
              placeholder="Blog HubSpot"
            />
          </Field>
          <Field label="URL du flux" htmlFor="feed-url">
            <Input
              id="feed-url"
              type="url"
              required
              value={feedForm.url}
              onChange={(e) => setFeedForm({ ...feedForm, url: e.target.value })}
              placeholder="https://exemple.com/rss.xml"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Pilier associé" htmlFor="feed-topic">
              <Select
                id="feed-topic"
                value={feedForm.topic_id}
                onChange={(e) => setFeedForm({ ...feedForm, topic_id: e.target.value })}
              >
                <option value="">Aucun</option>
                {topics.data?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Fréquence (heures)" htmlFor="feed-freq">
              <Input
                id="feed-freq"
                type="number"
                min={1}
                value={feedForm.refresh_frequency_hours}
                onChange={(e) => setFeedForm({ ...feedForm, refresh_frequency_hours: Number(e.target.value) })}
              />
            </Field>
          </div>
          {feedError && <p className="text-sm text-danger">{feedError}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setFeedDialogOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" loading={createFeed.isPending}>
              Ajouter le flux
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Dialog tag */}
      <Dialog open={tagArticle !== null} onClose={() => setTagArticle(null)} title="Associer à des piliers">
        {topics.data && topics.data.length === 0 ? (
          <p className="text-sm text-soft">Créez d&apos;abord un pilier éditorial.</p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              tag.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              {topics.data?.map((t) => (
                <label key={t.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-panel">
                  <input
                    type="checkbox"
                    className="accent-[#1e7a4a]"
                    checked={selectedTopics.includes(t.id)}
                    onChange={(e) =>
                      setSelectedTopics((prev) =>
                        e.target.checked ? [...prev, t.id] : prev.filter((id) => id !== t.id),
                      )
                    }
                  />
                  <span className="text-sm">{t.name}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="secondary" onClick={() => setTagArticle(null)}>
                Annuler
              </Button>
              <Button type="submit" loading={tag.isPending} disabled={selectedTopics.length === 0}>
                Associer
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}
