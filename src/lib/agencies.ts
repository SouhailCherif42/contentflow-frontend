import { api, agencyStore } from "./api";
import type { MyAgency } from "./types";

export function fetchMyAgencies(): Promise<MyAgency[]> {
  return api<MyAgency[]>("/me/agencies");
}

/**
 * Détermine la route d'atterrissage après connexion :
 * l'agence mémorisée si l'utilisateur en est toujours membre,
 * sinon sa première agence, sinon l'onboarding.
 */
export async function defaultAgencyRoute(): Promise<string> {
  let agencies: MyAgency[] = [];
  try {
    agencies = await fetchMyAgencies();
  } catch {
    // en cas d'erreur réseau, on retombe sur l'agence mémorisée
    const stored = agencyStore.get();
    return stored ? `/a/${stored}/dashboard` : "/onboarding";
  }

  if (agencies.length === 0) {
    agencyStore.clear();
    return "/onboarding";
  }

  const stored = agencyStore.get();
  const target = agencies.find((a) => a.id === stored) ?? agencies[0];
  agencyStore.set(target.id);
  return `/a/${target.id}/dashboard`;
}
