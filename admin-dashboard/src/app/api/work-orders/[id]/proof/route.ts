import { NextResponse } from "next/server";
import { uploadProof } from "@/lib/store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: woId } = await params;

  try {
    const body = await request.json();
    const { mitraId, base64, mimeType } = body as {
      mitraId?: string;
      base64?: string;
      mimeType?: string;
    };

    if (!mitraId || !base64 || !mimeType) {
      return NextResponse.json(
        { error: "mitraId, base64, dan mimeType wajib diisi" },
        { status: 400 }
      );
    }

    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowed.includes(mimeType)) {
      return NextResponse.json(
        { error: "Format file harus JPG, PNG, atau WebP" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(base64, "base64");

    if (buffer.byteLength > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Ukuran file maksimal 5 MB" },
        { status: 400 }
      );
    }

    const result = await uploadProof(woId, mitraId, buffer, mimeType);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      message: "Bukti penyelesaian berhasil diunggah",
      proof: result.proof,
      workOrder: result.workOrder,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload gagal" },
      { status: 500 }
    );
  }
}
