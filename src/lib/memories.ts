export const MEMORY_TYPES = [
  { value: "thought", label: "Thought" },
  { value: "diary", label: "Diary entry" },
  { value: "photo", label: "Photo memory" },
  { value: "letter", label: "Letter" },
  { value: "voice", label: "Voice memo" },
  { value: "video", label: "Video" }
] as const;

export type MemoryType = (typeof MEMORY_TYPES)[number]["value"];

export type MemoryMedia = {
  id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  signed_url?: string | null;
};

export type Memory = {
  id: string;
  title: string;
  body: string;
  memory_type: MemoryType;
  occurred_at: string;
  reminder_at: string | null;
  reminder_notified_at?: string | null;
  letter_recipient?: string | null;
  letter_signoff?: string | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
  canvas_x?: number | null;
  canvas_y?: number | null;
  canvas_width?: number | null;
  canvas_rotation?: number | null;
  canvas_z?: number | null;
  paper_style?: string | null;
  sticker?: string | null;
  memory_media: MemoryMedia[];
};

export function formatMemoryDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${value}T00:00:00Z`));
}

export function monthKey(value: string) {
  return value.slice(0, 7);
}

export function formatMonth(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "long",
    timeZone: "UTC"
  }).format(new Date(`${value}-01T00:00:00Z`));
}
