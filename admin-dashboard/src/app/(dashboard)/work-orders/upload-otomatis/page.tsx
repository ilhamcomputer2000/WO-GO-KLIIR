"use client";

import { useState, useRef } from "react";
import { FileUp, Upload, Download, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useDataStore } from "@/stores/data-store";
import type { WorkOrderStatus } from "@/types";

interface ParsedRow {
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
  status: WorkOrderStatus;
  slots: [];
}

const CSV_TEMPLATE = `title,description,category,location,commission,work_date,start_time,end_time,duration_minutes,required_cso
Pembersihan Lobi,Deep cleaning lobi gedung,Kebersihan,Jakarta Barat,450000,2025-07-01,07:00,11:00,60,3
Instalasi CCTV,Instalasi 8 unit CCTV,Instalasi,Bali,900000,2025-07-05,08:00,17:00,120,1
Perbaikan Generator,Service rutin generator 50 KVA,Maintenance,Semarang,1100000,2025-07-10,09:00,15:00,90,2`;

function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const rows: ParsedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    if (values.length < 6) continue;

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? "";
    });

    const commission = parseInt(row.commission, 10);
    if (!row.title || isNaN(commission)) continue;

    rows.push({
      title: row.title,
      description: row.description || "",
      category: row.category || "Lainnya",
      location: row.location || "",
      commission,
      workDate:
        row.work_date ||
        row.workdate ||
        row.deadline ||
        new Date().toISOString().split("T")[0],
      startTime: row.start_time || row.starttime || "08:00",
      endTime: row.end_time || row.endtime || "17:00",
      durationMinutes: parseInt(row.duration_minutes || row.durationminutes || "60", 10),
      requiredCso: parseInt(row.required_cso || row.requiredcso || "1", 10),
      status: "available",
      slots: [],
    });
  }

  return rows;
}

export default function UploadOtomatisPage() {
  const addWorkOrdersBatch = useDataStore((s) => s.addWorkOrdersBatch);
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCSV(text);
      if (rows.length === 0) {
        toast.error("File tidak valid atau format tidak sesuai");
        return;
      }
      setParsed(rows);
      setFileName(file.name);
      toast.success(`${rows.length} WO berhasil di-parse`);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleImport = async () => {
    if (parsed.length === 0) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    await addWorkOrdersBatch(parsed);
    toast.success(`${parsed.length} Work Order berhasil diimport!`);
    setParsed([]);
    setFileName("");
    setLoading(false);
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template_wo.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <DashboardHeader
        title="Upload Work Order Otomatis"
        description="Input WO via file batch (CSV/Excel)"
      />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 overflow-auto">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileUp className="h-4 w-4" />
                  Upload File Batch
                </CardTitle>
                <CardDescription>
                  Upload file CSV dengan format kolom: title, description, category,
                  location, commission, work_date, start_time, end_time, duration_minutes, required_cso
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-10 text-center hover:border-primary/50 transition-colors cursor-pointer"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="font-medium">Drag & drop file CSV di sini</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    atau klik untuk memilih file
                  </p>
                  {fileName && (
                    <Badge className="mt-3" variant="secondary">
                      {fileName}
                    </Badge>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFile(file);
                    }}
                  />
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" onClick={downloadTemplate} className="flex-1">
                    <Download className="mr-2 h-4 w-4" />
                    Download Template
                  </Button>
                  {parsed.length > 0 && (
                    <Button onClick={handleImport} disabled={loading} className="flex-1">
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      {loading ? "Mengimport..." : `Import ${parsed.length} WO`}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Format File</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto">
                  {CSV_TEMPLATE}
                </pre>
                <p className="text-xs text-muted-foreground mt-2">
                  * Saat ini mendukung format CSV. File Excel (.xlsx) dapat dikonversi ke CSV terlebih dahulu.
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Preview Data</CardTitle>
              <CardDescription>
                {parsed.length > 0
                  ? `${parsed.length} baris siap diimport`
                  : "Upload file untuk melihat preview"}
              </CardDescription>
            </CardHeader>
            <CardContent className="max-h-[500px] overflow-auto">
              {parsed.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <FileUp className="h-12 w-12 mb-3 opacity-30" />
                  <p className="text-sm">Belum ada data untuk di-preview</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Judul</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Lokasi</TableHead>
                      <TableHead>Komisi</TableHead>
                      <TableHead>Tgl</TableHead>
                      <TableHead>Waktu</TableHead>
                      <TableHead>CSO</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsed.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium max-w-[120px] truncate">
                          {row.title}
                        </TableCell>
                        <TableCell>{row.category}</TableCell>
                        <TableCell>{row.location}</TableCell>
                        <TableCell>
                          {new Intl.NumberFormat("id-ID", {
                            style: "currency",
                            currency: "IDR",
                            minimumFractionDigits: 0,
                          }).format(row.commission)}
                        </TableCell>
                        <TableCell>{row.workDate}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {row.startTime} – {row.endTime}
                        </TableCell>
                        <TableCell>{row.requiredCso} slot</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
