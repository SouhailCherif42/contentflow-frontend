"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { api } from "@/lib/api";
import { useAgency } from "@/lib/agency-context";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/toast";
import { formatDate, initials, roleLabels } from "@/lib/labels";
import {
  Badge,
  Button,
  Card,
  Dialog,
  Field,
  Input,
  Select,
  Table,
  Td,
  Th,
} from "@/components/ui";
import type { Invitation, Member, MemberRole } from "@/lib/types";

export default function MembersPage() {
  const { agencyId, members, isAdmin } = useAgency();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invitations = useQuery({
    queryKey: ["invitations", agencyId],
    queryFn: () => api<Invitation[]>(`/agencies/${agencyId}/invitations`),
    enabled: isAdmin,
  });

  const invalidateMembers = () => queryClient.invalidateQueries({ queryKey: ["members", agencyId] });
  const invalidateInvitations = () => queryClient.invalidateQueries({ queryKey: ["invitations", agencyId] });

  /* --- Invitation --- */
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState<{ email: string; role: MemberRole }>({
    email: "",
    role: "collaborator",
  });
  const [inviteError, setInviteError] = useState<string | null>(null);

  const invite = useMutation({
    mutationFn: () =>
      api<Invitation>(`/agencies/${agencyId}/members/invite`, {
        method: "POST",
        body: inviteForm,
      }),
    onSuccess: () => {
      invalidateInvitations();
      setInviteOpen(false);
      toast("Invitation envoyée");
    },
    onError: (err) => setInviteError(err instanceof Error ? err.message : "Invitation impossible"),
  });

  const cancelInvite = useMutation({
    mutationFn: (id: string) => api(`/agencies/${agencyId}/invitations/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      invalidateInvitations();
      toast("Invitation annulée");
    },
    onError: (err) => toast(err instanceof Error ? err.message : "Annulation impossible", "error"),
  });

  const updateRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: MemberRole }) =>
      api(`/agencies/${agencyId}/members/${userId}/role`, { method: "PUT", body: { role } }),
    onSuccess: () => {
      invalidateMembers();
      toast("Rôle mis à jour");
    },
    onError: (err) => toast(err instanceof Error ? err.message : "Changement impossible", "error"),
  });

  const removeMember = useMutation({
    mutationFn: (userId: string) => api(`/agencies/${agencyId}/members/${userId}`, { method: "DELETE" }),
    onSuccess: () => {
      invalidateMembers();
      toast("Membre retiré");
    },
    onError: (err) => toast(err instanceof Error ? err.message : "Retrait impossible", "error"),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Membres ({members.length})</h2>
        {isAdmin && (
          <Button
            onClick={() => {
              setInviteForm({ email: "", role: "collaborator" });
              setInviteError(null);
              setInviteOpen(true);
            }}
          >
            <UserPlus className="h-4 w-4" />
            Inviter
          </Button>
        )}
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Membre</Th>
            <Th>Rôle</Th>
            <Th>Depuis</Th>
            {isAdmin && <Th className="text-right">Actions</Th>}
          </tr>
        </thead>
        <tbody>
          {members.map((m: Member) => (
            <tr key={m.id}>
              <Td>
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-medium text-accent-strong">
                    {initials(m.full_name)}
                  </span>
                  <div>
                    <p className="font-medium">
                      {m.full_name}
                      {m.user_id === user?.id && <span className="ml-1.5 text-xs text-faint">(vous)</span>}
                    </p>
                    <p className="text-xs text-soft">{m.email}</p>
                  </div>
                </div>
              </Td>
              <Td>
                {isAdmin && m.user_id !== user?.id ? (
                  <Select
                    aria-label={`Rôle de ${m.full_name}`}
                    className="h-8 w-36"
                    value={m.role}
                    onChange={(e) => updateRole.mutate({ userId: m.user_id, role: e.target.value as MemberRole })}
                  >
                    {Object.entries(roleLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Badge tone={m.role === "admin" ? "green" : "neutral"}>{roleLabels[m.role]}</Badge>
                )}
              </Td>
              <Td className="whitespace-nowrap text-soft">{formatDate(m.joined_at)}</Td>
              {isAdmin && (
                <Td>
                  {m.user_id !== user?.id && (
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Retirer ${m.full_name} de l'agence ?`)) removeMember.mutate(m.user_id);
                        }}
                      >
                        Retirer
                      </Button>
                    </div>
                  )}
                </Td>
              )}
            </tr>
          ))}
        </tbody>
      </Table>

      {isAdmin && (
        <>
          <h2 className="text-sm font-semibold">Invitations en attente</h2>
          {invitations.data && invitations.data.length > 0 ? (
            <Table>
              <thead>
                <tr>
                  <Th>Email</Th>
                  <Th>Rôle</Th>
                  <Th>Expire le</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {invitations.data.map((inv) => (
                  <tr key={inv.id}>
                    <Td className="font-medium">{inv.email}</Td>
                    <Td>
                      <Badge>{roleLabels[inv.role]}</Badge>
                    </Td>
                    <Td className="whitespace-nowrap text-soft">{formatDate(inv.expires_at)}</Td>
                    <Td>
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => cancelInvite.mutate(inv.id)}
                        >
                          Annuler
                        </Button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <Card className="p-5 text-center text-[13px] text-soft">
              Aucune invitation en attente. Les invités reçoivent un lien par email et rejoignent avec le
              rôle choisi.
            </Card>
          )}
        </>
      )}

      <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)} title="Inviter un membre">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setInviteError(null);
            invite.mutate();
          }}
          className="space-y-4"
        >
          <Field label="Email" htmlFor="invite-email">
            <Input
              id="invite-email"
              type="email"
              required
              value={inviteForm.email}
              onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
              placeholder="collegue@agence.fr"
            />
          </Field>
          <Field
            label="Rôle"
            htmlFor="invite-role"
            hint="Admin : tout gérer · Collaborateur : créer et modifier · Lecteur : consulter."
          >
            <Select
              id="invite-role"
              value={inviteForm.role}
              onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as MemberRole })}
            >
              {Object.entries(roleLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          {inviteError && <p className="text-sm text-danger">{inviteError}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setInviteOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" loading={invite.isPending}>
              Envoyer l&apos;invitation
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
