"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { agencyStore, tokenStore } from "@/lib/api";
import { defaultAgencyRoute } from "@/lib/agencies";
import { useAuth } from "@/lib/auth-context";
import { AuthCard } from "@/components/auth-card";
import { Spinner } from "@/components/ui";

/*
  Point d'atterrissage après l'OAuth Notion : le backend redirige ici avec
  les tokens JWT en fragment d'URL (#access_token=…&refresh_token=…).
*/
export default function NotionCallbackPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [error, setError] = useState(false);
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const params = new URLSearchParams(window.location.hash.slice(1));

    // Cas rattachement : l'utilisateur était déjà connecté, Notion vient d'être lié à son compte
    if (params.get("linked") === "1") {
      window.history.replaceState(null, "", window.location.pathname);
      refreshUser().then(() => {
        const agencyId = agencyStore.get();
        router.replace(agencyId ? `/a/${agencyId}/settings/notion` : "/onboarding");
      });
      return;
    }

    const access = params.get("access_token");
    const refresh = params.get("refresh_token");

    if (!access || !refresh) {
      setError(true);
      return;
    }

    tokenStore.set(access, refresh);
    // efface les tokens de l'URL avant toute navigation
    window.history.replaceState(null, "", window.location.pathname);

    refreshUser()
      .then(() => defaultAgencyRoute())
      .then((route) => router.replace(route));
  }, [refreshUser, router]);

  if (error) {
    return (
      <AuthCard title="Connexion Notion échouée" subtitle="La réponse de Notion est incomplète ou a expiré.">
        <Link href="/login" className="text-sm font-medium text-accent hover:underline">
          Retour à la connexion
        </Link>
      </AuthCard>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner label="Connexion à Notion…" />
    </div>
  );
}
