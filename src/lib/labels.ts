import type { ContentFormat, ContentStatus, IdeaStatus, MemberRole } from "./types";

export const ideaStatusLabels: Record<IdeaStatus, string> = {
  pending: "En attente",
  approved: "Approuvée",
  rejected: "Rejetée",
  used: "Utilisée",
};

export const contentStatusLabels: Record<ContentStatus, string> = {
  draft: "Brouillon",
  review: "Relecture",
  published: "Publié",
};

export const contentFormatLabels: Record<ContentFormat, string> = {
  blog_post: "Article de blog",
  social_post: "Post social",
  newsletter: "Newsletter",
  video_script: "Script vidéo",
  podcast_outline: "Plan de podcast",
  infographic: "Infographie",
  other: "Autre",
};

export const roleLabels: Record<MemberRole, string> = {
  admin: "Admin",
  collaborator: "Collaborateur",
  viewer: "Lecteur",
};

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}
