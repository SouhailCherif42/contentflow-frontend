"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { useAgency } from "@/lib/agency-context";
import { useToast } from "@/components/toast";
import {
  Button,
  Dialog,
  ErrorState,
  Field,
  Input,
  PageHeader,
  Select,
  Spinner,
  cn,
} from "@/components/ui";
import type { Content, Idea, Schedule } from "@/lib/types";

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function CalendarPage() {
  const { agencyId, canEdit, members } = useAgency();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const monthStart = cursor;
  const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);

  // grille du lundi au dimanche
  const gridStart = new Date(monthStart);
  gridStart.setDate(gridStart.getDate() - ((gridStart.getDay() + 6) % 7));
  const gridEnd = new Date(monthEnd);
  gridEnd.setDate(gridEnd.getDate() + (7 - ((gridEnd.getDay() + 6) % 7) - 1));

  const days = useMemo(() => {
    const list: Date[] = [];
    for (let d = new Date(gridStart); d <= gridEnd; d.setDate(d.getDate() + 1)) {
      list.push(new Date(d));
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor]);

  const schedules = useQuery({
    queryKey: ["calendar", agencyId, toISO(monthStart)],
    queryFn: () =>
      api<Schedule[]>(`/agencies/${agencyId}/calendar`, {
        query: { date_from: toISO(gridStart), date_to: toISO(gridEnd) },
      }),
  });

  const contents = useQuery({
    queryKey: ["content", agencyId, "for-calendar"],
    queryFn: () => api<Content[]>(`/agencies/${agencyId}/content`),
  });

  const ideas = useQuery({
    queryKey: ["ideas", agencyId, "for-calendar"],
    queryFn: () => api<Idea[]>(`/agencies/${agencyId}/ideas`),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["calendar", agencyId] });

  /* --- Création / édition --- */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Schedule | null>(null);
  const [form, setForm] = useState({ kind: "content", item_id: "", assigned_to: "", scheduled_date: "" });
  const [formError, setFormError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () => {
      if (editing) {
        return api<Schedule>(`/agencies/${agencyId}/calendar/schedule/${editing.id}`, {
          method: "PUT",
          body: {
            scheduled_date: form.scheduled_date,
            assigned_to: form.assigned_to || null,
          },
        });
      }
      return api<Schedule>(`/agencies/${agencyId}/calendar/schedule`, {
        method: "POST",
        body: {
          content_id: form.kind === "content" ? form.item_id : null,
          idea_id: form.kind === "idea" ? form.item_id : null,
          assigned_to: form.assigned_to || null,
          scheduled_date: form.scheduled_date,
        },
      });
    },
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
      toast(editing ? "Planification mise à jour" : "Publication planifiée");
    },
    onError: (err) => setFormError(err instanceof Error ? err.message : "Enregistrement impossible"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`/agencies/${agencyId}/calendar/schedule/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
      toast("Planification supprimée");
    },
    onError: (err) => toast(err instanceof Error ? err.message : "Suppression impossible", "error"),
  });

  const openCreate = (date?: Date) => {
    setEditing(null);
    setForm({
      kind: "content",
      item_id: "",
      assigned_to: "",
      scheduled_date: date ? toISO(date) : toISO(new Date()),
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (schedule: Schedule) => {
    setEditing(schedule);
    setForm({
      kind: schedule.content_id ? "content" : "idea",
      item_id: schedule.content_id ?? schedule.idea_id ?? "",
      assigned_to: schedule.assigned_to ?? "",
      scheduled_date: schedule.scheduled_date,
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const itemTitle = (s: Schedule): string => {
    if (s.content_id) return contents.data?.find((c) => c.id === s.content_id)?.title ?? "Contenu";
    if (s.idea_id) return ideas.data?.find((i) => i.id === s.idea_id)?.title ?? "Idée";
    return "Créneau";
  };

  const monthLabel = cursor.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const todayISO = toISO(new Date());

  return (
    <>
      <PageHeader
        title="Calendrier éditorial"
        description="Planifiez les publications et assignez-les à l'équipe."
        actions={
          canEdit && (
            <Button onClick={() => openCreate()}>
              <Plus className="h-4 w-4" />
              Planifier
            </Button>
          )
        }
      />

      <div className="mb-4 flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          aria-label="Mois précédent"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-40 text-center text-sm font-medium capitalize">{monthLabel}</span>
        <Button
          variant="secondary"
          size="sm"
          aria-label="Mois suivant"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const now = new Date();
            setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
          }}
        >
          Aujourd&apos;hui
        </Button>
      </div>

      {schedules.isError ? (
        <ErrorState
          message={schedules.error instanceof Error ? schedules.error.message : "Chargement impossible"}
          onRetry={() => schedules.refetch()}
        />
      ) : schedules.isPending ? (
        <Spinner />
      ) : (
        <div className="overflow-hidden rounded-lg border border-line bg-line">
          <div className="grid grid-cols-7 gap-px">
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
              <div key={d} className="bg-panel px-2 py-1.5 text-center text-xs font-medium uppercase text-soft">
                {d}
              </div>
            ))}
            {days.map((day) => {
              const iso = toISO(day);
              const inMonth = day.getMonth() === cursor.getMonth();
              const daySchedules = schedules.data.filter((s) => s.scheduled_date === iso);
              return (
                <div
                  key={iso}
                  onClick={() => canEdit && openCreate(day)}
                  className={cn(
                    "min-h-24 bg-surface p-1.5",
                    !inMonth && "bg-canvas",
                    canEdit && "cursor-pointer hover:bg-accent-soft/40",
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex h-5 w-5 items-center justify-center rounded-full text-xs",
                      iso === todayISO ? "bg-accent font-medium text-white" : inMonth ? "text-ink" : "text-faint",
                    )}
                  >
                    {day.getDate()}
                  </span>
                  <div className="mt-1 space-y-1">
                    {daySchedules.map((s) => (
                      <button
                        key={s.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (canEdit) openEdit(s);
                        }}
                        className={cn(
                          "block w-full truncate rounded px-1.5 py-0.5 text-left text-xs",
                          s.content_id ? "bg-accent-soft text-accent-strong" : "bg-info-soft text-info",
                          canEdit && "cursor-pointer hover:opacity-80",
                        )}
                        title={itemTitle(s)}
                      >
                        {itemTitle(s)}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-3 flex gap-4 text-xs text-soft">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded bg-accent-soft ring-1 ring-accent/30" /> Contenu
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded bg-info-soft ring-1 ring-info/30" /> Idée
        </span>
      </div>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? "Modifier la planification" : "Planifier une publication"}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setFormError(null);
            save.mutate();
          }}
          className="space-y-4"
        >
          {!editing && (
            <>
              <Field label="Type" htmlFor="sched-kind">
                <Select
                  id="sched-kind"
                  value={form.kind}
                  onChange={(e) => setForm({ ...form, kind: e.target.value, item_id: "" })}
                >
                  <option value="content">Contenu</option>
                  <option value="idea">Idée</option>
                </Select>
              </Field>
              <Field label={form.kind === "content" ? "Contenu" : "Idée"} htmlFor="sched-item">
                <Select
                  id="sched-item"
                  required
                  value={form.item_id}
                  onChange={(e) => setForm({ ...form, item_id: e.target.value })}
                >
                  <option value="">Choisir…</option>
                  {(form.kind === "content" ? contents.data : ideas.data)?.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </Select>
              </Field>
            </>
          )}
          <Field label="Date de publication" htmlFor="sched-date">
            <Input
              id="sched-date"
              type="date"
              required
              value={form.scheduled_date}
              onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })}
            />
          </Field>
          <Field label="Assigner à" htmlFor="sched-assignee">
            <Select
              id="sched-assignee"
              value={form.assigned_to}
              onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
            >
              <option value="">Personne</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.full_name}
                </option>
              ))}
            </Select>
          </Field>
          {formError && <p className="text-sm text-danger">{formError}</p>}
          <div className="flex items-center justify-between pt-1">
            {editing ? (
              <Button
                type="button"
                variant="danger"
                onClick={() => {
                  if (confirm("Supprimer cette planification ?")) remove.mutate(editing.id);
                }}
              >
                Supprimer
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" loading={save.isPending}>
                {editing ? "Enregistrer" : "Planifier"}
              </Button>
            </div>
          </div>
        </form>
      </Dialog>
    </>
  );
}
