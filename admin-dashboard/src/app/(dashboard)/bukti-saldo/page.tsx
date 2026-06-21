"use client";

import { useMemo, useState } from "react";
import { PaginationControls, paginateArray } from "@/components/ui/pagination-controls";
import { ExcelDownloadButton, filterByPeriod, getPeriodLabel } from "@/components/ui/excel-download-button";
import { exportToExcel } from "@/lib/excel-export";
import { Search, Receipt, Filter } from "lucide-react";

import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import {
  useDataStore,
  formatCurrency,
  getPayoutStatusLabel,
} from "@/stores/data-store";

export default function BuktiSaldoPage() {
  const payouts = useDataStore((s) => s.payouts);
  const mitra = useDataStore((s) => s.mitra);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [mitraFilter, setMitraFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = payouts.filter((p) => {
    const matchSearch =
      p.woId.toLowerCase().includes(search.toLowerCase()) ||
      p.mitraName.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    const matchMitra = mitraFilter === "all" || p.mitraId === mitraFilter;
    return matchSearch && matchStatus && matchMitra;
  });

  const totalAmount = filtered.reduce((s, p) => s + p.amount, 0);
  const paidCount = filtered.filter((p) => p.status === "paid").length;
  const paginatedData = useMemo(() => paginateArray(filtered, currentPage, pageSize), [filtered, currentPage, pageSize]);

  const handleExcelDownload = (startDate: string, endDate: string) => {
    const data = filterByPeriod(filtered, "createdAt", startDate, endDate);
    exportToExcel({
      title: "Bukti Bagi Hasil Saldo",
      subtitle: `${data.length} record bukti bagi hasil`,
      periodLabel: getPeriodLabel(startDate, endDate),
      filename: `bukti_bagi_hasil_${new Date().toISOString().split("T")[0]}`,
      columns: [
        { header: "ID Bukti", key: "id", width: 14 },
        { header: "ID WO", key: "woId", width: 16 },
        { header: "Judul WO", key: "woTitle", width: 28 },
        { header: "Nama Mitra", key: "mitraName", width: 22 },
        { header: "Jumlah", key: "amount", width: 16, format: (v) => formatCurrency(v as number) },
        { header: "Status", key: "status", width: 16, format: (v) => getPayoutStatusLabel(v as import("@/types").PayoutStatus) },
        { header: "Tgl Dibuat", key: "createdAt", width: 14 },
        { header: "Tgl Dibayar", key: "paidAt", width: 14 },
        { header: "Bukti Transfer", key: "transferProofUrl", width: 20, format: (v) => v ? "Ada" : "—" },
      ],
      data: data as unknown as Record<string, unknown>[],
    });
  };

  const statusColor = (status: string) => {
    const map: Record<string, string> = {
      pending: "bg-amber-100 text-amber-800",
      approved: "bg-blue-100 text-blue-800",
      paid: "bg-green-100 text-green-800",
    };
    return map[status] ?? "";
  };

  return (
    <>
      <DashboardHeader
        title="Bukti Bagi Hasil Saldo"
        description="Rekap bukti distribusi komisi berdasarkan WO selesai mitra"
      />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 overflow-auto">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            title="Total Record"
            value={filtered.length}
            icon={Receipt}
            description="Bukti bagi hasil"
          />
          <StatCard
            title="Total Nilai"
            value={formatCurrency(totalAmount)}
            icon={Receipt}
            description="Dalam filter aktif"
          />
          <StatCard
            title="Sudah Dibayar"
            value={paidCount}
            icon={Receipt}
            description="Transaksi lunas"
          />
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base">Rekap Bukti Bagi Hasil</CardTitle>
              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Cari..."
                    className="pl-9 w-48"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                  />
                </div>
                <Select value={statusFilter} onValueChange={(v) => { if (v) { setStatusFilter(v); setCurrentPage(1); } }}>
                  <SelectTrigger className="w-36">
                    <Filter className="mr-2 h-3 w-3" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="pending">Menunggu</SelectItem>
                    <SelectItem value="approved">Disetujui</SelectItem>
                    <SelectItem value="paid">Dibayar</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={mitraFilter} onValueChange={(v) => { if (v) { setMitraFilter(v); setCurrentPage(1); } }}>
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Semua Mitra" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Mitra</SelectItem>
                    {mitra.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <ExcelDownloadButton
                  label="Download Excel"
                  onDownload={handleExcelDownload}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Bukti</TableHead>
                  <TableHead>ID WO</TableHead>
                  <TableHead>Judul WO</TableHead>
                  <TableHead>Mitra</TableHead>
                  <TableHead>Jumlah</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tgl Dibuat</TableHead>
                  <TableHead>Tgl Dibayar</TableHead>
                  <TableHead>Bukti Transfer</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Tidak ada data bukti bagi hasil
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.id}</TableCell>
                      <TableCell className="font-mono text-xs">{p.woId}</TableCell>
                      <TableCell className="max-w-[180px] truncate">{p.woTitle}</TableCell>
                      <TableCell>{p.mitraName}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(p.amount)}</TableCell>
                      <TableCell>
                        <Badge className={statusColor(p.status)} variant="secondary">
                          {getPayoutStatusLabel(p.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(p.createdAt), "dd MMM yyyy", { locale: localeId })}
                      </TableCell>
                      <TableCell className="text-sm">
                        {p.paidAt
                          ? format(new Date(p.paidAt), "dd MMM yyyy", { locale: localeId })
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {p.transferProofUrl ? (
                          <a
                            href={p.transferProofUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-emerald-700 hover:underline"
                          >
                            Lihat foto
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <PaginationControls
              totalItems={filtered.length}
              currentPage={currentPage}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              itemLabel="record"
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
