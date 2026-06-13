import { NextResponse } from "next/server";
import { deleteMitra, updateMitraStatus } from "@/lib/store";
import type { MitraStatus } from "@/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { status } = body as { status: MitraStatus };

  const result = await updateMitraStatus(id, status);
  if (!result.success)
    return NextResponse.json({ error: result.error }, { status: 404 });
  return NextResponse.json({ mitra: result.mitra });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await deleteMitra(id);
  if (!result.success)
    return NextResponse.json({ error: result.error }, { status: 404 });
  return NextResponse.json({ message: "Mitra dihapus" });
}
