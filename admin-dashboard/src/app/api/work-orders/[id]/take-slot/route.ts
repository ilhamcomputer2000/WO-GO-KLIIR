export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { takeSlot } from "@/lib/store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { mitraId } = body;

  if (!mitraId) {
    return NextResponse.json({ error: "mitraId wajib" }, { status: 400 });
  }

  const result = await takeSlot(id, mitraId);
  if (!result.success)
    return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json({
    message: "Slot berhasil diambil",
    workOrder: result.workOrder,
    slot: result.slot,
  });
}
