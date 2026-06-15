"use client";

import { useState } from "react";
import {
  Search,
  CheckCircle,
  Ban,
  Trash2,
  Eye,
  MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useDataStore,
  formatCurrency,
  getMitraStatusLabel,
} from "@/stores/data-store";
import type { Mitra } from "@/types";

export default function MitraPage() {
  const mitra = useDataStore((s) => s.mitra);
  const updateMitraStatus = useDataStore((s) => s.updateMitraStatus);
  const deleteMitra = useDataStore((s) => s.deleteMitra);

  const [search, setSearch] = useState("");
  const [selectedMitra, setSelectedMitra] = useState<Mitra | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Mitra | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [ktpPreviewUrl, setKtpPreviewUrl] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Mitra | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectLoading, setRejectLoading] = useState(false);

  const filterMitra = (list: Mitra[]) => {
    const q = search.toLowerCase();
    return list.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q)
    );
  };

  const filtered = filterMitra(mitra);
  const pending = filterMitra(mitra.filter((m) => m.status === "pending"));
  const active = filterMitra(mitra.filter((m) => m.status === "active"));
  const suspended = filterMitra(mitra.filter((m) => m.status === "suspended"));

  const handleApprove = async (m: Mitra) => {
    await updateMitraStatus(m.id, "active");
    // Kirim email notifikasi approve
    await fetch("/api/mitra/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mitraId: m.id, type: "approved", email: m.email, name: m.name }),
    });
    toast.success(`Akun ${m.name} berhasil di-ACC — email notifikasi dikirim`);
  };

  const handleSuspend = async (m: Mitra) => {
    await updateMitraStatus(m.id, "suspended");
    toast.warning(`Akun ${m.name} di-suspend`);
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setRejectLoading(true);
    try {
      await updateMitraStatus(rejectTarget.id, "suspended");
      // Kirim email notifikasi reject
      await fetch("/api/mitra/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mitraId: rejectTarget.id,
          type: "rejected",
          email: rejectTarget.email,
          name: rejectTarget.name,
          reason: rejectReason,
        }),
      });
      toast.error(`Pendaftaran ${rejectTarget.name} ditolak — email notifikasi dikirim`);
      setRejectTarget(null);
      setRejectReason("");
    } catch {
      toast.error("Gagal menolak pendaftaran");
    } finally {
      setRejectLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteMitra(deleteTarget.id);
    toast.error(`Akun ${deleteTarget.name} dihapus permanen`);
    setDeleteTarget(null);
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: "bg-amber-100 text-amber-800",
      active: "bg-green-100 text-green-800",
      suspended: "bg-red-100 text-red-800",
    };
    return map[status] ?? "";
  };

  const MitraTable = ({ data }: { data: Mitra[] }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Nama</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Telepon</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>WO Selesai</TableHead>
          <TableHead>Komisi</TableHead>
          <TableHead className="text-right">Aksi</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
              Tidak ada data mitra
            </TableCell>
          </TableRow>
        ) : (
          data.map((m) => (
            <TableRow key={m.id}>
              <TableCell className="font-mono text-xs">{m.id}</TableCell>
              <TableCell className="font-medium">{m.name}</TableCell>
              <TableCell>{m.email}</TableCell>
              <TableCell>{m.phone}</TableCell>
              <TableCell>
                <Badge className={statusBadge(m.status)} variant="secondary">
                  {getMitraStatusLabel(m.status)}
                </Badge>
              </TableCell>
              <TableCell>{m.completedWO}</TableCell>
              <TableCell>{formatCurrency(m.totalCommission)}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="inline-flex size-8 items-center justify-center rounded-lg hover:bg-muted"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setSelectedMitra(m)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Lihat Detail
                    </DropdownMenuItem>
                    {m.status === "pending" && (
                      <DropdownMenuItem onClick={() => handleApprove(m)}>
                        <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                        Approve (ACC)
                      </DropdownMenuItem>
                    )}
                    {m.status === "pending" && (
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => { setRejectTarget(m); setRejectReason(""); }}
                      >
                        <Ban className="mr-2 h-4 w-4" />
                        Tolak Pendaftaran
                      </DropdownMenuItem>
                    )}
                    {m.status === "active" && (
                      <DropdownMenuItem onClick={() => handleSuspend(m)}>
                        <Ban className="mr-2 h-4 w-4 text-amber-600" />
                        Suspend
                      </DropdownMenuItem>
                    )}
                    {m.status === "suspended" && (
                      <DropdownMenuItem onClick={() => handleApprove(m)}>
                        <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                        Aktifkan Kembali
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setDeleteTarget(m)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Hapus Permanen
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <>
      <DashboardHeader
        title="Manajemen Akun Mitra"
        description="Approve, suspend, dan kelola akun mitra"
      />
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6 overflow-auto">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari nama, email, atau ID mitra..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => v && setActiveTab(v)}>
          <TabsList>
            <TabsTrigger value="all">Semua ({filtered.length})</TabsTrigger>
            <TabsTrigger value="pending">
              Menunggu ACC ({pending.length})
            </TabsTrigger>
            <TabsTrigger value="active">Aktif ({active.length})</TabsTrigger>
            <TabsTrigger value="suspended">
              Suspend ({suspended.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-4">
            <MitraTable data={filtered} />
          </TabsContent>
          <TabsContent value="pending" className="mt-4">
            <MitraTable data={pending} />
          </TabsContent>
          <TabsContent value="active" className="mt-4">
            <MitraTable data={active} />
          </TabsContent>
          <TabsContent value="suspended" className="mt-4">
            <MitraTable data={suspended} />
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!selectedMitra} onOpenChange={() => setSelectedMitra(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detail Mitra</DialogTitle>
            <DialogDescription>
              Profil dan riwayat aktivitas mitra
            </DialogDescription>
          </DialogHeader>
          {selectedMitra && (
            <div className="space-y-3 text-sm overflow-y-auto max-h-[60vh]">
              {/* Foto Profil */}
              {(selectedMitra as unknown as Record<string,string>).profilePhotoUrl && (
                <div className="flex flex-col items-center pb-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={(selectedMitra as unknown as Record<string,string>).profilePhotoUrl}
                    alt="Foto Profil"
                    className="w-20 h-20 rounded-full object-cover border-2 border-green-200 shadow"
                  />
                  <span className="text-xs text-muted-foreground mt-1">Foto Profil</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                <span className="text-muted-foreground">ID</span>
                <span className="font-mono text-xs">{selectedMitra.id}</span>
                {(selectedMitra as unknown as Record<string,string>).nik && (<><span className="text-muted-foreground">NIK KTP</span><span className="font-mono text-xs">{(selectedMitra as unknown as Record<string,string>).nik}</span></>)}
                <span className="text-muted-foreground">Nama Lengkap</span>
                <span className="font-medium">{selectedMitra.name}</span>
                <span className="text-muted-foreground">Email</span>
                <span>{selectedMitra.email}</span>
                <span className="text-muted-foreground">Telepon</span>
                <span>{selectedMitra.phone || "—"}</span>
                <span className="text-muted-foreground">Alamat KTP</span>
                <span className="text-xs">{selectedMitra.address ?? "—"}</span>
                {(selectedMitra as unknown as Record<string,string>).religion && (<><span className="text-muted-foreground">Agama</span><span>{(selectedMitra as unknown as Record<string,string>).religion}</span></>)}
                {(selectedMitra as unknown as Record<string,string>).gender && (<><span className="text-muted-foreground">Jenis Kelamin</span><span>{(selectedMitra as unknown as Record<string,string>).gender}</span></>)}
                {(selectedMitra as unknown as Record<string,string>).birthPlace && (<><span className="text-muted-foreground">Tempat Lahir</span><span>{(selectedMitra as unknown as Record<string,string>).birthPlace}</span></>)}
                {(selectedMitra as unknown as Record<string,string>).birthDate && (<><span className="text-muted-foreground">Tgl Lahir</span><span>{(selectedMitra as unknown as Record<string,string>).birthDate}</span></>)}
                {(selectedMitra as unknown as Record<string,string>).maritalStatus && (<><span className="text-muted-foreground">Status Kawin</span><span>{(selectedMitra as unknown as Record<string,string>).maritalStatus}</span></>)}
                {(selectedMitra as unknown as Record<string,string>).bankName && (
                  <>
                    <span className="text-muted-foreground col-span-2 font-semibold text-foreground pt-1">Rekening Bank</span>
                    <span className="text-muted-foreground">Nama Bank</span>
                    <span>{(selectedMitra as unknown as Record<string,string>).bankName}</span>
                    <span className="text-muted-foreground">No. Rekening</span>
                    <span className="font-mono">{(selectedMitra as unknown as Record<string,string>).bankAccountNumber}</span>
                    <span className="text-muted-foreground">Atas Nama</span>
                    <span>{(selectedMitra as unknown as Record<string,string>).bankAccountName}</span>
                  </>
                )}
                <span className="text-muted-foreground">Terdaftar</span>
                <span>{selectedMitra.registeredAt}</span>
                <span className="text-muted-foreground">Status</span>
                <Badge className={statusBadge(selectedMitra.status)} variant="secondary">
                  {getMitraStatusLabel(selectedMitra.status)}
                </Badge>
              </div>
              {(selectedMitra as unknown as Record<string,string>).ktpImageUrl && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Foto KTP:</p>
                  <button
                    type="button"
                    className="w-full"
                    onClick={() => setKtpPreviewUrl((selectedMitra as unknown as Record<string,string>).ktpImageUrl)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={(selectedMitra as unknown as Record<string,string>).ktpImageUrl}
                      alt="KTP"
                      className="w-full rounded-lg border object-contain max-h-44 cursor-zoom-in hover:opacity-90 transition-opacity"
                    />
                    <p className="text-xs text-center text-muted-foreground mt-1">🔍 Klik untuk perbesar</p>
                  </button>
                </div>
              )}
              {selectedMitra.status === "pending" && (
                <Button size="sm" className="w-full" onClick={async () => { await handleApprove(selectedMitra); setSelectedMitra(null); }}>
                  <CheckCircle className="mr-1 h-4 w-4" /> ACC — Aktifkan Akun
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Akun Mitra?</AlertDialogTitle>
            <AlertDialogDescription>
              Akun <strong>{deleteTarget?.name}</strong> akan dihapus permanen.
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus Permanen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => { if (!o) { setRejectTarget(null); setRejectReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak Pendaftaran</DialogTitle>
            <DialogDescription>
              Pendaftaran <strong>{rejectTarget?.name}</strong> akan ditolak dan mitra akan diberitahu via email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <label className="text-sm font-medium">Alasan Penolakan *</label>
            <Textarea
              placeholder="Contoh: Foto KTP tidak jelas, data tidak lengkap, NIK tidak valid..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Alasan ini akan dicantumkan dalam email yang dikirim ke mitra.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectTarget(null); setRejectReason(""); }}>
              Batal
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() || rejectLoading}
              onClick={handleReject}
            >
              {rejectLoading ? "Mengirim..." : "Tolak & Kirim Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* KTP Lightbox */}
      {ktpPreviewUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80"
          onClick={() => setKtpPreviewUrl(null)}
        >
          <div className="relative max-w-3xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ktpPreviewUrl}
              alt="KTP Full"
              className="w-full rounded-xl object-contain max-h-[80vh]"
            />
            <button
              type="button"
              onClick={() => setKtpPreviewUrl(null)}
              className="absolute -top-3 -right-3 bg-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg text-gray-700 hover:bg-gray-100 font-bold text-lg"
            >
              ×
            </button>
            <p className="text-center text-white/60 text-xs mt-2">Klik di luar gambar untuk tutup</p>
          </div>
        </div>
      )}
    </>
  );
}
