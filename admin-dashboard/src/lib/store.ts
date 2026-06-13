import { isSupabaseConfigured } from "@/lib/supabase/admin";
import * as memory from "@/lib/memory-store";
import * as supabase from "@/lib/supabase-store";
import type { MitraStatus, PayoutStatus, WorkOrder } from "@/types";

function useDb() {
  return isSupabaseConfigured();
}

export async function getMitraList() {
  return useDb() ? supabase.supabaseGetMitraList() : memory.memoryGetMitraList();
}

export async function getMitraByEmail(email: string) {
  return useDb()
    ? supabase.supabaseGetMitraByEmail(email)
    : memory.memoryGetMitraByEmail(email);
}

export async function verifyMitraLogin(email: string, password: string) {
  if (useDb()) return supabase.supabaseVerifyMitraLogin(email, password);
  const mitra = await memory.memoryGetMitraByEmail(email);
  if (!mitra || password !== "mitra123") return null;
  return mitra;
}

export async function updateMitraStatus(id: string, status: MitraStatus) {
  return useDb()
    ? supabase.supabaseUpdateMitraStatus(id, status)
    : memory.memoryUpdateMitraStatus(id, status);
}

export async function deleteMitra(id: string) {
  return useDb()
    ? supabase.supabaseDeleteMitra(id)
    : memory.memoryDeleteMitra(id);
}

export async function getWorkOrders() {
  return useDb()
    ? supabase.supabaseGetWorkOrders()
    : memory.memoryGetWorkOrders();
}

export async function getWorkOrderById(id: string) {
  return useDb()
    ? supabase.supabaseGetWorkOrderById(id)
    : memory.memoryGetWorkOrderById(id);
}

export async function getAvailableWorkOrders() {
  return useDb()
    ? supabase.supabaseGetAvailableWorkOrders()
    : memory.memoryGetAvailableWorkOrders();
}

export async function getMitraWorkOrders(mitraId: string) {
  return useDb()
    ? supabase.supabaseGetMitraWorkOrders(mitraId)
    : memory.memoryGetMitraWorkOrders(mitraId);
}

export async function deleteWorkOrder(id: string) {
  return useDb()
    ? supabase.supabaseDeleteWorkOrder(id)
    : memory.memoryDeleteWorkOrder(id);
}

export async function addWorkOrder(
  wo: Omit<WorkOrder, "id" | "createdAt" | "progress">
) {
  return useDb()
    ? supabase.supabaseAddWorkOrder(wo)
    : memory.memoryAddWorkOrder(wo);
}

export async function addWorkOrdersBatch(
  orders: Omit<WorkOrder, "id" | "createdAt" | "progress">[]
) {
  return useDb()
    ? supabase.supabaseAddWorkOrdersBatch(orders)
    : memory.memoryAddWorkOrdersBatch(orders);
}

export async function takeSlot(woId: string, mitraId: string) {
  return useDb()
    ? supabase.supabaseTakeSlot(woId, mitraId)
    : memory.memoryTakeSlot(woId, mitraId);
}

export async function updateSlotProgress(
  woId: string,
  mitraId: string,
  progress: number
) {
  return useDb()
    ? supabase.supabaseUpdateSlotProgress(woId, mitraId, progress)
    : memory.memoryUpdateSlotProgress(woId, mitraId, progress);
}

export async function getPayouts() {
  return useDb() ? supabase.supabaseGetPayouts() : memory.memoryGetPayouts();
}

export async function updatePayoutStatus(id: string, status: PayoutStatus) {
  return useDb()
    ? supabase.supabaseUpdatePayoutStatus(id, status)
    : memory.memoryUpdatePayoutStatus(id, status);
}

export async function getProofs() {
  return useDb() ? supabase.supabaseGetProofs() : memory.memoryGetProofs();
}

export async function getProofsByWo(woId: string) {
  return useDb()
    ? supabase.supabaseGetProofsByWo(woId)
    : memory.memoryGetProofsByWo(woId);
}

export async function uploadProof(
  woId: string,
  mitraId: string,
  file: Buffer,
  mimeType: string
) {
  return useDb()
    ? supabase.supabaseUploadProof(woId, mitraId, file, mimeType)
    : memory.memoryUploadProof(woId, mitraId, file, mimeType);
}

export async function verifySlot(
  woId: string,
  mitraId: string,
  action: "approve" | "reject"
) {
  return useDb()
    ? supabase.supabaseVerifySlot(woId, mitraId, action)
    : memory.memoryVerifySlot(woId, mitraId, action);
}

export async function uploadTransferProof(
  payoutId: string,
  file: Buffer,
  mimeType: string
) {
  return useDb()
    ? supabase.supabaseUploadTransferProof(payoutId, file, mimeType)
    : memory.memoryUploadTransferProof(payoutId, file, mimeType);
}

export async function getMitraPayouts(mitraId: string) {
  return useDb()
    ? supabase.supabaseGetMitraPayouts(mitraId)
    : memory.memoryGetMitraPayouts(mitraId);
}

export async function getFullState() {
  return useDb()
    ? supabase.supabaseGetFullState()
    : memory.memoryGetFullState();
}

export function getStoreSource(): "supabase" | "memory" {
  return useDb() ? "supabase" : "memory";
}
