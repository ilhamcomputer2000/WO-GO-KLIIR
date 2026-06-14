import { NextResponse } from "next/server";
import { deleteWorkOrder, getWorkOrderById, updateWorkOrder } from "@/lib/store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const workOrder = await getWorkOrderById(id);
  if (!workOrder)
    return NextResponse.json({ error: "Work Order tidak ditemukan" }, { status: 404 });
  return NextResponse.json({ workOrder });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const wo = await getWorkOrderById(id);
  if (!wo)
    return NextResponse.json({ error: "Work Order tidak ditemukan" }, { status: 404 });

  const body = await request.json();
  const { title, description, category, location, commission, workDate, startTime, endTime } = body;

  const updated = {
    ...wo,
    ...(title !== undefined && { title }),
    ...(description !== undefined && { description }),
    ...(category !== undefined && { category }),
    ...(location !== undefined && { location }),
    ...(commission !== undefined && { commission: Number(commission) }),
    ...(workDate !== undefined && { workDate }),
    ...(startTime !== undefined && { startTime }),
    ...(endTime !== undefined && { endTime }),
  };

  const result = await updateWorkOrder(updated);
  if (!result.success)
    return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ workOrder: result.workOrder });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const wo = await getWorkOrderById(id);
  if (!wo)
    return NextResponse.json({ error: "Work Order tidak ditemukan" }, { status: 404 });
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
