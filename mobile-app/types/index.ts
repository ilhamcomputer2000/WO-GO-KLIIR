export type MitraStatus = "pending" | "active" | "suspended";

export type WorkOrderStatus =
  | "pending"
  | "available"
  | "in_progress"
  | "completed"
  | "verified";

export type SlotStatus = "open" | "taken" | "completed";

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

export type SlotVerificationStatus = "pending_review" | "approved" | "rejected";
export type PayoutStatus = "pending" | "approved" | "paid" | "rejected";

export interface WorkOrderSlot {
  id: string;
  slotNumber: number;
  mitraId?: string;
  mitraName?: string;
  status: SlotStatus;
  progress?: number;
  beforePhotoUrl?: string;
  beforeRemark?: string;
  afterPhotoUrl?: string;
  afterRemark?: string;
  verificationStatus?: SlotVerificationStatus;
  verifiedAt?: string;
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
  transferProofUrl?: string;
  transferProofUploadedAt?: string;
}

export interface CompletionProof {
  id: string;
  woId: string;
  woTitle: string;
  mitraId: string;
  mitraName: string;
  slotId: string;
  imageUrl: string;
  proofType: "before" | "after";
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
  workDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  requiredCso: number;
  slots: WorkOrderSlot[];
  status: WorkOrderStatus;
  createdAt: string;
  progress: number;
}
