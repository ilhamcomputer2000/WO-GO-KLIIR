import { NextResponse } from "next/server";
import {
  addWorkOrder,
  addWorkOrdersBatch,
  getAvailableWorkOrders,
  getWorkOrders,
} from "@/lib/store";
import type { WorkOrder } from "@/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const available = searchParams.get("available") === "true";
  const workOrders = available
    ? await getAvailableWorkOrders()
    : await getWorkOrders();
  return NextResponse.json({ workOrders });
}

export async function POST(request: Request) {
  const body = await request.json();

  if (Array.isArray(body.workOrders)) {
    const result = await addWorkOrdersBatch(
      body.workOrders as Omit<WorkOrder, "id" | "createdAt" | "progress">[]
    );
    return NextResponse.json(result);
  }

  const result = await addWorkOrder(
    body as Omit<WorkOrder, "id" | "createdAt" | "progress">
  );
  if (!result.success)
    return NextResponse.json({ error: "Gagal membuat WO" }, { status: 400 });
  return NextResponse.json({ workOrder: result.workOrder });
}
