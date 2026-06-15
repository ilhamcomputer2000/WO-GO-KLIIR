export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { updateMitraPhoto } from "@/lib/store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json() as { base64?: string; mimeType?: string };
    const { base64, mimeType = "image/jpeg" } = body;

    if (!base64) {
      return NextResponse.json({ error: "Data gambar tidak ada" }, { status: 400 });
    }

    const buffer = Buffer.from(base64, "base64");
    const result = await updateMitraPhoto(id, buffer, mimeType);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      profilePhotoUrl: result.profilePhotoUrl,
      mitra: result.mitra,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload foto profil gagal" },
      { status: 500 }
    );
  }
}
