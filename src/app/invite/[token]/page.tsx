"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { api, agencyStore } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { AuthCard } from "@/components/auth-card";
import { Button } from "@/components/ui";

function InviteContent() {
  const { token } = useParams<{ token: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading } = useAuth();
  // l'admin peut partager un lien incluant ?agency=<id> pour une redirection directe
  const agencyParam = searchParams.get("agency");

  const [state, setState] = useState<"idle" | "accepting" | "accepted">("idle");
  const [error, setError] = useState<string | null>(null);

  const accept = async () => {
    setError(null);
    setState("accepting");
    try {
      await api(`/invitations/${token}/accept`, { method: "POST" });
      if (agencyParam) {
        agencyStore.set(agencyParam);
        router.push(`/a/${agencyParam}/dashboard`);
        return;
      }
      setState("accepted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invitation invalide ou expirée");
      setState("idle");
    }
  };

  if (loading) return null;

  if (!user) {
    const next = encodeURIComponent(`/invite/${token}${agencyParam ? `?agency=${agencyParam}` : ""}`);
    return (
      <AuthCard
        title="Rejoindre une équipe"
        subtitle="Connectez-vous ou créez un compte pour accepter cette invitation."
      >
        <div className="space-y-2">
          <Link
            href={`/login?next=${next}`}
            className="block rounded-md bg-accent px-4 py-2 text-center text-sm font-medium text-white hover:bg-accent-strong"
          >
            Se connecter
          </Link>
          <Link
            href={`/signup`}
            className="block rounded-md border border-line bg-surface px-4 py-2 text-center text-sm text-ink hover:bg-panel"
          >
            Créer un compte puis revenir sur ce lien
          </Link>
        </div>
      </AuthCard>
    );
  }

  if (state === "accepted") {
    return (
      <AuthCard
        title="Invitation acceptée"
        subtitle="Vous faites maintenant partie de l'équipe."
      >
        <p className="text-sm text-soft">
          Ouvrez le lien du workspace partagé par votre équipe pour accéder à l&apos;espace de
          l&apos;agence.
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Rejoindre une équipe" subtitle="Acceptez l'invitation pour accéder au workspace de l'agence.">
      <div className="space-y-3">
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button onClick={accept} loading={state === "accepting"} className="w-full">
          Accepter l&apos;invitation
        </Button>
      </div>
    </AuthCard>
  );
}

export default function InvitePage() {
  return (
    <Suspense>
      <InviteContent />
    </Suspense>
  );
}
