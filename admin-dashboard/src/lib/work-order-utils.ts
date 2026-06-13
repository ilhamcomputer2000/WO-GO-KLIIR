import type { WorkOrder, WorkOrderSlot, SlotStatus } from "@/types";

export function createSlots(
  requiredCso: number,
  assignments?: { mitraId: string; mitraName: string; status?: SlotStatus }[]
): WorkOrderSlot[] {
  return Array.from({ length: requiredCso }, (_, i) => {
    const assigned = assignments?.[i];
    return {
      id: `SLOT-${i + 1}`,
      slotNumber: i + 1,
      mitraId: assigned?.mitraId,
      mitraName: assigned?.mitraName,
      status: assigned?.status ?? (assigned ? "taken" : "open"),
    };
  });
}

export function getOpenSlotCount(wo: WorkOrder): number {
  return wo.slots.filter((s) => s.status === "open").length;
}

export function getFilledSlotCount(wo: WorkOrder): number {
  return wo.slots.filter((s) => s.status === "taken" || s.status === "completed").length;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} menit`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours} jam`;
  return `${hours} jam ${mins} menit`;
}

export function formatTimeRange(start: string, end: string): string {
  if (!start || !end) return "—";
  return `${start} – ${end}`;
}

export function getAssignedMitraLabel(wo: WorkOrder): string {
  const names = wo.slots
    .filter((s) => s.mitraName)
    .map((s) => s.mitraName as string);
  if (names.length === 0) return "—";
  return names.join(", ");
}

export function getCommissionPerCso(wo: WorkOrder): number {
  if (!wo.requiredCso) return wo.commission;
  return Math.round(wo.commission / wo.requiredCso);
}

/** Migrasi data lama dari localStorage yang masih pakai field deadline */
export function normalizeWorkOrder(raw: Record<string, unknown>): WorkOrder {
  const workDate = (raw.workDate ?? raw.deadline ?? "") as string;
  const requiredCso = (raw.requiredCso as number) ?? 1;
  const durationMinutes = (raw.durationMinutes as number) ?? 60;

  let slots = raw.slots as WorkOrderSlot[] | undefined;
  if (!slots || slots.length === 0) {
    const mitraId = raw.mitraId as string | undefined;
    const mitraName = raw.mitraName as string | undefined;
    slots = createSlots(
      requiredCso,
      mitraId ? [{ mitraId, mitraName: mitraName ?? "", status: "taken" }] : undefined
    );
  }

  return {
    id: raw.id as string,
    title: raw.title as string,
    description: (raw.description as string) ?? "",
    category: raw.category as string,
    location: raw.location as string,
    commission: raw.commission as number,
    workDate,
    startTime: (raw.startTime as string) ?? "08:00",
    endTime: (raw.endTime as string) ?? "17:00",
    durationMinutes,
    requiredCso,
    slots,
    status: raw.status as WorkOrder["status"],
    createdAt: raw.createdAt as string,
    progress: (raw.progress as number) ?? 0,
  };
}
