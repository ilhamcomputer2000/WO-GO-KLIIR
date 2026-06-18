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

export async function getMitraById(id: string) {
  return useDb()
    ? supabase.supabaseGetMitraById(id)
    : memory.memoryGetMitraById(id);
}

export async function updateMitraProfile(
  id: string,
  data: {
    name?: string;
    phone?: string;
    address?: string;
    email?: string;
    nik?: string;
    religion?: string;
    birthPlace?: string;
    birthDate?: string;
    maritalStatus?: string;
    gender?: string;
    bankName?: string;
    bankAccountNumber?: string;
    bankAccountName?: string;
  }
) {
  return useDb()
    ? supabase.supabaseUpdateMitraProfile(id, data)
    : memory.memoryUpdateMitraProfile(id, data);
}

export async function updateMitraPhoto(id: string, file: Buffer, mimeType: string) {
  return useDb()
    ? supabase.supabaseUpdateMitraPhoto(id, file, mimeType)
    : memory.memoryUpdateMitraPhoto(id, file, mimeType);
}

export async function changeMitraPassword(
  id: string,
  currentPassword: string,
  newPassword: string
) {
  return useDb()
    ? supabase.supabaseChangeMitraPassword(id, currentPassword, newPassword)
    : memory.memoryChangeMitraPassword(id, currentPassword, newPassword);
}

export async function adminResetMitraPassword(
  id: string,
  newPassword: string
) {
  return useDb()
    ? supabase.supabaseAdminResetMitraPassword(id, newPassword)
    : memory.memoryAdminResetMitraPassword(id, newPassword);
}

export async function registerMitra(data: {
  name: string; email: string; password: string; phone: string;
  address: string; religion: string; birthPlace: string; birthDate: string;
  maritalStatus: string; gender: string; nik: string;
  bankName: string; bankAccountNumber: string; bankAccountName: string;
  ktpImageUrl: string;
}) {
  return useDb()
    ? supabase.supabaseRegisterMitra(data)
    : memory.memoryRegisterMitra(data);
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

export async function updateWorkOrder(wo: import("@/types").WorkOrder) {
  return useDb()
    ? supabase.supabaseUpdateWorkOrder(wo)
    : memory.memoryUpdateWorkOrder(wo);
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
  mimeType: string,
  proofType: "before" | "after" = "after",
  remark?: string
) {
  return useDb()
    ? supabase.supabaseUploadProof(woId, mitraId, file, mimeType, proofType, remark)
    : memory.memoryUploadProof(woId, mitraId, file, mimeType, proofType, remark);
}

export async function verifySlot(
  woId: string,
  mitraId: string,
  action: "approve" | "reject",
  rejectedPhotoTypes?: ("before" | "after")[],
  rejectionReason?: string
) {
  return useDb()
    ? supabase.supabaseVerifySlot(woId, mitraId, action, rejectedPhotoTypes, rejectionReason)
    : memory.memoryVerifySlot(woId, mitraId, action, rejectedPhotoTypes, rejectionReason);
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
