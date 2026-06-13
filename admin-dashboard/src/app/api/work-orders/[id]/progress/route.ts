import { NextResponse } from "next/server";
import { updateSlotProgress } from "@/lib/store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { mitraId, progress } = body;

  if (!mitraId || progress === undefined) {
    return NextResponse.json(
      { error: "mitraId dan progress wajib" },
      { status: 400 }
    );
  }

  const result = await updateSlotProgress(id, mitraId, Number(progress));
  if (!result.success)
    return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json({
    message: "Progress diperbarui",
    workOrder: result.workOrder,
    slot: result.slot,
  });
}
