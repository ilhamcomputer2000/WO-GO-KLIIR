import { API_URL } from "@/constants/config";
import type { CompletionProof, Mitra, PayoutRecord, WorkOrder } from "@/types";

async function request<T>(
  path: string,
  options?: RequestInit,
  timeoutMs = 10000,
  externalSignal?: AbortSignal
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  // If an external signal is provided, abort our controller when it fires
  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) {
      clearTimeout(timer);
      throw new DOMException("Aborted", "AbortError");
    }
    externalSignal.addEventListener("abort", onExternalAbort);
  }

  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    // Guard against empty / non-JSON response (e.g. Vercel 500 with no body)
    const text = await res.text();
    if (!text) {
      throw new Error(`Server error (${res.status}) — tidak ada respons`);
    }
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Respons tidak valid dari server (${res.status})`);
    }

    if (!res.ok) {
      throw new Error(
        (data as Record<string, unknown>).error as string ?? "Terjadi kesalahan"
      );
    }

    return data as T;
  } catch (e: unknown) {
    if (e instanceof Error && e.name === "AbortError") {
      // If external signal caused it, re-throw as AbortError (caller handles it)
      if (externalSignal?.aborted) {
        throw e;
      }
      throw new Error(`Koneksi timeout — pastikan server berjalan di ${API_URL}`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener("abort", onExternalAbort);
  }
}

export async function loginMitra(email: string, password: string) {
  return request<{ mitra: Mitra }>("/api/auth/mitra/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function uploadKtpImage(
  imageUri: string,
  mimeType = "image/jpeg"
): Promise<string> {
  // Use expo-file-system to read as base64 (works reliably on Android & iOS)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const FileSystem = require("expo-file-system");
  const base64 = await FileSystem.readAsStringAsync(imageUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const res = await fetch(`${API_URL}/api/auth/mitra/upload-ktp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base64, mimeType }),
  });

  // Guard: handle empty / non-JSON response
  const text = await res.text();
  if (!text) throw new Error("Server tidak merespons saat upload KTP");
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Upload KTP gagal: respons tidak valid (${res.status})`);
  }
  if (!res.ok) throw new Error((data.error as string) ?? "Upload KTP gagal");
  return data.url as string;
}

export async function registerMitra(data: {
  name: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  religion: string;
  birthPlace: string;
  birthDate: string;
  maritalStatus: string;
  gender: string;
  nik: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  ktpImageUrl: string;
}) {
  return request<{ message: string; mitra: Mitra }>(
    "/api/auth/mitra/register",
    { method: "POST", body: JSON.stringify(data) }
  );
}

export async function fetchAvailableWorkOrders(signal?: AbortSignal) {
  return request<{ workOrders: WorkOrder[] }>(
    "/api/work-orders?available=true",
    undefined,
    10000,
    signal
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
  mimeType = "image/jpeg",
  proofType: "before" | "after" = "after",
  remark?: string
) {
  // Use expo-file-system to read as base64 (reliable on Android & iOS)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const FileSystem = require("expo-file-system");
  const base64 = await FileSystem.readAsStringAsync(imageUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return request<{
    message: string;
    proof: CompletionProof;
    workOrder: WorkOrder;
  }>(`/api/work-orders/${woId}/proof`, {
    method: "POST",
    body: JSON.stringify({ mitraId, base64, mimeType, proofType, remark }),
  }, 30000);
}

export function resolveImageUrl(url: string): string {
  if (url.startsWith("http")) return url;
  return `${API_URL}${url}`;
}

export async function fetchMitraPayouts(mitraId: string) {
  return request<{ payouts: PayoutRecord[] }>(`/api/mitra/${mitraId}/payouts`);
}

export async function updateMitraProfile(
  mitraId: string,
  data: { name: string; phone: string; address?: string }
) {
  return request<{ mitra: Mitra }>(`/api/mitra/${mitraId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function changeMitraPassword(
  mitraId: string,
  currentPassword: string,
  newPassword: string
) {
  return request<{ message: string }>(`/api/mitra/${mitraId}/change-password`, {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function uploadProfilePhoto(
  mitraId: string,
  imageUri: string,
  mimeType = "image/jpeg"
): Promise<{ profilePhotoUrl: string; mitra: Mitra }> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const FileSystem = require("expo-file-system");
  const base64 = await FileSystem.readAsStringAsync(imageUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const res = await fetch(`${API_URL}/api/mitra/${mitraId}/photo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base64, mimeType }),
  });

  const text = await res.text();
  if (!text) throw new Error("Server tidak merespons saat upload foto profil");
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Upload foto profil gagal: respons tidak valid (${res.status})`);
  }
  if (!res.ok) throw new Error((data.error as string) ?? "Upload foto profil gagal");
  return { profilePhotoUrl: data.profilePhotoUrl as string, mitra: data.mitra as Mitra };
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
