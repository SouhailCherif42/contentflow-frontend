"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { api, agencyStore } from "@/lib/api";
import { fetchMyAgencies } from "@/lib/agencies";
import { useAuth } from "@/lib/auth-context";
import { AuthCard } from "@/components/auth-card";
import { Button, Field, Input } from "@/components/ui";
import { roleLabels } from "@/lib/labels";
import type { Agency, MyInvitation } from "@/lib/types";

export default function OnboardingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login?next=/onboarding");
  }, [loading, user, router]);

  const myAgencies = useQuery({
    queryKey: ["my-agencies"],
    queryFn: fetchMyAgencies,
    enabled: !!user,
  });

  const myInvitations = useQuery({
    queryKey: ["my-invitations"],
    queryFn: () => api<MyInvitation[]>("/me/invitations"),
    enabled: !!user,
  });

  const accept = useMutation({
    mutationFn: (invitation: MyInvitation) =>
      api<{ detail: string; agency_id: string }>(`/invitations/${invitation.token}/accept`, {
        method: "POST",
      }),
    onSuccess: (res) => {
      agencyStore.set(res.agency_id);
      router.push(`/a/${res.agency_id}/dashboard`);
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Invitation invalide ou expirée"),
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      const agency = await api<Agency>("/agencies", { method: "POST", body: { name } });
      agencyStore.set(agency.id);
      router.push(`/a/${agency.id}/dashboard`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création impossible");
      setCreating(false);
    }
  };

  const invitations = myInvitations.data ?? [];
  const hasInvitations = invitations.length > 0;

  return (
    <AuthCard
      title={hasInvitations ? "On vous attend !" : "Créer votre agence"}
      subtitle={
        hasInvitations
          ? "Une équipe vous a invité(e) à rejoindre son espace de travail."
          : "L'agence est votre espace de travail : piliers, idées, contenus et équipe y sont rattachés."
      }
      footer={
        <span>
          Invité par une équipe ? Ouvrez le lien d&apos;invitation reçu par email pour rejoindre son espace.
        </span>
      }
    >
      {hasInvitations && (
        <div className="mb-6 space-y-1.5">
          <p className="text-[13px] font-medium text-ink">Vos invitations</p>
          {invitations.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center justify-between gap-3 rounded-md border border-accent/40 bg-accent-soft/40 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{inv.agency_name}</p>
                <p className="text-xs text-soft">En tant que {roleLabels[inv.role].toLowerCase()}</p>
              </div>
              <Button
                size="sm"
                loading={accept.isPending && accept.variables?.id === inv.id}
                onClick={() => {
                  setError(null);
                  accept.mutate(inv);
                }}
              >
                <UserPlus className="h-3.5 w-3.5" />
                Rejoindre
              </Button>
            </div>
          ))}
          <div className="flex items-center gap-3 pt-2">
            <span className="h-px flex-1 bg-line" />
            <span className="text-xs text-faint">ou créez votre propre agence</span>
            <span className="h-px flex-1 bg-line" />
          </div>
        </div>
      )}

      {myAgencies.data && myAgencies.data.length > 0 && (
        <div className="mb-6 space-y-1.5">
          <p className="text-[13px] font-medium text-ink">Vos agences</p>
          {myAgencies.data.map((a) => (
            <Link
              key={a.id}
              href={`/a/${a.id}/dashboard`}
              onClick={() => agencyStore.set(a.id)}
              className="flex items-center justify-between rounded-md border border-line bg-surface px-3 py-2 text-sm hover:border-accent"
            >
              <span className="truncate font-medium">{a.name}</span>
              <span className="text-xs text-soft">{roleLabels[a.role]}</span>
            </Link>
          ))}
          <div className="flex items-center gap-3 pt-2">
            <span className="h-px flex-1 bg-line" />
            <span className="text-xs text-faint">ou créez-en une nouvelle</span>
            <span className="h-px flex-1 bg-line" />
          </div>
        </div>
      )}
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Nom de l'agence" htmlFor="name">
          <Input
            id="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Studio Nord, Agence Lumen…"
          />
        </Field>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" loading={creating} className="w-full">
          Créer l&apos;agence
        </Button>
      </form>
    </AuthCard>
  );
}
