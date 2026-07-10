"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link2, RefreshCw, Unplug } from "lucide-react";
import { api, tokenStore } from "@/lib/api";
import { useAgency } from "@/lib/agency-context";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/toast";
import {
  Badge,
  Button,
  Card,
  ErrorState,
  Field,
  Input,
  Select,
  Spinner,
} from "@/components/ui";
import type { NotionDatabase, NotionStatus } from "@/lib/types";

export default function NotionSettingsPage() {
  const { agencyId, isAdmin, canEdit } = useAgency();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const status = useQuery({
    queryKey: ["notion-status", agencyId],
    queryFn: () => api<NotionStatus>(`/agencies/${agencyId}/notion/status`),
  });

  const databases = useQuery({
    queryKey: ["notion-databases", agencyId],
    queryFn: () => api<NotionDatabase[]>(`/agencies/${agencyId}/notion/databases`),
    enabled: isAdmin && status.data?.connected === true,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["notion-status", agencyId] });

  const [mapping, setMapping] = useState<{ content: string; calendar: string } | null>(null);

  const saveMapping = useMutation({
    mutationFn: () =>
      api<NotionStatus>(`/agencies/${agencyId}/notion/databases/mapping`, {
        method: "PUT",
        body: {
          content_database_id: mapping?.content || null,
          calendar_database_id: mapping?.calendar || null,
        },
      }),
    onSuccess: () => {
      invalidate();
      setMapping(null);
      toast("Mapping enregistré");
    },
    onError: (err) => toast(err instanceof Error ? err.message : "Enregistrement impossible", "error"),
  });

  const setup = useMutation({
    mutationFn: () => api<NotionStatus>(`/agencies/${agencyId}/notion/databases/setup`, { method: "POST" }),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["notion-databases", agencyId] });
      toast("Databases créées dans Notion");
    },
    onError: (err) => toast(err instanceof Error ? err.message : "Création impossible", "error"),
  });

  const syncAll = useMutation({
    mutationFn: () => api(`/agencies/${agencyId}/notion/sync/all`, { method: "POST" }),
    onSuccess: () => toast("Synchronisation lancée"),
    onError: (err) => toast(err instanceof Error ? err.message : "Sync impossible", "error"),
  });

  const syncCalendar = useMutation({
    mutationFn: () => api(`/agencies/${agencyId}/notion/sync/calendar`, { method: "POST" }),
    onSuccess: () => toast("Calendrier synchronisé"),
    onError: (err) => toast(err instanceof Error ? err.message : "Sync impossible", "error"),
  });

  const connectFromUser = useMutation({
    mutationFn: () => api<NotionStatus>(`/agencies/${agencyId}/notion/connect-from-user`, { method: "POST" }),
    onSuccess: () => {
      invalidate();
      toast("Workspace Notion relié à l'agence");
    },
    onError: (err) => toast(err instanceof Error ? err.message : "Connexion impossible", "error"),
  });

  const [manualToken, setManualToken] = useState("");
  const [manualWorkspace, setManualWorkspace] = useState("");

  const connectManual = useMutation({
    mutationFn: () =>
      api<NotionStatus>(`/agencies/${agencyId}/notion/connect`, {
        method: "POST",
        body: {
          access_token: manualToken,
          workspace_id: manualWorkspace || "internal-integration",
          workspace_name: manualWorkspace || "Intégration interne",
        },
      }),
    onSuccess: () => {
      invalidate();
      setManualToken("");
      toast("Notion connecté via l'intégration interne");
    },
    onError: (err) => toast(err instanceof Error ? err.message : "Connexion impossible", "error"),
  });

  const disconnect = useMutation({
    mutationFn: () => api(`/agencies/${agencyId}/notion/disconnect`, { method: "DELETE" }),
    onSuccess: () => {
      invalidate();
      toast("Notion déconnecté");
    },
    onError: (err) => toast(err instanceof Error ? err.message : "Déconnexion impossible", "error"),
  });

  if (status.isPending) return <Spinner />;
  if (status.isError) {
    return (
      <ErrorState
        message={status.error instanceof Error ? status.error.message : "Chargement impossible"}
        onRetry={() => status.refetch()}
      />
    );
  }

  const s = status.data;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

  if (!s.connected) {
    if (!isAdmin) {
      return (
        <Card className="max-w-lg p-6">
          <h2 className="mb-1 text-sm font-semibold">Notion non connecté</h2>
          <p className="text-[13px] text-soft">Seul un admin peut connecter Notion à l&apos;agence.</p>
        </Card>
      );
    }
    return (
      <div className="max-w-lg space-y-6">
        <Card className="p-6">
          <h2 className="mb-1 text-sm font-semibold">Connecter avec votre compte Notion</h2>
          <p className="mb-4 text-[13px] leading-relaxed text-soft">
            Autorisez ContentFlow sur votre workspace Notion, puis reliez-le à l&apos;agence pour
            pousser contenus et calendrier éditorial vers vos databases.
          </p>
          {user?.notion_workspace_id ? (
            <div className="space-y-3">
              <p className="rounded-md bg-accent-soft px-3 py-2 text-[13px] text-accent-strong">
                Votre compte Notion est autorisé (workspace {user.notion_workspace_id.slice(0, 8)}…).
              </p>
              <Button loading={connectFromUser.isPending} onClick={() => connectFromUser.mutate()}>
                <Link2 className="h-4 w-4" />
                Relier ce workspace à l&apos;agence
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => {
                // le state transporte l'identité du compte connecté à travers l'OAuth,
                // pour rattacher Notion à CE compte (et non en créer un nouveau)
                const token = tokenStore.getAccess();
                window.location.href = `${apiUrl}/auth/notion?state=${encodeURIComponent(token ?? "")}`;
              }}
            >
              Autoriser avec Notion
            </Button>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="mb-1 text-sm font-semibold">Ou via une intégration interne</h2>
          <p className="mb-4 text-[13px] leading-relaxed text-soft">
            Créez une intégration sur{" "}
            <a
              href="https://www.notion.so/my-integrations"
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:underline"
            >
              notion.so/my-integrations
            </a>
            , partagez vos pages avec elle, puis collez son secret ici.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              connectManual.mutate();
            }}
            className="space-y-4"
          >
            <Field label="Secret de l'intégration" htmlFor="notion-token">
              <Input
                id="notion-token"
                type="password"
                required
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="ntn_… ou secret_…"
              />
            </Field>
            <Field label="Nom du workspace" htmlFor="notion-workspace" hint="Optionnel, pour l'affichage.">
              <Input
                id="notion-workspace"
                value={manualWorkspace}
                onChange={(e) => setManualWorkspace(e.target.value)}
                placeholder="Mon workspace"
              />
            </Field>
            <Button type="submit" variant="secondary" loading={connectManual.isPending}>
              Connecter l&apos;intégration
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  const currentContent = mapping?.content ?? s.content_database_id ?? "";
  const currentCalendar = mapping?.calendar ?? s.calendar_database_id ?? "";

  return (
    <div className="max-w-lg space-y-6">
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Workspace connecté</h2>
          <Badge tone="green">Connecté</Badge>
        </div>
        <p className="text-sm">{s.workspace_name ?? s.workspace_id}</p>
        {isAdmin && (
          <Button
            variant="danger"
            size="sm"
            className="mt-4"
            loading={disconnect.isPending}
            onClick={() => {
              if (confirm("Déconnecter Notion ? Les contenus déjà synchronisés restent dans Notion.")) {
                disconnect.mutate();
              }
            }}
          >
            <Unplug className="h-3.5 w-3.5" />
            Déconnecter
          </Button>
        )}
      </Card>

      {isAdmin && (
        <Card className="p-5">
          <h2 className="mb-1 text-sm font-semibold">Databases</h2>
          <p className="mb-4 text-[13px] text-soft">
            Choisissez les databases Notion qui reçoivent vos contenus et votre calendrier, ou créez-les
            automatiquement.
          </p>
          {databases.isPending ? (
            <Spinner label="Chargement des databases…" />
          ) : databases.isError ? (
            <ErrorState
              message={databases.error instanceof Error ? databases.error.message : "Chargement impossible"}
              onRetry={() => databases.refetch()}
            />
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveMapping.mutate();
              }}
              className="space-y-4"
            >
              <Field label="Database contenus" htmlFor="db-content">
                <Select
                  id="db-content"
                  value={currentContent}
                  onChange={(e) =>
                    setMapping({ content: e.target.value, calendar: currentCalendar })
                  }
                >
                  <option value="">Non mappée</option>
                  {databases.data.map((db) => (
                    <option key={db.id} value={db.id}>
                      {db.title}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Database calendrier" htmlFor="db-calendar">
                <Select
                  id="db-calendar"
                  value={currentCalendar}
                  onChange={(e) =>
                    setMapping({ content: currentContent, calendar: e.target.value })
                  }
                >
                  <option value="">Non mappée</option>
                  {databases.data.map((db) => (
                    <option key={db.id} value={db.id}>
                      {db.title}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="flex gap-2">
                <Button type="submit" loading={saveMapping.isPending} disabled={!mapping}>
                  Enregistrer le mapping
                </Button>
                <Button type="button" variant="secondary" loading={setup.isPending} onClick={() => setup.mutate()}>
                  Créer les databases automatiquement
                </Button>
              </div>
            </form>
          )}
        </Card>
      )}

      {canEdit && (
        <Card className="p-5">
          <h2 className="mb-1 text-sm font-semibold">Synchronisation</h2>
          <p className="mb-4 text-[13px] text-soft">
            Poussez l&apos;état actuel du workspace vers Notion. La sync d&apos;un contenu individuel se fait
            depuis sa page.
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              loading={syncCalendar.isPending}
              onClick={() => syncCalendar.mutate()}
            >
              <RefreshCw className="h-4 w-4" />
              Synchroniser le calendrier
            </Button>
            {isAdmin && (
              <Button loading={syncAll.isPending} onClick={() => syncAll.mutate()}>
                <RefreshCw className="h-4 w-4" />
                Tout synchroniser
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
