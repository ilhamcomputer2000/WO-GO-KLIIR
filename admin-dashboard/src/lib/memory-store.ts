import { mkdir, writeFile } from "fs/promises";
import path from "path";
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
  initialMitra,
  initialPayouts,
  initialWorkOrders,
} from "@/lib/mock-data";
import { createSlots, getOpenSlotCount } from "@/lib/work-order-utils";
import {
  buildPayoutForSlot,
  checkWoCompletion,
  checkWoVerified,
  generatePayoutId,
  recalcWoProgress,
} from "@/lib/wo-workflow";

interface MemoryStore {
  mitra: Mitra[];
  workOrders: WorkOrder[];
  payouts: PayoutRecord[];
  proofs: CompletionProof[];
}

const globalStore = globalThis as typeof globalThis & {
  __woMemoryStore?: MemoryStore;
};

function getStore(): MemoryStore {
  if (!globalStore.__woMemoryStore) {
    globalStore.__woMemoryStore = {
      mitra: structuredClone(initialMitra),
      workOrders: structuredClone(initialWorkOrders),
      payouts: structuredClone(initialPayouts),
      proofs: [],
    };
  }
  return globalStore.__woMemoryStore;
}

function generateWOId(existing: WorkOrder[]): string {
  const year = new Date().getFullYear();
  const nums = existing
    .map((wo) => {
      const match = wo.id.match(/WO-\d+-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((n) => !isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `WO-${year}-${String(next).padStart(3, "0")}`;
}

function ensurePayoutOnComplete(
  store: MemoryStore,
  wo: WorkOrder,
  slot: WorkOrder["slots"][0]
) {
  if (!slot.mitraId || slot.status !== "completed") return;
  const exists = store.payouts.find(
    (p) => p.woId === wo.id && p.slotId === slot.id && p.status !== "rejected"
  );
  if (exists) return;
  slot.verificationStatus = "pending_review";
  store.payouts.unshift(
    buildPayoutForSlot(wo, slot, generatePayoutId(store.payouts))
  );
}

export async function memoryGetMitraList() {
  return getStore().mitra;
}

export async function memoryGetMitraByEmail(email: string) {
  return getStore().mitra.find(
    (m) => m.email.toLowerCase() === email.toLowerCase()
  );
}

export async function memoryUpdateMitraStatus(id: string, status: MitraStatus) {
  const mitra = getStore().mitra.find((m) => m.id === id);
  if (!mitra) return { success: false as const, error: "Mitra tidak ditemukan" };
  mitra.status = status;
  return { success: true as const, mitra };
}

export async function memoryDeleteMitra(id: string) {
  const store = getStore();
  const idx = store.mitra.findIndex((m) => m.id === id);
  if (idx === -1) return { success: false as const, error: "Mitra tidak ditemukan" };
  store.mitra.splice(idx, 1);
  return { success: true as const };
}

export async function memoryDeleteWorkOrder(id: string) {
  const store = getStore();
  const idx = store.workOrders.findIndex((wo) => wo.id === id);
  if (idx === -1) return { success: false as const, error: "WO tidak ditemukan" };
  store.workOrders.splice(idx, 1);
  // Also remove associated payouts and proofs
  store.payouts = store.payouts.filter((p) => p.woId !== id);
  store.proofs = store.proofs.filter((p) => p.woId !== id);
  return { success: true as const };
}

export async function memoryGetWorkOrders() {
  return getStore().workOrders;
}

export async function memoryGetWorkOrderById(id: string) {
  return getStore().workOrders.find((wo) => wo.id === id);
}

export async function memoryGetAvailableWorkOrders() {
  return getStore().workOrders.filter(
    (wo) =>
      (wo.status === "available" || wo.status === "in_progress") &&
      getOpenSlotCount(wo) > 0
  );
}

export async function memoryGetMitraWorkOrders(mitraId: string) {
  return getStore().workOrders.filter((wo) =>
    wo.slots.some(
      (s) =>
        s.mitraId === mitraId &&
        (s.status === "taken" || s.status === "completed")
    )
  );
}

export async function memoryAddWorkOrder(
  wo: Omit<WorkOrder, "id" | "createdAt" | "progress">
) {
  const store = getStore();
  const newWO: WorkOrder = {
    ...wo,
    slots: wo.slots?.length ? wo.slots : createSlots(wo.requiredCso),
    id: generateWOId(store.workOrders),
    createdAt: new Date().toISOString().split("T")[0],
    progress: 0,
  };
  store.workOrders.unshift(newWO);
  return { success: true as const, workOrder: newWO };
}

export async function memoryAddWorkOrdersBatch(
  orders: Omit<WorkOrder, "id" | "createdAt" | "progress">[]
) {
  const created: WorkOrder[] = [];
  for (const wo of orders) {
    const result = await memoryAddWorkOrder(wo);
    if (result.success) created.push(result.workOrder);
  }
  return { success: true as const, workOrders: created };
}

export async function memoryTakeSlot(woId: string, mitraId: string) {
  const store = getStore();
  const mitra = store.mitra.find((m) => m.id === mitraId);
  const wo = store.workOrders.find((w) => w.id === woId);

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
  return { success: true as const, workOrder: wo, slot: openSlot };
}

export async function memoryUpdateSlotProgress(
  woId: string,
  mitraId: string,
  progress: number
) {
  const store = getStore();
  const wo = store.workOrders.find((w) => w.id === woId);
  if (!wo) return { success: false as const, error: "Work Order tidak ditemukan" };

  const slot = wo.slots.find((s) => s.mitraId === mitraId);
  if (!slot)
    return { success: false as const, error: "Anda belum mengambil slot di WO ini" };

  const clamped = Math.min(100, Math.max(0, Math.round(progress)));
  const wasCompleted = slot.status === "completed";
  slot.progress = clamped;

  if (clamped >= 100 && !wasCompleted) {
    slot.status = "completed";
    const mitra = store.mitra.find((m) => m.id === mitraId);
    if (mitra) mitra.completedWO += 1;
    ensurePayoutOnComplete(store, wo, slot);
  } else if (clamped < 100 && slot.status === "completed") {
    slot.status = "taken";
    slot.verificationStatus = undefined;
    slot.verifiedAt = undefined;
  }

  recalcWoProgress(wo);
  checkWoCompletion(wo);
  if (wo.status !== "completed" && wo.status !== "verified") wo.status = "in_progress";

  return { success: true as const, workOrder: wo, slot };
}

export async function memoryGetPayouts() {
  return getStore().payouts;
}

export async function memoryUpdatePayoutStatus(id: string, status: PayoutStatus) {
  const payout = getStore().payouts.find((p) => p.id === id);
  if (!payout) return { success: false as const, error: "Payout tidak ditemukan" };
  payout.status = status;
  if (status === "paid") payout.paidAt = new Date().toISOString().split("T")[0];
  return { success: true as const, payout };
}

export async function memoryVerifySlot(
  woId: string,
  mitraId: string,
  action: "approve" | "reject"
) {
  const store = getStore();
  const wo = store.workOrders.find((w) => w.id === woId);
  if (!wo) return { success: false as const, error: "Work Order tidak ditemukan" };

  const slot = wo.slots.find((s) => s.mitraId === mitraId);
  if (!slot || slot.status !== "completed") {
    return { success: false as const, error: "Slot belum selesai dikerjakan" };
  }

  let payout = store.payouts.find(
    (p) => p.woId === woId && p.slotId === slot.id && p.mitraId === mitraId
  );
  if (!payout) {
    if (!slot.verificationStatus) slot.verificationStatus = "pending_review";
    payout = buildPayoutForSlot(wo, slot, generatePayoutId(store.payouts));
    store.payouts.unshift(payout);
  }

  const now = new Date().toISOString();

  if (action === "approve") {
    slot.verificationStatus = "approved";
    slot.verifiedAt = now;
    payout.status = "approved";
    payout.verifiedAt = now.split("T")[0];
    checkWoVerified(wo);
  } else {
    slot.verificationStatus = "rejected";
    slot.status = "taken";
    slot.progress = 75;
    payout.status = "rejected";
    wo.status = "in_progress";
    checkWoCompletion(wo);
    recalcWoProgress(wo);
  }

  return { success: true as const, workOrder: wo, slot, payout };
}

export async function memoryUploadTransferProof(
  payoutId: string,
  file: Buffer,
  mimeType: string
) {
  const store = getStore();
  const payout = store.payouts.find((p) => p.id === payoutId);
  if (!payout) return { success: false as const, error: "Payout tidak ditemukan" };
  if (payout.status !== "approved") {
    return {
      success: false as const,
      error: "Payout harus disetujui dulu sebelum upload bukti transfer",
    };
  }

  const ext = mimeType.includes("png") ? "png" : "jpg";
  const filename = `${randomUUID()}.${ext}`;
  const uploadDir = path.join(
    process.cwd(),
    "public",
    "uploads",
    "transfers"
  );
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), file);

  const imageUrl = `/uploads/transfers/${filename}`;
  const now = new Date().toISOString();
  payout.transferProofUrl = imageUrl;
  payout.transferProofUploadedAt = now;
  payout.status = "paid";
  payout.paidAt = now.split("T")[0];

  const mitra = store.mitra.find((m) => m.id === payout.mitraId);
  if (mitra) mitra.totalCommission += payout.amount;

  return { success: true as const, payout };
}

export async function memoryGetMitraPayouts(mitraId: string) {
  return getStore().payouts.filter((p) => p.mitraId === mitraId);
}

export async function memoryGetProofs() {
  return getStore().proofs;
}

export async function memoryGetProofsByWo(woId: string) {
  return getStore().proofs.filter((p) => p.woId === woId);
}

export async function memoryUploadProof(
  woId: string,
  mitraId: string,
  file: Buffer,
  mimeType: string
) {
  const store = getStore();
  const wo = store.workOrders.find((w) => w.id === woId);
  const mitra = store.mitra.find((m) => m.id === mitraId);
  if (!wo || !mitra)
    return { success: false as const, error: "WO atau mitra tidak ditemukan" };

  const slot = wo.slots.find((s) => s.mitraId === mitraId);
  if (!slot)
    return { success: false as const, error: "Anda belum mengambil slot di WO ini" };

  const ext = mimeType.includes("png") ? "png" : "jpg";
  const filename = `${randomUUID()}.${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "proofs");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), file);

  const imageUrl = `/uploads/proofs/${filename}`;
  slot.proofUrl = imageUrl;

  const proof: CompletionProof = {
    id: randomUUID(),
    woId: wo.id,
    woTitle: wo.title,
    mitraId: mitra.id,
    mitraName: mitra.name,
    slotId: slot.id,
    imageUrl,
    uploadedAt: new Date().toISOString(),
  };
  store.proofs.unshift(proof);

  return { success: true as const, proof, workOrder: wo };
}

export async function memoryGetFullState() {
  const store = getStore();
  return {
    mitra: store.mitra,
    workOrders: store.workOrders,
    payouts: store.payouts,
    proofs: store.proofs,
    syncedAt: new Date().toISOString(),
    source: "memory" as const,
  };
}
