"use client";

import { useMemo, useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  getDay,
} from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { WorkOrder } from "@/types";
import {
  formatDuration,
  formatTimeRange,
  getFilledSlotCount,
  getOpenSlotCount,
  getCommissionPerCso,
} from "@/lib/work-order-utils";
import { formatCurrency, getStatusLabel } from "@/stores/data-store";

const WEEKDAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

const statusColor: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  available: "bg-blue-100 text-blue-800 border-blue-200",
  in_progress: "bg-purple-100 text-purple-800 border-purple-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  verified: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

interface WOCalendarProps {
  workOrders: WorkOrder[];
}

export function WOCalendar({ workOrders }: WOCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const leadingBlanks = getDay(startOfMonth(currentMonth));

  const woByDate = useMemo(() => {
    const map = new Map<string, WorkOrder[]>();
    workOrders.forEach((wo) => {
      const key = wo.workDate;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(wo);
    });
    return map;
  }, [workOrders]);

  const today = new Date();

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-sm font-semibold capitalize">
            {format(currentMonth, "MMMM yyyy", { locale: localeId })}
          </h3>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-px rounded-lg border bg-border overflow-hidden">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="bg-muted px-1 py-2 text-center text-xs font-medium text-muted-foreground"
            >
              {d}
            </div>
          ))}

          {Array.from({ length: leadingBlanks }).map((_, i) => (
            <div key={`blank-${i}`} className="bg-background min-h-[90px] p-1" />
          ))}

          {days.map((day) => {
            const dateKey = format(day, "yyyy-MM-dd");
            const dayWOs = woByDate.get(dateKey) ?? [];
            const isToday = isSameDay(day, today);

            return (
              <div
                key={dateKey}
                className={`bg-background min-h-[90px] p-1 border-t ${
                  !isSameMonth(day, currentMonth) ? "opacity-40" : ""
                }`}
              >
                <div
                  className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday ? "bg-primary text-primary-foreground" : ""
                  }`}
                >
                  {format(day, "d")}
                </div>
                <div className="space-y-0.5">
                  {dayWOs.slice(0, 2).map((wo) => (
                    <button
                      key={wo.id}
                      type="button"
                      onClick={() => setSelectedWO(wo)}
                      className={`w-full text-left text-[10px] leading-tight px-1 py-0.5 rounded border truncate ${statusColor[wo.status]}`}
                    >
                      {wo.startTime} {wo.title}
                    </button>
                  ))}
                  {dayWOs.length > 2 && (
                    <p className="text-[10px] text-muted-foreground px-1">
                      +{dayWOs.length - 2} lainnya
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-blue-100 border border-blue-200" />
            Tersedia
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-purple-100 border border-purple-200" />
            Dikerjakan
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-green-100 border border-green-200" />
            Selesai
          </span>
        </div>
      </div>

      <Dialog open={!!selectedWO} onOpenChange={() => setSelectedWO(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedWO?.title}</DialogTitle>
          </DialogHeader>
          {selectedWO && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">ID WO</span>
                <span className="font-mono text-xs">{selectedWO.id}</span>
                <span className="text-muted-foreground">Tanggal Pekerjaan</span>
                <span>
                  {format(new Date(selectedWO.workDate), "dd MMM yyyy", {
                    locale: localeId,
                  })}
                </span>
                <span className="text-muted-foreground">Jam</span>
                <span>
                  {formatTimeRange(selectedWO.startTime, selectedWO.endTime)}
                </span>
                <span className="text-muted-foreground">Durasi per CSO</span>
                <span>{formatDuration(selectedWO.durationMinutes)}</span>
                <span className="text-muted-foreground">Slot CSO</span>
                <span>
                  {getFilledSlotCount(selectedWO)}/{selectedWO.requiredCso} terisi
                  {" "}({getOpenSlotCount(selectedWO)} terbuka)
                </span>
                <span className="text-muted-foreground">Komisi total</span>
                <span>{formatCurrency(selectedWO.commission)}</span>
                <span className="text-muted-foreground">Komisi per CSO</span>
                <span>{formatCurrency(getCommissionPerCso(selectedWO))}</span>
                <span className="text-muted-foreground">Status</span>
                <Badge className={statusColor[selectedWO.status]} variant="secondary">
                  {getStatusLabel(selectedWO.status)}
                </Badge>
              </div>

              <div>
                <p className="text-muted-foreground mb-2">Detail Slot CSO</p>
                <div className="space-y-1">
                  {selectedWO.slots.map((slot) => (
                    <div
                      key={slot.id}
                      className="flex items-center justify-between rounded border px-3 py-2 text-xs"
                    >
                      <span>Slot {slot.slotNumber}</span>
                      <span>
                        {slot.mitraName ?? (
                          <Badge variant="outline" className="text-blue-600">
                            Terbuka
                          </Badge>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
