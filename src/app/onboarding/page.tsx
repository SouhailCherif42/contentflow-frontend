"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, agencyStore } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { AuthCard } from "@/components/auth-card";
import { Button, Field, Input } from "@/components/ui";
import type { Agency } from "@/lib/types";

export default function OnboardingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login?next=/onboarding");
  }, [loading, user, router]);

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

  return (
    <AuthCard
      title="Créer votre agence"
      subtitle="L'agence est votre espace de travail : piliers, idées, contenus et équipe y sont rattachés."
      footer={
        <span>
          Invité par une équipe ? Ouvrez le lien d&apos;invitation reçu par email pour rejoindre son espace.
        </span>
      }
    >
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
