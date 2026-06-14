import { NextResponse } from "next/server";
import { uploadProof } from "@/lib/store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: woId } = await params;

  try {
    const body = await request.json();
    const { mitraId, base64, mimeType, proofType, remark } = body as {
      mitraId?: string;
      base64?: string;
      mimeType?: string;
      proofType?: "before" | "after";
      remark?: string;
    };

    if (!mitraId || !base64 || !mimeType || !proofType) {
      return NextResponse.json(
        { error: "mitraId, base64, mimeType, dan proofType wajib diisi" },
        { status: 400 }
      );
    }

    if (!["before", "after"].includes(proofType)) {
      return NextResponse.json(
        { error: "proofType harus 'before' atau 'after'" },
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

    const result = await uploadProof(woId, mitraId, buffer, mimeType, proofType, remark);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      message: proofType === "before"
        ? "Foto sebelum pekerjaan berhasil diunggah"
        : "Foto setelah pekerjaan berhasil diunggah",
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
