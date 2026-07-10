// Types alignés sur les schémas Pydantic du backend FastAPI.

export type MemberRole = "admin" | "collaborator" | "viewer";
export type IdeaStatus = "pending" | "approved" | "rejected" | "used";
export type IdeaSource = "generated" | "manual";
export type ContentStatus = "draft" | "review" | "published";
export type ContentFormat =
  | "blog_post"
  | "social_post"
  | "newsletter"
  | "video_script"
  | "podcast_outline"
  | "infographic"
  | "other";

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  notion_workspace_id: string | null;
  is_active: boolean;
}

export interface Agency {
  id: string;
  name: string;
  logo_url: string | null;
  created_at: string;
}

export interface MyAgency {
  id: string;
  name: string;
  logo_url: string | null;
  role: MemberRole;
  created_at: string;
}

export interface Member {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: MemberRole;
  joined_at: string;
}

export interface Invitation {
  id: string;
  email: string;
  role: MemberRole;
  expires_at: string;
  created_at: string;
}

export interface Topic {
  id: string;
  agency_id: string;
  name: string;
  description: string | null;
  keywords: string[];
  created_at: string;
}

export interface Idea {
  id: string;
  agency_id: string;
  topic_id: string | null;
  created_by: string | null;
  title: string;
  description: string | null;
  status: IdeaStatus;
  source: IdeaSource;
  created_at: string;
}

export interface DuplicateCheck {
  is_duplicate: boolean;
  similar_idea_id: string | null;
  similarity_score: number;
}

export interface Content {
  id: string;
  agency_id: string;
  topic_id: string | null;
  idea_id: string | null;
  created_by: string | null;
  title: string;
  body: string | null;
  format: ContentFormat;
  status: ContentStatus;
  notion_page_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContentVersion {
  id: string;
  content_id: string;
  version_number: number;
  title: string;
  body: string | null;
  created_at: string;
}

export interface Feed {
  id: string;
  agency_id: string;
  topic_id: string | null;
  name: string;
  url: string;
  refresh_frequency_hours: number;
  last_fetched_at: string | null;
  created_at: string;
}

export interface Article {
  id: string;
  agency_id: string;
  feed_id: string | null;
  title: string;
  url: string;
  summary: string | null;
  author: string | null;
  published_at: string | null;
  is_saved: boolean;
  is_used: boolean;
  created_at: string;
}

export interface Schedule {
  id: string;
  agency_id: string;
  content_id: string | null;
  idea_id: string | null;
  assigned_to: string | null;
  scheduled_date: string;
  notion_page_id: string | null;
  created_at: string;
}

export interface DashboardData {
  ideas: Partial<Record<IdeaStatus, number>>;
  content: Partial<Record<ContentStatus, number>>;
  curation: { feeds: number; articles_this_week: number };
}

export interface NotionStatus {
  connected: boolean;
  workspace_id: string | null;
  workspace_name: string | null;
  content_database_id: string | null;
  calendar_database_id: string | null;
}

export interface NotionDatabase {
  id: string;
  title: string;
  url: string;
}
