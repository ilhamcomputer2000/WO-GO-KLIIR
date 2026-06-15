import { randomUUID } from "crypto";
import type {
  CompletionProof,
  Mitra,
  MitraStatus,
  PayoutRecord,
  PayoutStatus,
  WorkOrder,
} from "@/types";
import {
  mapMitraRow,
  mapPayoutRow,
  mapProofRow,
  mapWorkOrderRow,
  payoutToDb,
  workOrderToDb,
} from "@/lib/db-mappers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createSlots, getOpenSlotCount } from "@/lib/work-order-utils";
import {
  buildPayoutForSlot,
  checkWoCompletion,
  checkWoVerified,
  generatePayoutId,
  recalcWoProgress,
} from "@/lib/wo-workflow";

function db() {
  return getSupabaseAdmin();
}

async function ensurePayoutOnComplete(wo: WorkOrder, slot: WorkOrder["slots"][0]) {
  if (!slot.mitraId || slot.status !== "completed") return;
  const payouts = await supabaseGetPayouts();
  const exists = payouts.find(
    (p) => p.woId === wo.id && p.slotId === slot.id && p.status !== "rejected"
  );
  if (exists) return;
  slot.verificationStatus = "pending_review";
  const payout = buildPayoutForSlot(wo, slot, generatePayoutId(payouts));
  await db().from("payouts").insert(payoutToDb(payout));
}

async function generateWOId(): Promise<string> {
  const year = new Date().getFullYear();
  const { data } = await db()
    .from("work_orders")
    .select("id")
    .like("id", `WO-${year}-%`);
  const nums = (data ?? [])
    .map((row) => {
      const match = (row.id as string).match(/WO-\d+-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((n) => !isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `WO-${year}-${String(next).padStart(3, "0")}`;
}

async function persistWorkOrder(wo: WorkOrder) {
  const { error } = await db()
    .from("work_orders")
    .update(workOrderToDb(wo))
    .eq("id", wo.id);
  if (error) throw new Error(error.message);
}

export async function supabaseRegisterMitra(data: {
  name: string; email: string; password: string; phone: string;
  address: string; religion: string; birthPlace: string; birthDate: string;
  maritalStatus: string; gender: string; nik: string;
  bankName: string; bankAccountNumber: string; bankAccountName: string;
  ktpImageUrl: string;
}) {
  // Check duplicate email
  const { data: existing } = await db()
    .from("mitra")
    .select("id")
    .ilike("email", data.email)
    .maybeSingle();
  if (existing)
    return { success: false as const, error: "Email sudah terdaftar" };

  const id = `mitra-${Date.now()}`;
  const now = new Date().toISOString().split("T")[0];
  const { data: row, error } = await db()
    .from("mitra")
    .insert({
      id,
      name: data.name,
      email: data.email,
      password: data.password,
      phone: data.phone,
      status: "pending",
      registered_at: now,
      completed_wo: 0,
      total_commission: 0,
      address: data.address,
      religion: data.religion,
      birth_place: data.birthPlace,
      birth_date: data.birthDate,
      marital_status: data.maritalStatus,
      gender: data.gender,
      nik: data.nik,
      bank_name: data.bankName,
      bank_account_number: data.bankAccountNumber,
      bank_account_name: data.bankAccountName,
      ktp_image_url: data.ktpImageUrl,
    })
    .select()
    .single();
  if (error) return { success: false as const, error: error.message };
  return { success: true as const, mitra: mapMitraRow(row) };
}

export async function supabaseGetMitraList() {
  const { data, error } = await db().from("mitra").select("*").order("name");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapMitraRow(row));
}

export async function supabaseGetMitraByEmail(email: string) {
  const { data, error } = await db()
    .from("mitra")
    .select("*")
    .ilike("email", email)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapMitraRow(data) : undefined;
}

export async function supabaseVerifyMitraLogin(email: string, password: string) {
  const { data, error } = await db()
    .from("mitra")
    .select("id, name, email, phone, status, registered_at, completed_wo, total_commission, address, password, nik, religion, birth_place, birth_date, marital_status, gender, ktp_image_url, bank_name, bank_account_number, bank_account_name")
    .ilike("email", email)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const storedPassword = (data as Record<string, unknown>).password as string;
  if (!storedPassword || storedPassword !== password) return null;
  return mapMitraRow(data as Record<string, unknown>);
}

export async function supabaseUpdateMitraStatus(id: string, status: MitraStatus) {
  const { data, error } = await db()
    .from("mitra")
    .update({ status })
    .eq("id", id)
    .select()
    .single();
  if (error || !data)
    return { success: false as const, error: "Mitra tidak ditemukan" };
  return { success: true as const, mitra: mapMitraRow(data) };
}

export async function supabaseDeleteMitra(id: string) {
  const { error } = await db().from("mitra").delete().eq("id", id);
  if (error) return { success: false as const, error: error.message };
  return { success: true as const };
}

export async function supabaseGetMitraById(id: string) {
  const { data, error } = await db().from("mitra").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapMitraRow(data) : undefined;
}

export async function supabaseUpdateMitraPhoto(id: string, file: Buffer, mimeType: string) {
  const ext = mimeType.includes("png") ? "png" : "jpg";
  const storagePath = `${id}/profile-${randomUUID()}.${ext}`;

  const { error: uploadError } = await db()
    .storage.from("mitra-photos")
    .upload(storagePath, file, { contentType: mimeType, upsert: true });
  if (uploadError) return { success: false as const, error: uploadError.message };

  const { data: urlData } = db().storage.from("mitra-photos").getPublicUrl(storagePath);
  const profilePhotoUrl = urlData.publicUrl;

  const { data: row, error } = await db()
    .from("mitra")
    .update({ profile_photo_url: profilePhotoUrl })
    .eq("id", id)
    .select()
    .single();
  if (error || !row) return { success: false as const, error: "Mitra tidak ditemukan" };
  return { success: true as const, profilePhotoUrl, mitra: mapMitraRow(row) };
}

export async function supabaseUpdateMitraProfile(
  id: string,
  data: { name?: string; phone?: string; address?: string }
) {  const updates: Record<string, unknown> = {};
  if (data.name) updates.name = data.name;
  if (data.phone !== undefined) updates.phone = data.phone;
  if (data.address !== undefined) updates.address = data.address;

  const { data: row, error } = await db()
    .from("mitra")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error || !row)
    return { success: false as const, error: "Mitra tidak ditemukan" };
  return { success: true as const, mitra: mapMitraRow(row) };
}

export async function supabaseChangeMitraPassword(
  id: string,
  currentPassword: string,
  newPassword: string
) {
  const { data, error } = await db()
    .from("mitra")
    .select("password")
    .eq("id", id)
    .maybeSingle();
  if (error || !data)
    return { success: false as const, error: "Mitra tidak ditemukan" };
  if ((data as Record<string, string>).password !== currentPassword)
    return { success: false as const, error: "Password lama tidak sesuai" };
  const { error: updErr } = await db()
    .from("mitra")
    .update({ password: newPassword })
    .eq("id", id);
  if (updErr) return { success: false as const, error: updErr.message };
  return { success: true as const };
}

export async function supabaseDeleteWorkOrder(id: string) {
  const { error } = await db().from("work_orders").delete().eq("id", id);
  if (error) return { success: false as const, error: error.message };
  return { success: true as const };
}

export async function supabaseUpdateWorkOrder(wo: WorkOrder) {
  const { error } = await db()
    .from("work_orders")
    .update(workOrderToDb(wo))
    .eq("id", wo.id);
  if (error) return { success: false as const, error: error.message };
  return { success: true as const, workOrder: wo };
}

export async function supabaseGetWorkOrders() {
  const { data, error } = await db()
    .from("work_orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapWorkOrderRow(row));
}

export async function supabaseGetWorkOrderById(id: string) {
  const { data, error } = await db()
    .from("work_orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapWorkOrderRow(data) : undefined;
}

export async function supabaseGetAvailableWorkOrders() {
  const orders = await supabaseGetWorkOrders();
  return orders.filter(
    (wo) =>
      (wo.status === "available" || wo.status === "in_progress") &&
      getOpenSlotCount(wo) > 0
  );
}

export async function supabaseGetMitraWorkOrders(mitraId: string) {
  const orders = await supabaseGetWorkOrders();
  return orders.filter((wo) =>
    wo.slots.some(
      (s) =>
        s.mitraId === mitraId &&
        (s.status === "taken" || s.status === "completed")
    )
  );
}

export async function supabaseAddWorkOrder(
  wo: Omit<WorkOrder, "id" | "createdAt" | "progress">
) {
  const newWO: WorkOrder = {
    ...wo,
    slots: wo.slots?.length ? wo.slots : createSlots(wo.requiredCso),
    id: await generateWOId(),
    createdAt: new Date().toISOString().split("T")[0],
    progress: 0,
  };
  const { error } = await db().from("work_orders").insert(workOrderToDb(newWO));
  if (error) return { success: false as const, error: error.message };
  return { success: true as const, workOrder: newWO };
}

export async function supabaseAddWorkOrdersBatch(
  orders: Omit<WorkOrder, "id" | "createdAt" | "progress">[]
) {
  const created: WorkOrder[] = [];
  for (const wo of orders) {
    const result = await supabaseAddWorkOrder(wo);
    if (result.success) created.push(result.workOrder);
  }
  return { success: true as const, workOrders: created };
}

export async function supabaseTakeSlot(woId: string, mitraId: string) {
  const wo = await supabaseGetWorkOrderById(woId);
  const { data: mitraRow, error: mitraErr } = await db()
    .from("mitra")
    .select("*")
    .eq("id", mitraId)
    .maybeSingle();
  if (mitraErr) return { success: false as const, error: mitraErr.message };
  const mitra = mitraRow ? mapMitraRow(mitraRow) : undefined;

  if (!mitra) return { success: false as const, error: "Mitra tidak ditemukan" };
  if (mitra.status !== "active")
    return { success: false as const, error: "Akun mitra tidak aktif" };
  if (!wo) return { success: false as const, error: "Work Order tidak ditemukan" };
  if (wo.slots.some((s) => s.mitraId === mitraId))
    return { success: false as const, error: "Anda sudah mengambil slot di WO ini" };

  const openSlot = wo.slots.find((s) => s.status === "open");
  if (!openSlot)
    return { success: false as const, error: "Semua slot sudah penuh" };

  openSlot.mitraId = mitraId;
  openSlot.mitraName = mitra.name;
  openSlot.status = "taken";
  openSlot.progress = 0;

  if (wo.status === "available" || wo.status === "pending") wo.status = "in_progress";
  recalcWoProgress(wo);
  await persistWorkOrder(wo);
  return { success: true as const, workOrder: wo, slot: openSlot };
}

export async function supabaseUpdateSlotProgress(
  woId: string,
  mitraId: string,
  progress: number
) {
  const wo = await supabaseGetWorkOrderById(woId);
  if (!wo) return { success: false as const, error: "Work Order tidak ditemukan" };

  const slot = wo.slots.find((s) => s.mitraId === mitraId);
  if (!slot)
    return { success: false as const, error: "Anda belum mengambil slot di WO ini" };

  const clamped = Math.min(100, Math.max(0, Math.round(progress)));
  const wasCompleted = slot.status === "completed";
  slot.progress = clamped;

  if (clamped >= 100 && !wasCompleted) {
    slot.status = "completed";
    const { data: mitraRow } = await db()
      .from("mitra")
      .select("completed_wo")
      .eq("id", mitraId)
      .single();
    if (mitraRow) {
      await db()
        .from("mitra")
        .update({ completed_wo: Number(mitraRow.completed_wo ?? 0) + 1 })
        .eq("id", mitraId);
    }
    await ensurePayoutOnComplete(wo, slot);
  } else if (clamped < 100 && slot.status === "completed") {
    slot.status = "taken";
    slot.verificationStatus = undefined;
    slot.verifiedAt = undefined;
  }

  recalcWoProgress(wo);
  checkWoCompletion(wo);
  if (wo.status !== "completed" && wo.status !== "verified") wo.status = "in_progress";

  await persistWorkOrder(wo);
  return { success: true as const, workOrder: wo, slot };
}

export async function supabaseGetPayouts() {
  const { data, error } = await db()
    .from("payouts")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapPayoutRow(row));
}

export async function supabaseUpdatePayoutStatus(id: string, status: PayoutStatus) {
  const updates: Record<string, unknown> = { status };
  if (status === "paid") updates.paid_at = new Date().toISOString().split("T")[0];

  const { data, error } = await db()
    .from("payouts")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error || !data)
    return { success: false as const, error: "Payout tidak ditemukan" };
  return { success: true as const, payout: mapPayoutRow(data) };
}

export async function supabaseGetProofs() {
  const { data, error } = await db()
    .from("completion_proofs")
    .select("*")
    .order("uploaded_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapProofRow(row));
}

export async function supabaseGetProofsByWo(woId: string) {
  const { data, error } = await db()
    .from("completion_proofs")
    .select("*")
    .eq("wo_id", woId)
    .order("uploaded_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapProofRow(row));
}

export async function supabaseUploadProof(
  woId: string,
  mitraId: string,
  file: Buffer,
  mimeType: string,
  proofType: "before" | "after" = "after",
  remark?: string
) {
  const wo = await supabaseGetWorkOrderById(woId);
  const { data: mitraRow } = await db()
    .from("mitra")
    .select("*")
    .eq("id", mitraId)
    .maybeSingle();
  const mitra = mitraRow ? mapMitraRow(mitraRow) : undefined;

  if (!wo || !mitra)
    return { success: false as const, error: "WO atau mitra tidak ditemukan" };

  const slot = wo.slots.find((s) => s.mitraId === mitraId);
  if (!slot)
    return { success: false as const, error: "Anda belum mengambil slot di WO ini" };

  const ext = mimeType.includes("png") ? "png" : "jpg";
  const storagePath = `${woId}/${mitraId}/${proofType}-${randomUUID()}.${ext}`;

  const { error: uploadError } = await db()
    .storage.from("wo-proofs")
    .upload(storagePath, file, { contentType: mimeType, upsert: false });

  if (uploadError)
    return { success: false as const, error: uploadError.message };

  const { data: urlData } = db().storage.from("wo-proofs").getPublicUrl(storagePath);
  const imageUrl = urlData.publicUrl;

  const proofId = randomUUID();
  const { error: insertError } = await db().from("completion_proofs").insert({
    id: proofId,
    wo_id: wo.id,
    wo_title: wo.title,
    mitra_id: mitra.id,
    mitra_name: mitra.name,
    slot_id: slot.id,
    image_url: imageUrl,
    storage_path: storagePath,
    proof_type: proofType,
    remark: remark ?? null,
  });
  if (insertError) return { success: false as const, error: insertError.message };

  // Update slot fields based on photo type
  if (proofType === "before") {
    slot.beforePhotoUrl = imageUrl;
    slot.beforeRemark = remark;
    slot.progress = 50;
  } else {
    slot.afterPhotoUrl = imageUrl;
    slot.afterRemark = remark;
    slot.progress = 100;
    if (slot.status === "taken") {
      slot.status = "completed";
      const { data: mitraRow2 } = await db()
        .from("mitra")
        .select("completed_wo")
        .eq("id", mitraId)
        .single();
      if (mitraRow2) {
        await db()
          .from("mitra")
          .update({ completed_wo: Number(mitraRow2.completed_wo ?? 0) + 1 })
          .eq("id", mitraId);
      }
      await ensurePayoutOnComplete(wo, slot);
    }
  }

  recalcWoProgress(wo);
  checkWoCompletion(wo);
  if (wo.status !== "completed" && wo.status !== "verified") wo.status = "in_progress";
  await persistWorkOrder(wo);

  const proof: CompletionProof = {
    id: proofId,
    woId: wo.id,
    woTitle: wo.title,
    mitraId: mitra.id,
    mitraName: mitra.name,
    slotId: slot.id,
    imageUrl,
    proofType,
    remark,
    uploadedAt: new Date().toISOString(),
  };

  return { success: true as const, proof, workOrder: wo };
}

export async function supabaseVerifySlot(
  woId: string,
  mitraId: string,
  action: "approve" | "reject"
) {
  const wo = await supabaseGetWorkOrderById(woId);
  if (!wo) return { success: false as const, error: "Work Order tidak ditemukan" };

  const slot = wo.slots.find((s) => s.mitraId === mitraId);
  if (!slot || slot.status !== "completed") {
    return { success: false as const, error: "Slot belum selesai dikerjakan" };
  }

  let payouts = await supabaseGetPayouts();
  let payout = payouts.find(
    (p) => p.woId === woId && p.slotId === slot.id && p.mitraId === mitraId
  );
  if (!payout) {
    if (!slot.verificationStatus) slot.verificationStatus = "pending_review";
    payout = buildPayoutForSlot(wo, slot, generatePayoutId(payouts));
    await db().from("payouts").insert(payoutToDb(payout));
  }

  const now = new Date().toISOString();

  if (action === "approve") {
    slot.verificationStatus = "approved";
    slot.verifiedAt = now;
    payout.status = "approved";
    payout.verifiedAt = now.split("T")[0];
    checkWoVerified(wo);
    await db()
      .from("payouts")
      .update({ status: "approved", verified_at: payout.verifiedAt })
      .eq("id", payout.id);
  } else {
    slot.verificationStatus = "rejected";
    slot.status = "taken";
    slot.progress = 75;
    payout.status = "rejected";
    wo.status = "in_progress";
    checkWoCompletion(wo);
    recalcWoProgress(wo);
    await db().from("payouts").update({ status: "rejected" }).eq("id", payout.id);
  }

  await persistWorkOrder(wo);
  return { success: true as const, workOrder: wo, slot, payout };
}

export async function supabaseUploadTransferProof(
  payoutId: string,
  file: Buffer,
  mimeType: string
) {
  const payouts = await supabaseGetPayouts();
  const payout = payouts.find((p) => p.id === payoutId);
  if (!payout) return { success: false as const, error: "Payout tidak ditemukan" };
  if (payout.status !== "approved") {
    return {
      success: false as const,
      error: "Payout harus disetujui dulu sebelum upload bukti transfer",
    };
  }

  const ext = mimeType.includes("png") ? "png" : "jpg";
  const storagePath = `${payout.woId}/${payout.mitraId}/${randomUUID()}.${ext}`;

  const { error: uploadError } = await db()
    .storage.from("transfer-proofs")
    .upload(storagePath, file, { contentType: mimeType, upsert: false });
  if (uploadError)
    return { success: false as const, error: uploadError.message };

  const { data: urlData } = db()
    .storage.from("transfer-proofs")
    .getPublicUrl(storagePath);
  const imageUrl = urlData.publicUrl;
  const now = new Date().toISOString();

  const { data, error } = await db()
    .from("payouts")
    .update({
      status: "paid",
      paid_at: now.split("T")[0],
      transfer_proof_url: imageUrl,
      transfer_proof_storage_path: storagePath,
      transfer_proof_uploaded_at: now,
    })
    .eq("id", payoutId)
    .select()
    .single();
  if (error || !data)
    return { success: false as const, error: "Gagal update payout" };

  const { data: mitraRow } = await db()
    .from("mitra")
    .select("total_commission")
    .eq("id", payout.mitraId)
    .single();
  if (mitraRow) {
    await db()
      .from("mitra")
      .update({
        total_commission:
          Number(mitraRow.total_commission ?? 0) + payout.amount,
      })
      .eq("id", payout.mitraId);
  }

  return { success: true as const, payout: mapPayoutRow(data) };
}

export async function supabaseGetMitraPayouts(mitraId: string) {
  const { data, error } = await db()
    .from("payouts")
    .select("*")
    .eq("mitra_id", mitraId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapPayoutRow(row));
}

export async function supabaseGetFullState() {
  const [mitra, workOrders, payouts, proofs] = await Promise.all([
    supabaseGetMitraList(),
    supabaseGetWorkOrders(),
    supabaseGetPayouts(),
    supabaseGetProofs(),
  ]);
  return {
    mitra,
    workOrders,
    payouts,
    proofs,
    syncedAt: new Date().toISOString(),
    source: "supabase" as const,
  };
}
