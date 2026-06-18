"use client";

import { useState } from "react";
import {
  Search,
  CheckCircle,
  Ban,
  Trash2,
  Eye,
  EyeOff,
  MoreHorizontal,
  Pencil,
  Save,
  Loader2,
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";
import { apiAdminResetMitraPassword } from "@/lib/api-client";
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
import { Label } from "@/components/ui/label";
import type { Mitra } from "@/types";

export default function MitraPage() {
  const mitra = useDataStore((s) => s.mitra);
  const updateMitraStatus = useDataStore((s) => s.updateMitraStatus);
  const updateMitraProfile = useDataStore((s) => s.updateMitraProfile);
  const deleteMitra = useDataStore((s) => s.deleteMitra);

  const [search, setSearch] = useState("");
  const [selectedMitra, setSelectedMitra] = useState<Mitra | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Mitra | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [ktpPreviewUrl, setKtpPreviewUrl] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Mitra | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectLoading, setRejectLoading] = useState(false);
  const [editTarget, setEditTarget] = useState<Mitra | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [editLoading, setEditLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

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

  const openEditDialog = (m: Mitra) => {
    const ext = m as unknown as Record<string, string>;
    setEditForm({
      name: m.name || "",
      email: m.email || "",
      phone: m.phone || "",
      address: m.address || "",
      nik: ext.nik || "",
      religion: ext.religion || "",
      birthPlace: ext.birthPlace || "",
      birthDate: ext.birthDate || "",
      maritalStatus: ext.maritalStatus || "",
      gender: ext.gender || "",
      bankName: ext.bankName || "",
      bankAccountNumber: ext.bankAccountNumber || "",
      bankAccountName: ext.bankAccountName || "",
    });
    setEditTarget(m);
    setNewPassword("");
    setConfirmPassword("");
    setShowPassword(false);
  };

  const handleEditSave = async () => {
    if (!editTarget) return;
    setEditLoading(true);
    try {
      await updateMitraProfile(editTarget.id, editForm);
      toast.success(`Data ${editForm.name || editTarget.name} berhasil diperbarui`);
      setEditTarget(null);
    } catch {
      toast.error("Gagal menyimpan perubahan");
    } finally {
      setEditLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!editTarget) return;
    if (newPassword.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Konfirmasi password tidak cocok");
      return;
    }
    setPasswordLoading(true);
    try {
      await apiAdminResetMitraPassword(editTarget.id, newPassword);
      toast.success(`Password ${editTarget.name} berhasil diubah`);
      setNewPassword("");
      setConfirmPassword("");
      setShowPassword(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengubah password");
    } finally {
      setPasswordLoading(false);
    }
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
                    <DropdownMenuItem onClick={() => openEditDialog(m)}>
                      <Pencil className="mr-2 h-4 w-4 text-blue-600" />
                      Edit Akun
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

      {/* Edit Akun Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => { if (!o) setEditTarget(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-blue-600" />
              Edit Akun Mitra
            </DialogTitle>
            <DialogDescription>
              Perbarui data akun <strong>{editTarget?.name}</strong>
            </DialogDescription>
          </DialogHeader>
          {editTarget && (
            <div className="space-y-5">
              {/* Data Pribadi */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 border-b pb-1">Data Pribadi</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-name">Nama Lengkap</Label>
                    <Input
                      id="edit-name"
                      value={editForm.name ?? ""}
                      onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-email">Email</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={editForm.email ?? ""}
                      onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-phone">Telepon</Label>
                    <Input
                      id="edit-phone"
                      value={editForm.phone ?? ""}
                      onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-nik">NIK KTP</Label>
                    <Input
                      id="edit-nik"
                      value={editForm.nik ?? ""}
                      onChange={(e) => setEditForm((f) => ({ ...f, nik: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-gender">Jenis Kelamin</Label>
                    <Input
                      id="edit-gender"
                      placeholder="Laki-Laki / Perempuan"
                      value={editForm.gender ?? ""}
                      onChange={(e) => setEditForm((f) => ({ ...f, gender: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-religion">Agama</Label>
                    <Input
                      id="edit-religion"
                      value={editForm.religion ?? ""}
                      onChange={(e) => setEditForm((f) => ({ ...f, religion: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-birthPlace">Tempat Lahir</Label>
                    <Input
                      id="edit-birthPlace"
                      value={editForm.birthPlace ?? ""}
                      onChange={(e) => setEditForm((f) => ({ ...f, birthPlace: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-birthDate">Tanggal Lahir</Label>
                    <Input
                      id="edit-birthDate"
                      type="date"
                      value={editForm.birthDate ?? ""}
                      onChange={(e) => setEditForm((f) => ({ ...f, birthDate: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-maritalStatus">Status Perkawinan</Label>
                    <Input
                      id="edit-maritalStatus"
                      placeholder="Belum Menikah / Menikah / Cerai"
                      value={editForm.maritalStatus ?? ""}
                      onChange={(e) => setEditForm((f) => ({ ...f, maritalStatus: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="edit-address">Alamat KTP</Label>
                    <Textarea
                      id="edit-address"
                      rows={2}
                      value={editForm.address ?? ""}
                      onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Rekening Bank */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 border-b pb-1">Rekening Bank</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-bankName">Nama Bank</Label>
                    <Input
                      id="edit-bankName"
                      placeholder="BCA, BRI, Mandiri, dll."
                      value={editForm.bankName ?? ""}
                      onChange={(e) => setEditForm((f) => ({ ...f, bankName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-bankAccountNumber">No. Rekening</Label>
                    <Input
                      id="edit-bankAccountNumber"
                      value={editForm.bankAccountNumber ?? ""}
                      onChange={(e) => setEditForm((f) => ({ ...f, bankAccountNumber: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="edit-bankAccountName">Atas Nama Rekening</Label>
                    <Input
                      id="edit-bankAccountName"
                      value={editForm.bankAccountName ?? ""}
                      onChange={(e) => setEditForm((f) => ({ ...f, bankAccountName: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Ganti Password */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 border-b pb-1 flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-amber-600" />
                  Ganti Password
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-newPassword">Password Baru</Label>
                    <div className="relative">
                      <Input
                        id="edit-newPassword"
                        type={showPassword ? "text" : "password"}
                        placeholder="Minimal 6 karakter"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword((v) => !v)}
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-confirmPassword">Konfirmasi Password</Label>
                    <Input
                      id="edit-confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Ulangi password baru"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                      disabled={!newPassword || !confirmPassword || passwordLoading}
                      onClick={handlePasswordReset}
                    >
                      {passwordLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Menyimpan...
                        </>
                      ) : (
                        <>
                          <KeyRound className="mr-2 h-4 w-4" />
                          Simpan Password Baru
                        </>
                      )}
                    </Button>
                    {newPassword && confirmPassword && newPassword !== confirmPassword && (
                      <p className="text-xs text-red-500 mt-1">Password tidak cocok</p>
                    )}
                    {newPassword && newPassword.length > 0 && newPassword.length < 6 && (
                      <p className="text-xs text-red-500 mt-1">Password minimal 6 karakter</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditTarget(null)} disabled={editLoading}>
              Batal
            </Button>
            <Button onClick={handleEditSave} disabled={editLoading || !editForm.name?.trim()}>
              {editLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Simpan Perubahan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
