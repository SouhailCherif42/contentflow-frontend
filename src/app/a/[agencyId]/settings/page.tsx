"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, agencyStore } from "@/lib/api";
import { useAgency } from "@/lib/agency-context";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/toast";
import { initials } from "@/lib/labels";
import { Button, Card, Field, Input, Textarea } from "@/components/ui";
import type { Agency, User } from "@/lib/types";

export default function AgencySettingsPage() {
  const { agencyId, agency, isAdmin } = useAgency();
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [description, setDescription] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (agency) {
      setName(agency.name);
      setLogoUrl(agency.logo_url ?? "");
      setDescription(agency.description ?? "");
      setWebsiteUrl(agency.website_url ?? "");
    }
  }, [agency]);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name);
      setAvatarUrl(user.avatar_url ?? "");
    }
  }, [user]);

  const saveAgency = useMutation({
    mutationFn: () =>
      api<Agency>(`/agencies/${agencyId}`, {
        method: "PUT",
        body: {
          name,
          logo_url: logoUrl || null,
          description: description || "",
          website_url: websiteUrl || "",
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency", agencyId] });
      queryClient.invalidateQueries({ queryKey: ["my-agencies"] });
      toast("Agence mise à jour");
    },
    onError: (err) => toast(err instanceof Error ? err.message : "Mise à jour impossible", "error"),
  });

  const saveProfile = useMutation({
    mutationFn: () =>
      api<User>("/auth/me", {
        method: "PUT",
        body: { full_name: fullName, avatar_url: avatarUrl || null },
      }),
    onSuccess: async () => {
      await refreshUser();
      toast("Profil mis à jour");
    },
    onError: (err) => toast(err instanceof Error ? err.message : "Mise à jour impossible", "error"),
  });

  const changePassword = useMutation({
    mutationFn: () =>
      api("/auth/change-password", {
        method: "POST",
        body: { current_password: currentPassword || null, new_password: newPassword },
      }),
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordError(null);
      toast("Mot de passe modifié");
    },
    onError: (err) =>
      setPasswordError(err instanceof Error ? err.message : "Modification impossible"),
  });

  const onChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    if (newPassword.length < 8) {
      setPasswordError("Le nouveau mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("La confirmation ne correspond pas au nouveau mot de passe.");
      return;
    }
    changePassword.mutate();
  };

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
          <Field
            label="Description"
            htmlFor="agency-desc"
            hint="Positionnement, spécialités… visible par toute l'équipe."
          >
            <Textarea
              id="agency-desc"
              rows={3}
              disabled={!isAdmin}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Agence spécialisée en content marketing B2B…"
            />
          </Field>
          <Field label="Site web" htmlFor="agency-website" hint="Optionnel.">
            <Input
              id="agency-website"
              type="url"
              disabled={!isAdmin}
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://votre-agence.fr"
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
        <div className="mb-4 flex items-center gap-3">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt="Avatar"
              className="h-12 w-12 rounded-full border border-line object-cover"
            />
          ) : (
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-sm font-medium text-white">
              {user ? initials(user.full_name) : "?"}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">{user?.full_name}</p>
            <p className="truncate text-xs text-soft">{user?.email}</p>
          </div>
        </div>
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
          <Field label="URL de l'avatar" htmlFor="profile-avatar" hint="Optionnel. Image carrée recommandée.">
            <Input
              id="profile-avatar"
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://…/avatar.png"
            />
          </Field>
          <Field label="Email" htmlFor="profile-email" hint="L'email de connexion ne peut pas être modifié.">
            <Input id="profile-email" disabled value={user?.email ?? ""} />
          </Field>
          <Button type="submit" loading={saveProfile.isPending}>
            Enregistrer
          </Button>
        </form>
      </Card>

      <Card className="p-5">
        <h2 className="mb-1 text-sm font-semibold">Mot de passe</h2>
        <p className="mb-4 text-[13px] text-soft">
          Choisissez un mot de passe d&apos;au moins 8 caractères.
        </p>
        <form onSubmit={onChangePassword} className="space-y-4">
          <Field label="Mot de passe actuel" htmlFor="pwd-current">
            <Input
              id="pwd-current"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </Field>
          <Field label="Nouveau mot de passe" htmlFor="pwd-new">
            <Input
              id="pwd-new"
              type="password"
              required
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </Field>
          <Field label="Confirmer le nouveau mot de passe" htmlFor="pwd-confirm">
            <Input
              id="pwd-confirm"
              type="password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </Field>
          {passwordError && <p className="text-sm text-danger">{passwordError}</p>}
          <Button type="submit" loading={changePassword.isPending}>
            Modifier le mot de passe
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
