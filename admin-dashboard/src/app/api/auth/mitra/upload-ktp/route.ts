import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import { randomUUID } from "crypto";
import path from "path";
import { isSupabaseConfigured } from "@/lib/supabase/admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { base64, mimeType = "image/jpeg" } = body as {
      base64?: string;
      mimeType?: string;
    };

    if (!base64) {
      return NextResponse.json({ error: "base64 wajib diisi" }, { status: 400 });
    }

    const buffer = Buffer.from(base64, "base64");
    if (buffer.byteLength > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Ukuran file maksimal 5 MB" }, { status: 400 });
    }

    const ext = mimeType.includes("png") ? "png" : "jpg";
    const filename = `${randomUUID()}.${ext}`;

    if (isSupabaseConfigured()) {
      // Upload to Supabase Storage
      const db = getSupabaseAdmin();
      const storagePath = `ktp/${filename}`;
      const { error } = await db.storage
        .from("mitra-documents")
        .upload(storagePath, buffer, { contentType: mimeType, upsert: false });

      if (error) {
        // Fallback to local if storage bucket not set up
        return saveLocally(buffer, filename, ext);
      }

      const { data: urlData } = db.storage
        .from("mitra-documents")
        .getPublicUrl(storagePath);

      return NextResponse.json({ url: urlData.publicUrl });
    } else {
      return saveLocally(buffer, filename, ext);
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload gagal" },
      { status: 500 }
    );
  }
}

async function saveLocally(buffer: Buffer, filename: string, ext: string) {
  const uploadDir = path.join(process.cwd(), "public", "uploads", "ktp");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), buffer);
  const url = `/uploads/ktp/${filename}`;
  return NextResponse.json({ url });
}
