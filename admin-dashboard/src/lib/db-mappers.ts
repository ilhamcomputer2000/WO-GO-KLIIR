import type {
  CompletionProof,
  Mitra,
  PayoutRecord,
  WorkOrder,
  WorkOrderSlot,
} from "@/types";

export function mapMitraRow(row: Record<string, unknown>): Mitra {
  return {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    phone: (row.phone as string) ?? "",
    status: row.status as Mitra["status"],
    registeredAt: (row.registered_at as string) ?? "",
    completedWO: Number(row.completed_wo ?? 0),
    totalCommission: Number(row.total_commission ?? 0),
    address: row.address as string | undefined,
  };
}

export function mapWorkOrderRow(row: Record<string, unknown>): WorkOrder {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) ?? "",
    category: row.category as string,
    location: row.location as string,
    commission: Number(row.commission),
    workDate: row.work_date as string,
    startTime: row.start_time as string,
    endTime: row.end_time as string,
    durationMinutes: Number(row.duration_minutes ?? 60),
    requiredCso: Number(row.required_cso ?? 1),
    slots: (row.slots as WorkOrderSlot[]) ?? [],
    status: row.status as WorkOrder["status"],
    progress: Number(row.progress ?? 0),
    createdAt: row.created_at as string,
  };
}

export function mapPayoutRow(row: Record<string, unknown>): PayoutRecord {
  return {
    id: row.id as string,
    woId: row.wo_id as string,
    woTitle: row.wo_title as string,
    mitraId: row.mitra_id as string,
    mitraName: row.mitra_name as string,
    slotId: (row.slot_id as string) ?? "SLOT-1",
    amount: Number(row.amount),
    status: row.status as PayoutRecord["status"],
    createdAt: row.created_at as string,
    verifiedAt: row.verified_at as string | undefined,
    paidAt: row.paid_at as string | undefined,
    transferProofUrl: row.transfer_proof_url as string | undefined,
    transferProofUploadedAt: row.transfer_proof_uploaded_at as
      | string
      | undefined,
  };
}

export function payoutToDb(p: PayoutRecord): Record<string, unknown> {
  return {
    id: p.id,
    wo_id: p.woId,
    wo_title: p.woTitle,
    mitra_id: p.mitraId,
    mitra_name: p.mitraName,
    slot_id: p.slotId,
    amount: p.amount,
    status: p.status,
    created_at: p.createdAt,
    verified_at: p.verifiedAt ?? null,
    paid_at: p.paidAt ?? null,
    transfer_proof_url: p.transferProofUrl ?? null,
    transfer_proof_uploaded_at: p.transferProofUploadedAt ?? null,
  };
}

export function mapProofRow(row: Record<string, unknown>): CompletionProof {
  return {
    id: row.id as string,
    woId: row.wo_id as string,
    woTitle: row.wo_title as string,
    mitraId: row.mitra_id as string,
    mitraName: row.mitra_name as string,
    slotId: row.slot_id as string,
    imageUrl: row.image_url as string,
    uploadedAt: row.uploaded_at as string,
  };
}

export function workOrderToDb(
  wo: WorkOrder
): Record<string, unknown> {
  return {
    id: wo.id,
    title: wo.title,
    description: wo.description,
    category: wo.category,
    location: wo.location,
    commission: wo.commission,
    work_date: wo.workDate,
    start_time: wo.startTime,
    end_time: wo.endTime,
    duration_minutes: wo.durationMinutes,
    required_cso: wo.requiredCso,
    slots: wo.slots,
    status: wo.status,
    progress: wo.progress,
    created_at: wo.createdAt,
    updated_at: new Date().toISOString(),
  };
}
