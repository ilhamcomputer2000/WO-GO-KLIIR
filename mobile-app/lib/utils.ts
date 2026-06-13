import type { WorkOrder } from "@/types";

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} menit`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours} jam`;
  return `${hours} jam ${mins} menit`;
}

export function getOpenSlotCount(wo: WorkOrder): number {
  return wo.slots.filter((s) => s.status === "open").length;
}

export function getCommissionPerCso(wo: WorkOrder): number {
  if (!wo.requiredCso) return wo.commission;
  return Math.round(wo.commission / wo.requiredCso);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
