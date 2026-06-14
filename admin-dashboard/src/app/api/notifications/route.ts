export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

export type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  read: boolean;
  created_at: string;
  target: "admin" | "mitra" | "all";
  mitra_id: string | null;
};

/** GET /api/notifications?target=admin  atau  ?mitra_id=xxx */
export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ notifications: [] });
  }

  const { searchParams } = new URL(request.url);
  const target = searchParams.get("target");
  const mitraId = searchParams.get("mitra_id");

  const db = getSupabaseAdmin();
  let query = db
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (mitraId) {
    // mobile: notif khusus mitra ini atau broadcast "all"
    query = query.or(`mitra_id.eq.${mitraId},target.eq.all`);
  } else if (target) {
    query = query.or(`target.eq.${target},target.eq.all`);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ notifications: data ?? [] });
}

/** POST /api/notifications  — buat notifikasi baru */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ message: "Supabase tidak dikonfigurasi", skipped: true });
  }

  const body = await request.json() as Partial<NotificationRow>;
  const { type, title, body: notifBody, data, target = "all", mitra_id = null } = body;

  if (!type || !title || !notifBody) {
    return NextResponse.json({ error: "type, title, body wajib diisi" }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const { data: row, error } = await db
    .from("notifications")
    .insert({
      type,
      title,
      body: notifBody,
      data: data ?? null,
      read: false,
      target,
      mitra_id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ notification: row });
}

/** PATCH /api/notifications  — tandai semua sudah dibaca */
export async function PATCH(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ message: "skipped" });
  }

  const { searchParams } = new URL(request.url);
  const target = searchParams.get("target");
  const mitraId = searchParams.get("mitra_id");

  const db = getSupabaseAdmin();
  let query = db.from("notifications").update({ read: true }).eq("read", false);

  if (mitraId) {
    query = query.or(`mitra_id.eq.${mitraId},target.eq.all`);
  } else if (target) {
    query = query.or(`target.eq.${target},target.eq.all`);
  }

  const { error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Semua notifikasi ditandai dibaca" });
}
