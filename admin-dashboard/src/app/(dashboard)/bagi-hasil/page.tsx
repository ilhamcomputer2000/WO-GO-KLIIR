"use client";

import { useRef, useMemo, useState } from "react";
import { PaginationControls, paginateArray } from "@/components/ui/pagination-controls";
import { ExcelDownloadButton, filterByPeriod, getPeriodLabel } from "@/components/ui/excel-download-button";
import { exportToExcel } from "@/lib/excel-export";
import {
  Search,
  CheckCircle,
  DollarSign,
  Upload,
  ImageIcon,
  Clock,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  useDataStore,
  formatCurrency,
  getPayoutStatusLabel,
} from "@/stores/data-store";

export default function BagiHasilPage() {
  const payouts = useDataStore((s) => s.payouts);
  const mitra = useDataStore((s) => s.mitra);
  const uploadTransferProof = useDataStore((s) => s.uploadTransferProof);
  const updatePayoutStatus = useDataStore((s) => s.updatePayoutStatus);

  const [search, setSearch] = useState("");
  const [mitraFilter, setMitraFilter] = useState("all");
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [activePayoutTab, setActivePayoutTab] = useState("pending");

  const filtered = payouts.filter((p) => {
    const matchSearch =
      p.woId.toLowerCase().includes(search.toLowerCase()) ||
      p.woTitle.toLowerCase().includes(search.toLowerCase()) ||
      p.mitraName.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase());
    const matchMitra = mitraFilter === "all" || p.mitraId === mitraFilter;
    return matchSearch && matchMitra && p.status !== "rejected";
  });

  const pendingList = filtered.filter((p) => p.status === "pending");
  const approvedList = filtered.filter((p) => p.status === "approved");
  const paidList = filtered.filter((p) => p.status === "paid");

  const totalPaid = paidList.reduce((s, p) => s + p.amount, 0);
  const totalApproved = approvedList.reduce((s, p) => s + p.amount, 0);

  const handleApprove = async (payoutId: string) => {
    setApprovingId(payoutId);
    try {
      await updatePayoutStatus(payoutId, "approved");
      toast.success("Pekerjaan disetujui — siap upload bukti transfer");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyetujui");
    } finally {
      setApprovingId(null);
    }
  };

  const handleUpload = async (payoutId: string, file: File) => {
    setUploadingId(payoutId);
    try {
      await uploadTransferProof(payoutId, file);
      toast.success("Bukti transfer diunggah — komisi ditandai sudah dibayar");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload gagal");
    } finally {
      setUploadingId(null);
    }
  };

  const statusColor = (status: string) => {
    const map: Record<string, string> = {
      pending: "bg-amber-100 text-amber-800",
      approved: "bg-blue-100 text-blue-800",
      paid: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
    };
    return map[status] ?? "";
  };

  const PayoutRow = ({ p }: { p: (typeof payouts)[0] }) => (
    <TableRow key={p.id}>
      <TableCell className="font-mono text-xs">{p.id}</TableCell>
      <TableCell>
        <p className="font-mono text-xs">{p.woId}</p>
        <p className="text-xs text-muted-foreground truncate max-w-[140px]">
          {p.woTitle}
        </p>
      </TableCell>
      <TableCell>{p.mitraName}</TableCell>
      <TableCell className="font-medium">{formatCurrency(p.amount)}</TableCell>
      <TableCell>
        <Badge className={statusColor(p.status)} variant="secondary">
          {getPayoutStatusLabel(p.status)}
        </Badge>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {p.verifiedAt
          ? format(new Date(p.verifiedAt), "dd/MM/yy", { locale: localeId })
          : "—"}
      </TableCell>
      <TableCell className="text-right">
        {p.status === "pending" && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-green-700 border-green-300 hover:bg-green-50"
            disabled={approvingId === p.id}
            onClick={() => handleApprove(p.id)}
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            {approvingId === p.id ? "Menyetujui..." : "Setujui Pekerjaan"}
          </Button>
        )}
        {p.status === "approved" && (
          <>
            <input
              ref={(el) => {
                fileRefs.current[p.id] = el;
              }}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(p.id, file);
                e.target.value = "";
              }}
            />
            <Button
              size="sm"
              disabled={uploadingId === p.id}
              onClick={() => fileRefs.current[p.id]?.click()}
            >
              <Upload className="h-3 w-3 mr-1" />
              {uploadingId === p.id ? "Mengunggah..." : "Upload Bukti Transfer"}
            </Button>
          </>
        )}
        {p.status === "paid" && p.transferProofUrl && (
          <a
            href={p.transferProofUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:underline"
          >
            <ImageIcon className="h-3 w-3" />
            Lihat bukti
          </a>
        )}
      </TableCell>
    </TableRow>
  );

  return (
    <>
      <DashboardHeader
        title="Bagi Hasil per ID WO"
        description="Setujui pekerjaan mitra lalu upload bukti transfer komisi"
      />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 overflow-auto">
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-4">
          <StatCard
            title="Menunggu Persetujuan"
            value={pendingList.length}
            icon={Clock}
            description="Perlu disetujui admin"
          />
          <StatCard
            title="Siap Transfer"
            value={formatCurrency(totalApproved)}
            icon={CheckCircle}
            description={`${approvedList.length} payout disetujui`}
          />
          <StatCard
            title="Sudah Ditransfer"
            value={formatCurrency(totalPaid)}
            icon={DollarSign}
            description={`${paidList.length} komisi lunas`}
          />
          <StatCard
            title="Total Tersaring"
            value={filtered.length}
            icon={Search}
            description="Record aktif"
          />
        </div>

        {/* Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari ID WO, mitra, judul..."
              className="pl-9"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <Select
            value={mitraFilter}
            onValueChange={(v) => { if (v) { setMitraFilter(v); setCurrentPage(1); } }}
          >
            <SelectTrigger className="w-full sm:w-48">
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
            onDownload={(start, end) => {
              const data = filterByPeriod(filtered, "createdAt", start, end);
              exportToExcel({
                title: "Bagi Hasil per WO",
                subtitle: `${data.length} record payout`,
                periodLabel: getPeriodLabel(start, end),
                filename: `bagi_hasil_${new Date().toISOString().split("T")[0]}`,
                columns: [
                  { header: "ID Payout", key: "id", width: 14 },
                  { header: "ID WO", key: "woId", width: 16 },
                  { header: "Judul WO", key: "woTitle", width: 28 },
                  { header: "Nama Mitra", key: "mitraName", width: 22 },
                  { header: "Komisi", key: "amount", width: 16, format: (v) => formatCurrency(v as number) },
                  { header: "Status", key: "status", width: 20, format: (v) => getPayoutStatusLabel(v as import("@/types").PayoutStatus) },
                  { header: "Tgl Dibuat", key: "createdAt", width: 14 },
                  { header: "Tgl Verifikasi", key: "verifiedAt", width: 14 },
                  { header: "Tgl Dibayar", key: "paidAt", width: 14 },
                ],
                data: data as unknown as Record<string, unknown>[],
              });
            }}
          />
        </div>

        {/* Tabs per status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Distribusi Komisi Mitra</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activePayoutTab} onValueChange={(v) => { if (v) { setActivePayoutTab(v); setCurrentPage(1); } }}>
              <TabsList className="mb-4">
                <TabsTrigger value="pending" className="gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  Menunggu Setujui
                  {pendingList.length > 0 && (
                    <span className="ml-1 rounded-full bg-amber-500 text-white text-[10px] px-1.5">
                      {pendingList.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="approved" className="gap-1">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Siap Transfer
                  {approvedList.length > 0 && (
                    <span className="ml-1 rounded-full bg-blue-500 text-white text-[10px] px-1.5">
                      {approvedList.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="paid" className="gap-1">
                  <DollarSign className="h-3.5 w-3.5" />
                  Sudah Transfer
                </TabsTrigger>
                <TabsTrigger value="all" className="gap-1">
                  Semua
                </TabsTrigger>
              </TabsList>

              {(["pending", "approved", "paid", "all"] as const).map((tab) => {
                const rows =
                  tab === "all"
                    ? filtered
                    : tab === "pending"
                      ? pendingList
                      : tab === "approved"
                        ? approvedList
                        : paidList;
                const paginatedRows = tab === activePayoutTab ? paginateArray(rows, currentPage, pageSize) : rows;
                return (
                  <TabsContent key={tab} value={tab}>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID Payout</TableHead>
                          <TableHead>WO</TableHead>
                          <TableHead>Mitra</TableHead>
                          <TableHead>Komisi</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Tgl Verifikasi</TableHead>
                          <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={7}
                              className="text-center py-8 text-muted-foreground"
                            >
                              {tab === "pending"
                                ? "Tidak ada payout menunggu persetujuan"
                                : tab === "approved"
                                  ? "Tidak ada payout siap transfer"
                                  : tab === "paid"
                                    ? "Belum ada komisi yang ditransfer"
                                    : "Belum ada record bagi hasil"}
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedRows.map((p) => <PayoutRow key={p.id} p={p} />)
                        )}
                      </TableBody>
                    </Table>
                    {tab === activePayoutTab && (
                      <PaginationControls
                        totalItems={rows.length}
                        currentPage={currentPage}
                        pageSize={pageSize}
                        onPageChange={setCurrentPage}
                        onPageSizeChange={setPageSize}
                        itemLabel="payout"
                      />
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
          </CardContent>
        </Card>

        {/* Info alur */}
        <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">Alur Bagi Hasil:</p>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-amber-100 text-amber-800" variant="secondary">
              Menunggu
            </Badge>
            <span>→ Admin klik Setujui Pekerjaan →</span>
            <Badge className="bg-blue-100 text-blue-800" variant="secondary">
              Siap Transfer
            </Badge>
            <span>→ Upload Bukti Transfer →</span>
            <Badge className="bg-green-100 text-green-800" variant="secondary">
              Sudah Transfer
            </Badge>
          </div>
          <p className="text-xs mt-1">
            Setelah admin upload bukti transfer, status di aplikasi mitra otomatis
            berubah menjadi &ldquo;Komisi sudah ditransfer ✓&rdquo;
          </p>
        </div>
      </div>
    </>
  );
}
