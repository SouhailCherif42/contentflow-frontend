"use client";

import { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import { useAuth } from "./auth-context";
import type { Agency, Member, MemberRole } from "./types";

interface AgencyState {
  agencyId: string;
  agency: Agency | undefined;
  members: Member[];
  role: MemberRole | undefined;
  /** admin ou collaborator : peut créer / modifier */
  canEdit: boolean;
  isAdmin: boolean;
}

const AgencyContext = createContext<AgencyState | null>(null);

export function AgencyProvider({ agencyId, children }: { agencyId: string; children: React.ReactNode }) {
  const { user } = useAuth();

  const { data: agency } = useQuery({
    queryKey: ["agency", agencyId],
    queryFn: () => api<Agency>(`/agencies/${agencyId}`),
  });

  const { data: members } = useQuery({
    queryKey: ["members", agencyId],
    queryFn: () => api<Member[]>(`/agencies/${agencyId}/members`),
  });

  const role = members?.find((m) => m.user_id === user?.id)?.role;

  return (
    <AgencyContext.Provider
      value={{
        agencyId,
        agency,
        members: members ?? [],
        role,
        canEdit: role === "admin" || role === "collaborator",
        isAdmin: role === "admin",
      }}
    >
      {children}
    </AgencyContext.Provider>
  );
}

export function useAgency(): AgencyState {
  const ctx = useContext(AgencyContext);
  if (!ctx) throw new Error("useAgency doit être utilisé sous <AgencyProvider>");
  return ctx;
}
