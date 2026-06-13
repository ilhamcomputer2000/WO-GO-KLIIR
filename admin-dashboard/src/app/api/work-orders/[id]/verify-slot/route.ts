import { NextResponse } from "next/server";
import { verifySlot } from "@/lib/store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { mitraId, action } = body as {
    mitraId: string;
    action: "approve" | "reject";
  };

  if (!mitraId || !action || !["approve", "reject"].includes(action)) {
    return NextResponse.json(
      { error: "mitraId dan action (approve|reject) wajib" },
      { status: 400 }
    );
  }

  const result = await verifySlot(id, mitraId, action);
  if (!result.success)
    return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json({
    message:
      action === "approve"
        ? "Pekerjaan disetujui — siap upload bukti transfer"
        : "Pekerjaan ditolak — mitra diminta perbaiki",
    workOrder: result.workOrder,
    slot: result.slot,
    payout: result.payout,
  });
}
