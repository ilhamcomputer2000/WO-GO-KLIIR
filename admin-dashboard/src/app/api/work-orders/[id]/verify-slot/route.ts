export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { verifySlot } from "@/lib/store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { mitraId, action, rejectedPhotos, rejectionReason } = body as {
    mitraId: string;
    action: "approve" | "reject";
    rejectedPhotos?: ("before" | "after")[];
    rejectionReason?: string;
  };

  if (!mitraId || !action || !["approve", "reject"].includes(action)) {
    return NextResponse.json(
      { error: "mitraId dan action (approve|reject) wajib" },
      { status: 400 }
    );
  }

  if (action === "reject") {
    if (!rejectedPhotos || rejectedPhotos.length === 0) {
      return NextResponse.json(
        { error: "Pilih minimal 1 foto yang ditolak (before/after)" },
        { status: 400 }
      );
    }
    const validTypes = ["before", "after"];
    if (!rejectedPhotos.every((t) => validTypes.includes(t))) {
      return NextResponse.json(
        { error: "rejectedPhotos harus berisi 'before' dan/atau 'after'" },
        { status: 400 }
      );
    }
  }

  const result = await verifySlot(id, mitraId, action, rejectedPhotos, rejectionReason);
  if (!result.success)
    return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json({
    message:
      action === "approve"
        ? "Pekerjaan disetujui — siap upload bukti transfer"
        : `${rejectedPhotos?.length === 1 ? "Foto " + rejectedPhotos[0] : "Semua foto"} ditolak — mitra diminta upload ulang`,
    workOrder: result.workOrder,
    slot: result.slot,
    payout: result.payout,
  });
}
