import { API_URL } from "@/constants/config";
import type { CompletionProof, Mitra, PayoutRecord, WorkOrder } from "@/types";

async function request<T>(
  path: string,
  options?: RequestInit,
  timeoutMs = 10000
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error ?? "Terjadi kesalahan");
    }

    return data as T;
  } catch (e: unknown) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error(`Koneksi timeout — pastikan server berjalan di ${API_URL}`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export async function loginMitra(email: string, password: string) {
  return request<{ mitra: Mitra }>("/api/auth/mitra/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function fetchAvailableWorkOrders() {
  return request<{ workOrders: WorkOrder[] }>(
    "/api/work-orders?available=true"
  );
}

export async function fetchWorkOrder(id: string) {
  return request<{ workOrder: WorkOrder }>(`/api/work-orders/${id}`);
}

export async function fetchMyWorkOrders(mitraId: string) {
  return request<{ workOrders: WorkOrder[] }>(
    `/api/mitra/${mitraId}/work-orders`
  );
}

export async function takeSlot(woId: string, mitraId: string) {
  return request<{
    message: string;
    workOrder: WorkOrder;
    slot: WorkOrder["slots"][0];
  }>(`/api/work-orders/${woId}/take-slot`, {
    method: "POST",
    body: JSON.stringify({ mitraId }),
  });
}

export async function updateProgress(
  woId: string,
  mitraId: string,
  progress: number
) {
  return request<{
    message: string;
    workOrder: WorkOrder;
    slot: WorkOrder["slots"][0];
  }>(`/api/work-orders/${woId}/progress`, {
    method: "POST",
    body: JSON.stringify({ mitraId, progress }),
  });
}

export async function uploadProof(
  woId: string,
  mitraId: string,
  imageUri: string,
  mimeType = "image/jpeg"
) {
  // Read file as base64 using XMLHttpRequest (works reliably in React Native)
  const base64 = await new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Strip the data URL prefix: "data:image/jpeg;base64,..."
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(xhr.response);
    };
    xhr.onerror = reject;
    xhr.responseType = "blob";
    xhr.open("GET", imageUri);
    xhr.send();
  });

  return request<{
    message: string;
    proof: CompletionProof;
    workOrder: WorkOrder;
  }>(`/api/work-orders/${woId}/proof`, {
    method: "POST",
    body: JSON.stringify({ mitraId, base64, mimeType }),
  }, 30000);
}

export function resolveImageUrl(url: string): string {
  if (url.startsWith("http")) return url;
  return `${API_URL}${url}`;
}

export async function fetchMitraPayouts(mitraId: string) {
  return request<{ payouts: PayoutRecord[] }>(`/api/mitra/${mitraId}/payouts`);
}

export function getPayoutStatusLabel(status: PayoutRecord["status"]): string {
  const labels: Record<PayoutRecord["status"], string> = {
    pending: "Menunggu verifikasi admin",
    approved: "Disetujui — menunggu transfer",
    paid: "Komisi sudah ditransfer",
    rejected: "Pekerjaan ditolak admin",
  };
  return labels[status];
}

export function getVerificationLabel(
  status?: WorkOrder["slots"][0]["verificationStatus"]
): string {
  if (!status || status === "pending_review")
    return "Menunggu review admin";
  if (status === "approved") return "Pekerjaan disetujui admin";
  return "Pekerjaan ditolak — perbaiki & upload ulang";
}
