export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import {
  addWorkOrder,
  addWorkOrdersBatch,
  getAvailableWorkOrders,
  getWorkOrders,
} from "@/lib/store";
import type { WorkOrder } from "@/types";
import { isSupabaseConfigured, getSupabaseAdmin } from "@/lib/supabase/admin";

/** Kirim notifikasi ke semua mitra aktif bahwa ada WO baru tersedia */
async function broadcastNewWoNotification(wo: WorkOrder) {
  if (!isSupabaseConfigured()) return;
  try {
    const db = getSupabaseAdmin();
    await db.from("notifications").insert({
      type: "new_wo",
      title: "Work Order Baru Tersedia! 🎉",
      body: `${wo.title} — ${wo.location} · ${wo.requiredCso} slot tersedia`,
      data: { woId: wo.id, woTitle: wo.title, location: wo.location },
      read: false,
      target: "all",
      mitra_id: null,
    });
  } catch (e) {
    // non-fatal — log saja
    console.error("[notification] gagal broadcast WO baru:", e);
  }
}

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
    // broadcast untuk tiap WO yang berhasil dibuat
    if (result.workOrders?.length) {
      for (const wo of result.workOrders) {
        await broadcastNewWoNotification(wo);
      }
    }
    return NextResponse.json(result);
  }

  const result = await addWorkOrder(
    body as Omit<WorkOrder, "id" | "createdAt" | "progress">
  );
  if (!result.success)
    return NextResponse.json({ error: "Gagal membuat WO" }, { status: 400 });

  // broadcast notifikasi ke semua mitra
  if (result.workOrder) {
    await broadcastNewWoNotification(result.workOrder);
  }

  return NextResponse.json({ workOrder: result.workOrder });
}
