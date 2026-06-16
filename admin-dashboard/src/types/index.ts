export type UserRole = "super_admin" | "admin" | "mitra";

export type MitraStatus = "pending" | "active" | "suspended";

export type WorkOrderStatus =
  | "pending"
  | "available"
  | "in_progress"
  | "completed"
  | "verified";

export type PayoutStatus = "pending" | "approved" | "paid" | "rejected";

export type SlotVerificationStatus = "pending_review" | "approved" | "rejected";

export type SlotStatus = "open" | "taken" | "completed";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface Mitra {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: MitraStatus;
  registeredAt: string;
  completedWO: number;
  totalCommission: number;
  address?: string;
}

/** Satu slot = 1 CSO (Custodian Service Officer) yang bisa ambil pekerjaan */
export interface WorkOrderSlot {
  id: string;
  slotNumber: number;
  mitraId?: string;
  mitraName?: string;
  status: SlotStatus;
  /** Progress pekerjaan per CSO (0–100) — ditentukan sistem berdasarkan foto */
  progress?: number;
  /** Foto sebelum mulai pekerjaan */
  beforePhotoUrl?: string;
  beforeRemark?: string;
  /** Foto setelah selesai pekerjaan */
  afterPhotoUrl?: string;
  afterRemark?: string;
  /** Status verifikasi admin setelah mitra selesai */
  verificationStatus?: SlotVerificationStatus;
  verifiedAt?: string;
  /** Foto mana yang direject admin: "before", "after", atau keduanya */
  rejectedPhotoTypes?: ("before" | "after")[];
  /** Alasan penolakan dari admin */
  rejectionReason?: string;
}

export interface CompletionProof {
  id: string;
  woId: string;
  woTitle: string;
  mitraId: string;
  mitraName: string;
  slotId: string;
  imageUrl: string;
  /** Jenis foto: sebelum atau sesudah pekerjaan */
  proofType: "before" | "after";
  /** Catatan/keterangan dari mitra */
  remark?: string;
  uploadedAt: string;
}

export interface WorkOrder {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  commission: number;
  /** Tanggal pekerjaan dilaksanakan (bukan deadline) */
  workDate: string;
  startTime: string;
  endTime: string;
  /** Durasi pekerjaan per CSO, dalam menit. Contoh: pembersihan = 60 menit */
  durationMinutes: number;
  /** Jumlah CSO yang dibutuhkan = jumlah slot terbuka */
  requiredCso: number;
  slots: WorkOrderSlot[];
  status: WorkOrderStatus;
  createdAt: string;
  progress: number;
}

export interface PayoutRecord {
  id: string;
  woId: string;
  woTitle: string;
  mitraId: string;
  mitraName: string;
  slotId: string;
  amount: number;
  status: PayoutStatus;
  createdAt: string;
  verifiedAt?: string;
  paidAt?: string;
  /** Foto bukti transfer/bagi hasil yang diupload admin */
  transferProofUrl?: string;
  transferProofUploadedAt?: string;
}

export interface DashboardStats {
  totalWO: number;
  pendingWO: number;
  inProgressWO: number;
  completedWO: number;
  totalMitra: number;
  activeMitra: number;
  pendingMitra: number;
  totalCommissionPaid: number;
  totalCommissionPending: number;
}
