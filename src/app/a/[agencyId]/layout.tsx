"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AgencyProvider } from "@/lib/agency-context";
import { agencyStore } from "@/lib/api";
import { ToastProvider } from "@/components/toast";
import { Shell } from "@/components/shell";
import { Spinner } from "@/components/ui";

export default function AgencyLayout({ children }: { children: React.ReactNode }) {
  const { agencyId } = useParams<{ agencyId: string }>();
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    // mémorise l'agence courante pour les prochaines sessions
    if (agencyId) agencyStore.set(agencyId);
  }, [agencyId]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <AgencyProvider agencyId={agencyId}>
      <ToastProvider>
        <Shell>{children}</Shell>
      </ToastProvider>
    </AgencyProvider>
  );
}
