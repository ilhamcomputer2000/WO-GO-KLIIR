import type {
  CompletionProof,
  Mitra,
  MitraStatus,
  PayoutRecord,
  PayoutStatus,
  WorkOrder,
} from "@/types";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Request gagal");
  return data as T;
}

export async function fetchSync() {
  return request<{
    mitra: Mitra[];
    workOrders: WorkOrder[];
    payouts: PayoutRecord[];
    proofs: CompletionProof[];
    syncedAt: string;
    source?: "supabase" | "memory";
  }>("/api/sync");
}

export async function apiUpdateMitraStatus(id: string, status: MitraStatus) {
  return request<{ mitra: Mitra }>(`/api/mitra/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function apiDeleteMitra(id: string) {
  return request<{ message: string }>(`/api/mitra/${id}`, { method: "DELETE" });
}

export async function apiAddWorkOrder(
  wo: Omit<WorkOrder, "id" | "createdAt" | "progress">
) {
  return request<{ workOrder: WorkOrder }>("/api/work-orders", {
    method: "POST",
    body: JSON.stringify(wo),
  });
}

export async function apiAddWorkOrdersBatch(
  orders: Omit<WorkOrder, "id" | "createdAt" | "progress">[]
) {
  return request<{ workOrders: WorkOrder[] }>("/api/work-orders", {
    method: "POST",
    body: JSON.stringify({ workOrders: orders }),
  });
}

export async function apiDeleteWorkOrder(id: string) {
  return request<{ message: string }>(`/api/work-orders/${id}`, {
    method: "DELETE",
  });
}

export async function apiUpdatePayoutStatus(id: string, status: PayoutStatus) {
  return request<{ payout: PayoutRecord }>(`/api/payouts/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function apiVerifySlot(
  woId: string,
  mitraId: string,
  action: "approve" | "reject"
) {
  return request<{
    message: string;
    workOrder: import("@/types").WorkOrder;
    payout: PayoutRecord;
  }>(`/api/work-orders/${woId}/verify-slot`, {
    method: "POST",
    body: JSON.stringify({ mitraId, action }),
  });
}

export async function apiUploadTransferProof(payoutId: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`/api/payouts/${payoutId}/transfer-proof`, {
    method: "POST",
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Upload gagal");
  return data as { message: string; payout: PayoutRecord };
}
