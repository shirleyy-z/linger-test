import type { Memory } from "@/lib/memories";

export type Collection = {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  invite_code: string;
  cover_emoji: string;
  paper_style: string;
  created_at: string;
  collection_members?: { user_id: string; role: "owner" | "member"; profiles?: { display_name: string; avatar_url: string | null } | null }[];
  collection_memories?: { memory_id: string; added_at: string; memories: Memory }[];
};

export type CollectionEvent = {
  id: string;
  title: string;
  summary: string;
  theme: string;
  suggested_stickers: string[];
  start_date: string | null;
  end_date: string | null;
  event_memories: { memory_id: string }[];
};
