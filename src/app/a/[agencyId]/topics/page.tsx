"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import { useAgency } from "@/lib/agency-context";
import { useToast } from "@/components/toast";
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
  Spinner,
  Textarea,
} from "@/components/ui";
import type { Topic } from "@/lib/types";

interface TopicForm {
  name: string;
  description: string;
  keywords: string;
}

const emptyForm: TopicForm = { name: "", description: "", keywords: "" };

export default function TopicsPage() {
  const { agencyId, canEdit, isAdmin } = useAgency();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Topic | null>(null);
  const [form, setForm] = useState<TopicForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const topics = useQuery({
    queryKey: ["topics", agencyId],
    queryFn: () => api<Topic[]>(`/agencies/${agencyId}/topics`),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["topics", agencyId] });

  const save = useMutation({
    mutationFn: (payload: { name: string; description: string | null; keywords: string[] }) =>
      editing
        ? api<Topic>(`/agencies/${agencyId}/topics/${editing.id}`, { method: "PUT", body: payload })
        : api<Topic>(`/agencies/${agencyId}/topics`, { method: "POST", body: payload }),
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
      toast(editing ? "Pilier mis à jour" : "Pilier créé");
    },
    onError: (err) => setFormError(err instanceof Error ? err.message : "Enregistrement impossible"),
  });

  const remove = useMutation({
    mutationFn: (topicId: string) => api(`/agencies/${agencyId}/topics/${topicId}`, { method: "DELETE" }),
    onSuccess: () => {
      invalidate();
      // la suppression d'un pilier emporte idées, contenus, veille et calendrier liés
      queryClient.invalidateQueries({ queryKey: ["ideas", agencyId] });
      queryClient.invalidateQueries({ queryKey: ["content", agencyId] });
      queryClient.invalidateQueries({ queryKey: ["feeds", agencyId] });
      queryClient.invalidateQueries({ queryKey: ["articles", agencyId] });
      queryClient.invalidateQueries({ queryKey: ["calendar", agencyId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", agencyId] });
      toast("Pilier supprimé, ainsi que ses éléments liés");
    },
    onError: (err) => toast(err instanceof Error ? err.message : "Suppression impossible", "error"),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (topic: Topic) => {
    setEditing(topic);
    setForm({
      name: topic.name,
      description: topic.description ?? "",
      keywords: topic.keywords.join(", "),
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    save.mutate({
      name: form.name,
      description: form.description || null,
      keywords: form.keywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean),
    });
  };

  return (
    <>
      <PageHeader
        title="Piliers éditoriaux"
        description="Les thèmes qui structurent votre ligne éditoriale. Idées, contenus et veille s'y rattachent."
        actions={
          canEdit && (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Nouveau pilier
            </Button>
          )
        }
      />

      {topics.isPending ? (
        <Spinner />
      ) : topics.isError ? (
        <ErrorState
          message={topics.error instanceof Error ? topics.error.message : "Chargement impossible"}
          onRetry={() => topics.refetch()}
        />
      ) : topics.data.length === 0 ? (
        <EmptyState
          title="Aucun pilier éditorial"
          description="Commencez par définir vos grands thèmes : ils serviront de base à la génération d'idées et au classement de la veille."
          action={canEdit && <Button onClick={openCreate}>Créer le premier pilier</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {topics.data.map((topic) => (
            <Card key={topic.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-display text-lg">{topic.name}</h2>
                {canEdit && (
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(topic)}>
                      Modifier
                    </Button>
                    {isAdmin && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          if (
                            confirm(
                              `Supprimer le pilier « ${topic.name} » ?\n\nLes idées, contenus, flux de veille et entrées de calendrier qui lui sont rattachés seront aussi supprimés définitivement.`,
                            )
                          )
                            remove.mutate(topic.id);
                        }}
                      >
                        Supprimer
                      </Button>
                    )}
                  </div>
                )}
              </div>
              {topic.description && (
                <p className="mt-1.5 text-[13px] leading-relaxed text-soft">{topic.description}</p>
              )}
              {topic.keywords.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {topic.keywords.map((kw) => (
                    <Badge key={kw}>{kw}</Badge>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? "Modifier le pilier" : "Nouveau pilier"}
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Nom" htmlFor="topic-name">
            <Input
              id="topic-name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="SEO local, Marque employeur…"
            />
          </Field>
          <Field label="Description" htmlFor="topic-desc">
            <Textarea
              id="topic-desc"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="L'angle et l'audience de ce pilier."
            />
          </Field>
          <Field label="Mots-clés" htmlFor="topic-keywords" hint="Séparés par des virgules.">
            <Input
              id="topic-keywords"
              value={form.keywords}
              onChange={(e) => setForm({ ...form, keywords: e.target.value })}
              placeholder="référencement, Google Business, avis clients"
            />
          </Field>
          {formError && <p className="text-sm text-danger">{formError}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" loading={save.isPending}>
              {editing ? "Enregistrer" : "Créer le pilier"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
