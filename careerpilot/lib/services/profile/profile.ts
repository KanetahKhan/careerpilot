import { createAdminClient } from "@/lib/supabase";

export type ProfileSection = {
  section: string;
  chunks: { position: number; content: string }[];
};

export type CvProfile = {
  document: { fileName: string; createdAt: string } | null;
  sections: ProfileSection[];
  totalChunks: number;
};

export async function getCvProfile(userId: string): Promise<CvProfile> {
  const supabase = createAdminClient();

  const { data: doc } = await supabase
    .from("cv_documents")
    .select("file_name, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: chunks } = await supabase
    .from("cv_chunks")
    .select("section, position, content")
    .eq("user_id", userId)
    .order("position", { ascending: true });

  const rows = (chunks ?? []) as { section: string; position: number; content: string }[];
  const map = new Map<string, { position: number; content: string }[]>();
  for (const c of rows) {
    const arr = map.get(c.section) ?? [];
    arr.push({ position: c.position, content: c.content });
    map.set(c.section, arr);
  }

  return {
    document: doc ? { fileName: doc.file_name, createdAt: doc.created_at } : null,
    sections: [...map.entries()].map(([section, chunks]) => ({ section, chunks })),
    totalChunks: rows.length,
  };
}
