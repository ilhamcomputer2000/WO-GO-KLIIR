import { NextResponse } from "next/server";
import { getMitraWorkOrders } from "@/lib/store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const workOrders = await getMitraWorkOrders(id);
  return NextResponse.json({ workOrders });
}
