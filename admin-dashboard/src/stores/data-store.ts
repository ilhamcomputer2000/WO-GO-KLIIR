"use client";

import { create } from "zustand";
import type {
  CompletionProof,
  DashboardStats,
  Mitra,
  MitraStatus,
  PayoutRecord,
  PayoutStatus,
  WorkOrder,
  WorkOrderStatus,
} from "@/types";
import {
  apiAddWorkOrder,
  apiAddWorkOrdersBatch,
  apiDeleteMitra,
  apiDeleteWorkOrder,
  apiUpdateMitraStatus,
  apiUpdatePayoutStatus,
  apiUploadTransferProof,
  apiVerifySlot,
  fetchSync,
} from "@/lib/api-client";

interface DataState {
  mitra: Mitra[];
  workOrders: WorkOrder[];
  payouts: PayoutRecord[];
  proofs: CompletionProof[];
  isSyncing: boolean;
  lastSynced: string | null;
  syncError: string | null;
  dataSource: "supabase" | "memory" | null;
  sync: () => Promise<void>;
  updateMitraStatus: (id: string, status: MitraStatus) => Promise<void>;
  deleteMitra: (id: string) => Promise<void>;
  addWorkOrder: (
    wo: Omit<WorkOrder, "id" | "createdAt" | "progress">
  ) => Promise<void>;
  addWorkOrdersBatch: (
    orders: Omit<WorkOrder, "id" | "createdAt" | "progress">[]
  ) => Promise<void>;
  deleteWorkOrder: (id: string) => Promise<void>;
  updatePayoutStatus: (id: string, status: PayoutStatus) => Promise<void>;
  verifySlot: (
    woId: string,
    mitraId: string,
    action: "approve" | "reject",
    rejectedPhotos?: ("before" | "after")[],
    rejectionReason?: string
  ) => Promise<void>;
  uploadTransferProof: (payoutId: string, file: File) => Promise<void>;
}

export function computeDashboardStats(
  mitra: Mitra[],
  workOrders: WorkOrder[],
  payouts: PayoutRecord[]
): DashboardStats {
  return {
    totalWO: workOrders.length,
    pendingWO: workOrders.filter(
      (w) => w.status === "pending" || w.status === "available"
    ).length,
    inProgressWO: workOrders.filter((w) => w.status === "in_progress").length,
    completedWO: workOrders.filter(
      (w) => w.status === "completed" || w.status === "verified"
    ).length,
    totalMitra: mitra.length,
    activeMitra: mitra.filter((m) => m.status === "active").length,
    pendingMitra: mitra.filter((m) => m.status === "pending").length,
    totalCommissionPaid: payouts
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + p.amount, 0),
    totalCommissionPending: payouts
      .filter((p) => p.status === "pending" || p.status === "approved")
      .reduce((sum, p) => sum + p.amount, 0),
  };
}

export const useDataStore = create<DataState>()((set, get) => ({
  mitra: [],
  workOrders: [],
  payouts: [],
  proofs: [],
  isSyncing: false,
  lastSynced: null,
  syncError: null,
  dataSource: null,

  sync: async () => {
    // Prevent concurrent syncs
    if (get().isSyncing) return;
    set({ isSyncing: true, syncError: null });
    try {
      const data = await fetchSync();
      set({
        mitra: data.mitra,
        workOrders: data.workOrders,
        payouts: data.payouts,
        proofs: data.proofs ?? [],
        lastSynced: data.syncedAt,
        dataSource: data.source ?? null,
        isSyncing: false,
      });
    } catch (e) {
      set({
        isSyncing: false,
        syncError: e instanceof Error ? e.message : "Sync gagal",
      });
    }
  },

  updateMitraStatus: async (id, status) => {
    await apiUpdateMitraStatus(id, status);
    await get().sync();
  },

  deleteMitra: async (id) => {
    await apiDeleteMitra(id);
    await get().sync();
  },

  addWorkOrder: async (wo) => {
    await apiAddWorkOrder(wo);
    await get().sync();
  },

  addWorkOrdersBatch: async (orders) => {
    await apiAddWorkOrdersBatch(orders);
    await get().sync();
  },

  deleteWorkOrder: async (id) => {
    await apiDeleteWorkOrder(id);
    await get().sync();
  },

  updatePayoutStatus: async (id, status) => {
    await apiUpdatePayoutStatus(id, status);
    await get().sync();
  },

  verifySlot: async (woId, mitraId, action, rejectedPhotos, rejectionReason) => {
    await apiVerifySlot(woId, mitraId, action, rejectedPhotos, rejectionReason);
    await get().sync();
  },

  uploadTransferProof: async (payoutId, file) => {
    await apiUploadTransferProof(payoutId, file);
    await get().sync();
  },
}));

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function getStatusLabel(status: WorkOrderStatus): string {
  const labels: Record<WorkOrderStatus, string> = {
    pending: "Pending",
    available: "Tersedia",
    in_progress: "Dikerjakan",
    completed: "Selesai",
    verified: "Terverifikasi",
  };
  return labels[status];
}

export function getMitraStatusLabel(status: MitraStatus): string {
  const labels: Record<MitraStatus, string> = {
    pending: "Menunggu ACC",
    active: "Aktif",
    suspended: "Suspend",
  };
  return labels[status];
}

export function getPayoutStatusLabel(status: PayoutStatus): string {
  const labels: Record<PayoutStatus, string> = {
    pending: "Menunggu Verifikasi",
    approved: "Disetujui — Siap Transfer",
    paid: "Sudah Ditransfer",
    rejected: "Ditolak",
  };
  return labels[status];
}
