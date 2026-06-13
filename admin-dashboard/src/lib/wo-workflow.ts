import type { PayoutRecord, WorkOrder, WorkOrderSlot } from "@/types";
import { getCommissionPerCso } from "@/lib/work-order-utils";

export function checkWoVerified(wo: WorkOrder) {
  const doneSlots = wo.slots.filter(
    (s) => s.mitraId && (s.status === "completed" || s.verificationStatus)
  );
  if (doneSlots.length === 0) return;
  if (doneSlots.every((s) => s.verificationStatus === "approved")) {
    wo.status = "verified";
    wo.progress = 100;
  }
}

export function checkWoCompletion(wo: WorkOrder) {
  const takenSlots = wo.slots.filter((s) => s.mitraId);
  if (takenSlots.length === 0) return;
  if (takenSlots.every((s) => s.status === "completed")) {
    wo.status = "completed";
    wo.progress = 100;
  }
}

export function recalcWoProgress(wo: WorkOrder) {
  const activeSlots = wo.slots.filter(
    (s) => s.status === "taken" || s.status === "completed"
  );
  if (activeSlots.length === 0) {
    wo.progress = 0;
    return;
  }
  wo.progress = Math.round(
    activeSlots.reduce((sum, s) => sum + (s.progress ?? 0), 0) /
      activeSlots.length
  );
}

export function buildPayoutForSlot(
  wo: WorkOrder,
  slot: WorkOrderSlot,
  id: string
): PayoutRecord {
  return {
    id,
    woId: wo.id,
    woTitle: wo.title,
    mitraId: slot.mitraId!,
    mitraName: slot.mitraName ?? "",
    slotId: slot.id,
    amount: getCommissionPerCso(wo),
    status: "pending",
    createdAt: new Date().toISOString().split("T")[0],
  };
}

export function generatePayoutId(existing: PayoutRecord[]): string {
  const nums = existing
    .map((p) => {
      const match = p.id.match(/PAY-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((n) => !isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `PAY-${String(next).padStart(3, "0")}`;
}
