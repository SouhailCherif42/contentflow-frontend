"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, agencyStore } from "@/lib/api";
import { useAgency } from "@/lib/agency-context";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/toast";
import { Button, Card, Field, Input } from "@/components/ui";
import type { Agency, User } from "@/lib/types";

export default function AgencySettingsPage() {
  const { agencyId, agency, isAdmin } = useAgency();
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    if (agency) {
      setName(agency.name);
      setLogoUrl(agency.logo_url ?? "");
    }
  }, [agency]);

  useEffect(() => {
    if (user) setFullName(user.full_name);
  }, [user]);

  const saveAgency = useMutation({
    mutationFn: () =>
      api<Agency>(`/agencies/${agencyId}`, {
        method: "PUT",
        body: { name, logo_url: logoUrl || null },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency", agencyId] });
      toast("Agence mise à jour");
    },
    onError: (err) => toast(err instanceof Error ? err.message : "Mise à jour impossible", "error"),
  });

  const saveProfile = useMutation({
    mutationFn: () => api<User>("/auth/me", { method: "PUT", body: { full_name: fullName } }),
    onSuccess: async () => {
      await refreshUser();
      toast("Profil mis à jour");
    },
    onError: (err) => toast(err instanceof Error ? err.message : "Mise à jour impossible", "error"),
  });

  const deleteAgency = useMutation({
    mutationFn: () => api(`/agencies/${agencyId}`, { method: "DELETE" }),
    onSuccess: () => {
      agencyStore.clear();
      queryClient.clear();
      router.push("/onboarding");
    },
    onError: (err) => toast(err instanceof Error ? err.message : "Suppression impossible", "error"),
  });

  return (
    <div className="max-w-lg space-y-6">
      <Card className="p-5">
        <h2 className="mb-4 text-sm font-semibold">Agence</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveAgency.mutate();
          }}
          className="space-y-4"
        >
          <Field label="Nom de l'agence" htmlFor="agency-name">
            <Input
              id="agency-name"
              required
              disabled={!isAdmin}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field label="URL du logo" htmlFor="agency-logo" hint="Optionnel.">
            <Input
              id="agency-logo"
              type="url"
              disabled={!isAdmin}
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://…/logo.png"
            />
          </Field>
          {isAdmin ? (
            <Button type="submit" loading={saveAgency.isPending}>
              Enregistrer
            </Button>
          ) : (
            <p className="text-xs text-soft">Seul un admin peut modifier l&apos;agence.</p>
          )}
        </form>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 text-sm font-semibold">Mon profil</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveProfile.mutate();
          }}
          className="space-y-4"
        >
          <Field label="Nom complet" htmlFor="profile-name">
            <Input
              id="profile-name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </Field>
          <Field label="Email" htmlFor="profile-email">
            <Input id="profile-email" disabled value={user?.email ?? ""} />
          </Field>
          <Button type="submit" loading={saveProfile.isPending}>
            Enregistrer
          </Button>
        </form>
      </Card>

      {isAdmin && (
        <Card className="border-danger/30 p-5">
          <h2 className="mb-1 text-sm font-semibold text-danger">Zone dangereuse</h2>
          <p className="mb-3 text-[13px] text-soft">
            Supprimer l&apos;agence efface définitivement piliers, idées, contenus, veille et calendrier.
          </p>
          <Button
            variant="danger"
            loading={deleteAgency.isPending}
            onClick={() => {
              if (
                confirm(`Supprimer définitivement l'agence « ${agency?.name} » ? Cette action est irréversible.`)
              ) {
                deleteAgency.mutate();
              }
            }}
          >
            Supprimer l&apos;agence
          </Button>
        </Card>
      )}
    </div>
  );
}
