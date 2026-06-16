"use client";

import { useState } from "react";
import { Search, Camera, Filter, CheckCircle, XCircle, AlertCircle, Info, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useDataStore, getPayoutStatusLabel } from "@/stores/data-store";

function verificationBadge(status?: string) {
  const map: Record<string, string> = {
    pending_review: "bg-amber-100 text-amber-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  };
  const labels: Record<string, string> = {
    pending_review: "Menunggu Review",
    approved: "Disetujui",
    rejected: "Ditolak — Perlu Upload Ulang",
  };
  if (!status) return null;
  return (
    <Badge className={map[status] ?? ""} variant="secondary">
      {labels[status] ?? status}
    </Badge>
  );
}

export default function BuktiWoPage() {
  const proofs = useDataStore((s) => s.proofs);
  const workOrders = useDataStore((s) => s.workOrders);
  const payouts = useDataStore((s) => s.payouts);
  const mitra = useDataStore((s) => s.mitra);
  const verifySlot = useDataStore((s) => s.verifySlot);

  const [search, setSearch] = useState("");
  const [woFilter, setWoFilter] = useState("all");
  const [mitraFilter, setMitraFilter] = useState("all");
  const [reviewFilter, setReviewFilter] = useState("all");
  const [selectedSlotKey, setSelectedSlotKey] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // Reject dialog state
  const [rejectTarget, setRejectTarget] = useState<(typeof slotGroups)[0] | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectPhotos, setRejectPhotos] = useState<("before" | "after")[]>([]);
  const [rejectLoading, setRejectLoading] = useState(false);

  const getSlotData = (woId: string, slotId: string) => {
    const wo = workOrders.find((w) => w.id === woId);
    const slot = wo?.slots.find((s) => s.id === slotId);
    return { wo, slot };
  };

  const getPayout = (woId: string, slotId: string, mitraId: string) =>
    payouts.find((p) => p.woId === woId && p.slotId === slotId && p.mitraId === mitraId);

  const slotKeys = Array.from(
    new Set(proofs.map((p) => `${p.woId}__${p.slotId}__${p.mitraId}`))
  );

  const slotGroups = slotKeys.map((key) => {
    const [woId, slotId, mitraId] = key.split("__");
    const slotProofs = proofs.filter(
      (p) => p.woId === woId && p.slotId === slotId && p.mitraId === mitraId
    );
    const before = slotProofs.find((p) => p.proofType === "before");
    const after = slotProofs.find((p) => p.proofType === "after");
    const { wo, slot } = getSlotData(woId, slotId);
    const vStatus = slot?.verificationStatus;
    const payout = getPayout(woId, slotId, mitraId);
    return { key, woId, slotId, mitraId, before, after, vStatus, payout, slotProofs, wo, slot };
  });

  const filtered = slotGroups.filter((g) => {
    const proof = g.before ?? g.after;
    if (!proof) return false;
    const matchSearch =
      g.woId.toLowerCase().includes(search.toLowerCase()) ||
      proof.woTitle.toLowerCase().includes(search.toLowerCase()) ||
      proof.mitraName.toLowerCase().includes(search.toLowerCase());
    const matchWo = woFilter === "all" || g.woId === woFilter;
    const matchMitra = mitraFilter === "all" || g.mitraId === mitraFilter;
    const matchReview =
      reviewFilter === "all" ||
      g.vStatus === reviewFilter ||
      (!g.vStatus && reviewFilter === "pending_review");
    return matchSearch && matchWo && matchMitra && matchReview;
  });

  const pendingCount = slotGroups.filter(
    (g) => g.vStatus === "pending_review" || !g.vStatus
  ).length;

  const handleApprove = async (group: (typeof slotGroups)[0]) => {
    setProcessing(true);
    try {
      await verifySlot(group.woId, group.mitraId, "approve");
      // Kirim notifikasi ke mitra
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "slot_approved",
          title: "✅ Pekerjaan Disetujui!",
          body: `Pekerjaan ${group.before?.woTitle ?? group.woId} Anda telah disetujui admin. Komisi segera diproses.`,
          target: "mitra",
          mitra_id: group.mitraId,
          data: { woId: group.woId },
        }),
      });
      toast.success("Pekerjaan disetujui — lanjut upload bukti transfer di Bagi Hasil");
      setSelectedSlotKey(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyetujui");
    } finally {
      setProcessing(false);
    }
  };

  const openRejectDialog = (group: (typeof slotGroups)[0]) => {
    setRejectTarget(group);
    setRejectReason("");
    // Default: pre-select all photos that exist
    const defaults: ("before" | "after")[] = [];
    if (group.before) defaults.push("before");
    if (group.after) defaults.push("after");
    setRejectPhotos(defaults);
  };

  const toggleRejectPhoto = (type: "before" | "after") => {
    setRejectPhotos((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    if (rejectPhotos.length === 0) {
      toast.error("Pilih minimal 1 foto yang ditolak");
      return;
    }
    if (!rejectReason.trim()) {
      toast.error("Alasan penolakan wajib diisi");
      return;
    }
    setRejectLoading(true);
    try {
      await verifySlot(rejectTarget.woId, rejectTarget.mitraId, "reject", rejectPhotos, rejectReason.trim());
      const photoLabel = rejectPhotos.length === 2
        ? "Semua foto"
        : rejectPhotos.includes("before") ? "Foto sebelum" : "Foto setelah";
      // Kirim notifikasi ke mitra dengan alasan
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "slot_rejected",
          title: "⚠️ Foto Pekerjaan Ditolak",
          body: `${photoLabel} untuk WO ${rejectTarget.before?.woTitle ?? rejectTarget.woId} ditolak. Alasan: ${rejectReason.trim()}. Silakan upload foto yang benar — slot masih milik Anda.`,
          target: "mitra",
          mitra_id: rejectTarget.mitraId,
          data: { woId: rejectTarget.woId, reason: rejectReason.trim(), rejectedPhotos: rejectPhotos },
        }),
      });
      toast.warning(`${photoLabel} ditolak — mitra diberi notifikasi untuk upload ulang. Slot tetap milik mitra.`);
      setRejectTarget(null);
      setRejectReason("");
      setRejectPhotos([]);
      setSelectedSlotKey(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menolak");
    } finally {
      setRejectLoading(false);
    }
  };

  const selectedGroup = filtered.find((g) => g.key === selectedSlotKey);

  return (
    <>
      <DashboardHeader
        title="Bukti Penyelesaian WO"
        description="Review foto sebelum & sesudah pekerjaan dari mitra CSO"
      />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 overflow-auto">

        {/* Info algoritma reject */}
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 flex items-start gap-2">
          <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-800">
            <strong>Alur reject:</strong> Saat foto ditolak, slot WO tetap milik mitra —
            status kembali ke "sedang dikerjakan" dan mitra bisa upload foto ulang yang benar.
            WO tidak hilang dari akun mitra.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard title="Total Slot" value={filtered.length} icon={Camera} description="Slot dengan bukti foto" />
          <StatCard title="Menunggu Review" value={pendingCount} icon={Filter} description="Perlu dicek admin" />
          <StatCard title="Sudah Disetujui" value={slotGroups.filter((g) => g.vStatus === "approved").length} icon={CheckCircle} description="Siap transfer komisi" />
        </div>

        {/* Filter */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />Filter Bukti
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Cari WO, judul, atau nama mitra..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={reviewFilter} onValueChange={(v) => setReviewFilter(v ?? "all")}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Status review" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Review</SelectItem>
                <SelectItem value="pending_review">Menunggu Review</SelectItem>
                <SelectItem value="approved">Disetujui</SelectItem>
                <SelectItem value="rejected">Ditolak</SelectItem>
              </SelectContent>
            </Select>
            <Select value={woFilter} onValueChange={(v) => setWoFilter(v ?? "all")}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Semua WO" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua WO</SelectItem>
                {workOrders.map((wo) => <SelectItem key={wo.id} value={wo.id}>{wo.id}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={mitraFilter} onValueChange={(v) => setMitraFilter(v ?? "all")}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Semua Mitra" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Mitra</SelectItem>
                {mitra.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Grid bukti */}
        {filtered.length === 0 ? (
          <Card><CardContent className="py-16 text-center text-muted-foreground">Belum ada bukti penyelesaian.</CardContent></Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((group) => {
              const label = group.before?.mitraName ?? group.after?.mitraName ?? "";
              const woTitle = group.before?.woTitle ?? group.after?.woTitle ?? "";
              return (
                <Card key={group.key} className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedSlotKey(group.key)}>
                  <div className="grid grid-cols-2 gap-0.5 bg-muted">
                    <div className="relative aspect-[4/3] bg-muted">
                      {group.before
                        ? <img src={group.before.imageUrl} alt="Before" className="object-cover w-full h-full" />
                        : <div className="flex items-center justify-center h-full text-xs text-muted-foreground">Belum ada</div>}
                      <span className="absolute top-1 left-1 bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded font-semibold">SEBELUM</span>
                    </div>
                    <div className="relative aspect-[4/3] bg-muted">
                      {group.after
                        ? <img src={group.after.imageUrl} alt="After" className="object-cover w-full h-full" />
                        : <div className="flex items-center justify-center h-full text-xs text-muted-foreground">Belum ada</div>}
                      <span className="absolute top-1 left-1 bg-green-600 text-white text-[10px] px-1.5 py-0.5 rounded font-semibold">SETELAH</span>
                    </div>
                  </div>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="font-mono text-xs">{group.woId}</Badge>
                      {verificationBadge(group.vStatus ?? "pending_review")}
                    </div>
                    <p className="text-sm font-medium line-clamp-1">{woTitle}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    {group.payout && <Badge variant="outline" className="text-[10px]">{getPayoutStatusLabel(group.payout.status)}</Badge>}

                    {/* Action buttons on card */}
                    {(group.vStatus === "pending_review" || !group.vStatus) && group.after && (
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" className="flex-1 h-8" disabled={processing}
                          onClick={(e) => { e.stopPropagation(); handleApprove(group); }}>
                          <CheckCircle className="h-3 w-3 mr-1" />Setujui
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 h-8 text-red-600 border-red-200 hover:bg-red-50"
                          disabled={processing}
                          onClick={(e) => { e.stopPropagation(); openRejectDialog(group); }}>
                          <XCircle className="h-3 w-3 mr-1" />Tolak
                        </Button>
                      </div>
                    )}
                    {group.vStatus === "rejected" && (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 rounded px-2 py-1.5">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          Menunggu upload ulang dari mitra
                        </div>
                        {group.slot?.rejectedPhotoTypes && (
                          <div className="flex gap-1">
                            {group.slot.rejectedPhotoTypes.includes("before") && (
                              <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">Sebelum ditolak</span>
                            )}
                            {group.slot.rejectedPhotoTypes.includes("after") && (
                              <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Setelah ditolak</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Detail Dialog ── */}
      <Dialog open={!!selectedSlotKey} onOpenChange={() => setSelectedSlotKey(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Bukti Penyelesaian</DialogTitle>
          </DialogHeader>
          {selectedGroup && (
            <div className="space-y-4">
              {/* Info WO + Mitra */}
              <div className="rounded-lg border bg-muted/40 p-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                <span className="text-muted-foreground">ID WO</span>
                <span className="font-mono font-semibold">{selectedGroup.woId}</span>
                <span className="text-muted-foreground">Judul</span>
                <span className="font-medium line-clamp-1">{selectedGroup.before?.woTitle ?? selectedGroup.after?.woTitle ?? "—"}</span>
                <span className="text-muted-foreground">Mitra</span>
                <span>{selectedGroup.before?.mitraName ?? selectedGroup.after?.mitraName ?? "—"}</span>
                <span className="text-muted-foreground">Slot</span>
                <span>{selectedGroup.slot?.slotNumber ? `Slot ${selectedGroup.slot.slotNumber}` : "—"}</span>
                <span className="text-muted-foreground">Progress</span>
                <span>{selectedGroup.slot?.progress ?? 0}%</span>
                <span className="text-muted-foreground">Status</span>
                <span>{verificationBadge(selectedGroup.vStatus ?? "pending_review")}</span>
              </div>

              <Separator />

              {/* Foto tabs */}
              <Tabs defaultValue="before">
                <TabsList>
                  <TabsTrigger value="before">📷 Foto Sebelum</TabsTrigger>
                  <TabsTrigger value="after">✅ Foto Setelah</TabsTrigger>
                </TabsList>
                <TabsContent value="before">
                  {selectedGroup.before ? (
                    <div className="space-y-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={selectedGroup.before.imageUrl} alt="Foto sebelum" className="w-full rounded-lg object-contain max-h-72 border" />
                      {selectedGroup.before.remark && (
                        <div className="rounded-md bg-orange-50 border border-orange-100 p-3">
                          <p className="text-xs font-semibold text-orange-700 mb-1">Catatan Mitra:</p>
                          <p className="text-sm text-orange-900">{selectedGroup.before.remark}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-8 text-center">Foto sebelum belum diunggah</p>
                  )}
                </TabsContent>
                <TabsContent value="after">
                  {selectedGroup.after ? (
                    <div className="space-y-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={selectedGroup.after.imageUrl} alt="Foto setelah" className="w-full rounded-lg object-contain max-h-72 border" />
                      {selectedGroup.after.remark && (
                        <div className="rounded-md bg-green-50 border border-green-100 p-3">
                          <p className="text-xs font-semibold text-green-700 mb-1">Catatan Mitra:</p>
                          <p className="text-sm text-green-900">{selectedGroup.after.remark}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-8 text-center">Foto setelah belum diunggah</p>
                  )}
                </TabsContent>
              </Tabs>

              {/* Action buttons di dialog */}
              {(selectedGroup.vStatus === "pending_review" || !selectedGroup.vStatus) && selectedGroup.after && (
                <div className="flex gap-2 pt-2">
                  <Button className="flex-1" disabled={processing} onClick={() => handleApprove(selectedGroup)}>
                    <CheckCircle className="mr-2 h-4 w-4" />Pekerjaan Sesuai — Setujui
                  </Button>
                  <Button variant="outline" className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                    disabled={processing}
                    onClick={() => openRejectDialog(selectedGroup)}>
                    <XCircle className="mr-2 h-4 w-4" />Foto Tidak Sesuai — Tolak
                  </Button>
                </div>
              )}

              {selectedGroup.vStatus === "rejected" && (
                <div className="rounded-md bg-amber-50 border border-amber-200 p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-amber-800">Foto sudah ditolak</p>
                      <p className="text-xs text-amber-700 mt-0.5">Mitra sedang diminta upload foto ulang. Slot tetap milik mitra.</p>
                    </div>
                  </div>
                  {selectedGroup.slot?.rejectedPhotoTypes && (
                    <div className="flex gap-2 pl-6">
                      {selectedGroup.slot.rejectedPhotoTypes.includes("before") && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">📷 Sebelum ditolak</span>
                      )}
                      {selectedGroup.slot.rejectedPhotoTypes.includes("after") && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">✅ Setelah ditolak</span>
                      )}
                    </div>
                  )}
                  {selectedGroup.slot?.rejectionReason && (
                    <p className="text-xs text-amber-800 pl-6 italic">Alasan: {selectedGroup.slot.rejectionReason}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Reject Dialog — pilih foto + alasan ── */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => { if (!o) { setRejectTarget(null); setRejectReason(""); setRejectPhotos([]); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <XCircle className="h-5 w-5" />
              Tolak Foto Pekerjaan
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md bg-blue-50 border border-blue-100 p-3 flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-800">
                <strong>Slot tetap milik mitra.</strong> Hanya foto yang dipilih yang akan dihapus.
                Mitra mendapat notifikasi dan bisa upload ulang foto yang salah.
              </p>
            </div>

            {/* Pilih foto yang ditolak */}
            <div>
              <p className="text-sm font-medium mb-2">
                Foto yang Ditolak <span className="text-red-500">*</span>
              </p>
              <div className="grid grid-cols-2 gap-2">
                {/* Tombol sebelum */}
                <button
                  type="button"
                  onClick={() => toggleRejectPhoto("before")}
                  disabled={!rejectTarget?.before}
                  className={[
                    "relative rounded-lg border-2 overflow-hidden transition-all text-left",
                    !rejectTarget?.before
                      ? "opacity-40 cursor-not-allowed border-muted"
                      : rejectPhotos.includes("before")
                      ? "border-red-500 ring-2 ring-red-200"
                      : "border-muted hover:border-red-300",
                  ].join(" ")}
                >
                  <div className="aspect-[4/3] bg-muted">
                    {rejectTarget?.before ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={rejectTarget.before.imageUrl} alt="Sebelum" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className={[
                    "px-2 py-1.5 flex items-center gap-1.5 text-xs font-semibold",
                    rejectPhotos.includes("before") ? "bg-red-50 text-red-700" : "text-muted-foreground",
                  ].join(" ")}>
                    <div className={[
                      "w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0",
                      rejectPhotos.includes("before") ? "bg-red-500 border-red-500" : "border-muted-foreground",
                    ].join(" ")}>
                      {rejectPhotos.includes("before") && <span className="text-white text-[8px] leading-none">✓</span>}
                    </div>
                    📷 Foto Sebelum
                  </div>
                  {!rejectTarget?.before && (
                    <div className="absolute inset-0 flex items-end justify-center pb-1">
                      <span className="text-[10px] text-muted-foreground bg-background/80 px-1 rounded">Belum ada</span>
                    </div>
                  )}
                </button>

                {/* Tombol setelah */}
                <button
                  type="button"
                  onClick={() => toggleRejectPhoto("after")}
                  disabled={!rejectTarget?.after}
                  className={[
                    "relative rounded-lg border-2 overflow-hidden transition-all text-left",
                    !rejectTarget?.after
                      ? "opacity-40 cursor-not-allowed border-muted"
                      : rejectPhotos.includes("after")
                      ? "border-red-500 ring-2 ring-red-200"
                      : "border-muted hover:border-red-300",
                  ].join(" ")}
                >
                  <div className="aspect-[4/3] bg-muted">
                    {rejectTarget?.after ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={rejectTarget.after.imageUrl} alt="Setelah" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className={[
                    "px-2 py-1.5 flex items-center gap-1.5 text-xs font-semibold",
                    rejectPhotos.includes("after") ? "bg-red-50 text-red-700" : "text-muted-foreground",
                  ].join(" ")}>
                    <div className={[
                      "w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0",
                      rejectPhotos.includes("after") ? "bg-red-500 border-red-500" : "border-muted-foreground",
                    ].join(" ")}>
                      {rejectPhotos.includes("after") && <span className="text-white text-[8px] leading-none">✓</span>}
                    </div>
                    ✅ Foto Setelah
                  </div>
                  {!rejectTarget?.after && (
                    <div className="absolute inset-0 flex items-end justify-center pb-1">
                      <span className="text-[10px] text-muted-foreground bg-background/80 px-1 rounded">Belum ada</span>
                    </div>
                  )}
                </button>
              </div>
              {rejectPhotos.length === 0 && (
                <p className="text-xs text-red-500 mt-1">Pilih minimal 1 foto yang ditolak</p>
              )}
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Alasan Penolakan <span className="text-red-500">*</span></p>
              <Textarea
                placeholder="Contoh: Foto tidak jelas / buram. Foto tidak menunjukkan area yang dikerjakan. Mohon foto ulang dengan pencahayaan yang cukup."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Alasan ini akan dikirim sebagai notifikasi ke mitra.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectTarget(null); setRejectReason(""); setRejectPhotos([]); }} disabled={rejectLoading}>
              Batal
            </Button>
            <Button
              variant="destructive"
              disabled={rejectPhotos.length === 0 || !rejectReason.trim() || rejectLoading}
              onClick={handleReject}
            >
              {rejectLoading
                ? "Menolak..."
                : rejectPhotos.length === 2
                ? "Tolak Semua Foto"
                : rejectPhotos.includes("before")
                ? "Tolak Foto Sebelum"
                : "Tolak Foto Setelah"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
