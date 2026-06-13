import { NextResponse } from "next/server";
import { deleteWorkOrder, getWorkOrderById } from "@/lib/store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const workOrder = await getWorkOrderById(id);
  if (!workOrder)
    return NextResponse.json(
      { error: "Work Order tidak ditemukan" },
      { status: 404 }
    );
  return NextResponse.json({ workOrder });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const wo = await getWorkOrderById(id);
  if (!wo)
    return NextResponse.json(
      { error: "Work Order tidak ditemukan" },
      { status: 404 }
    );
  if (wo.status === "in_progress") {
    return NextResponse.json(
      { error: "Tidak bisa menghapus WO yang sedang dikerjakan mitra" },
      { status: 400 }
    );
  }
  const result = await deleteWorkOrder(id);
  if (!result.success)
    return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ message: "Work Order berhasil dihapus" });
}
