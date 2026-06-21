"use client";

import { useState } from "react";
import { Download, Calendar } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

interface ExcelDownloadButtonProps {
  /** Called with (startDate, endDate) when user clicks download. Dates can be empty for "all". */
  onDownload: (startDate: string, endDate: string) => void;
  /** Button label */
  label?: string;
  /** Loading state */
  loading?: boolean;
}

export function ExcelDownloadButton({
  onDownload,
  label = "Download Excel",
  loading = false,
}: ExcelDownloadButtonProps) {
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleDownload = () => {
    onDownload(startDate, endDate);
    setOpen(false);
  };

  const handleDownloadAll = () => {
    onDownload("", "");
    setOpen(false);
  };

  const periodLabel =
    startDate && endDate
      ? `${format(new Date(startDate), "dd MMM yyyy", { locale: localeId })} – ${format(new Date(endDate), "dd MMM yyyy", { locale: localeId })}`
      : startDate
        ? `Mulai ${format(new Date(startDate), "dd MMM yyyy", { locale: localeId })}`
        : endDate
          ? `Sampai ${format(new Date(endDate), "dd MMM yyyy", { locale: localeId })}`
          : undefined;

  // Quick presets
  const setPreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(end.toISOString().split("T")[0]);
  };

  const setThisMonth = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(now.toISOString().split("T")[0]);
  };

  const setLastMonth = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(end.toISOString().split("T")[0]);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 border-green-300 text-green-700 hover:bg-green-50 hover:text-green-800"
        onClick={() => setOpen(true)}
        disabled={loading}
      >
        <Download className="h-4 w-4" />
        {loading ? "Mengunduh..." : label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-600" />
              Download Excel
            </DialogTitle>
            <DialogDescription>
              Pilih periode data yang ingin diunduh, atau download semua data.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Quick presets */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Periode Cepat</Label>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" className="text-xs h-7" onClick={() => setPreset(7)}>
                  7 Hari Terakhir
                </Button>
                <Button type="button" variant="outline" size="sm" className="text-xs h-7" onClick={() => setPreset(30)}>
                  30 Hari Terakhir
                </Button>
                <Button type="button" variant="outline" size="sm" className="text-xs h-7" onClick={setThisMonth}>
                  Bulan Ini
                </Button>
                <Button type="button" variant="outline" size="sm" className="text-xs h-7" onClick={setLastMonth}>
                  Bulan Lalu
                </Button>
                <Button type="button" variant="outline" size="sm" className="text-xs h-7" onClick={() => setPreset(90)}>
                  3 Bulan Terakhir
                </Button>
              </div>
            </div>

            {/* Custom date range */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="dl-start">Tanggal Mulai</Label>
                <Input
                  id="dl-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dl-end">Tanggal Akhir</Label>
                <Input
                  id="dl-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            {periodLabel && (
              <p className="text-xs text-muted-foreground bg-green-50 rounded px-3 py-2 border border-green-100">
                📅 Periode: <strong>{periodLabel}</strong>
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleDownloadAll}>
              <Download className="h-4 w-4 mr-1" />
              Download Semua
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleDownload}
              disabled={!startDate && !endDate}
            >
              <Download className="h-4 w-4 mr-1" />
              Download Periode
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Helper to get formatted period label */
export function getPeriodLabel(startDate: string, endDate: string): string | undefined {
  if (!startDate && !endDate) return undefined;
  const fmt = (d: string) => format(new Date(d), "dd MMM yyyy", { locale: localeId });
  if (startDate && endDate) return `${fmt(startDate)} – ${fmt(endDate)}`;
  if (startDate) return `Mulai ${fmt(startDate)}`;
  return `Sampai ${fmt(endDate)}`;
}

/** Helper to filter data by date field within a period */
export function filterByPeriod<T>(
  data: T[],
  dateField: keyof T,
  startDate: string,
  endDate: string
): T[] {
  if (!startDate && !endDate) return data;
  return data.filter((item) => {
    const val = item[dateField];
    if (!val) return false;
    const d = String(val);
    if (startDate && d < startDate) return false;
    if (endDate && d > endDate) return false;
    return true;
  });
}
