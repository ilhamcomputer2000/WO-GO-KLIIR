"use client";

import { useMemo, useState } from "react";
import {
  Search, CalendarDays, List, MapPin, Users, Camera,
  Filter, Pencil, Trash2, Save, X,
} from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { WOCalendar } from "@/components/work-orders/wo-calendar";
import { useDataStore, formatCurrency, getStatusLabel } from "@/stores/data-store";
import type { WorkOrder, WorkOrderStatus } from "@/types";
import { formatDuration, formatTimeRange, getAssignedMitraLabel, getCommissionPerCso, getFilledSlotCount, getOpenSlotCount } from "@/lib/work-order-utils";

const STATUS_TABS = [
  { value: "all", label: "Semua" },
  { value: "available", label: "Tersedia" },
  { value: "in_progress", label: "Dikerjakan" },
  { value: "completed", label: "Selesai" },
  { value: "verified", label: "Terverifikasi" },
];

function statusColor(status: string) {
  const map: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    available: "bg-blue-100 text-blue-800",
    in_progress: "bg-purple-100 text-purple-800",
    completed: "bg-green-100 text-green-800",
    verified: "bg-emerald-100 text-emerald-800",
  };
  return map[status] ?? "";
}

function slotStatusLabel(status: string) {
  return ({ open: "Terbuka", taken: "Dikerjakan", completed: "Selesai" } as Record<string, string>)[status] ?? status;
}

export default function TrackingWoMitraPage() {
  const workOrders = useDataStore((s) => s.workOrders);
  const mitra = useDataStore((s) => s.mitra);
  const proofs = useDataStore((s) => s.proofs);
  const deleteWorkOrder = useDataStore((s) => s.deleteWorkOrder);
  const sync = useDataStore((s) => s.sync);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [mitraFilter, setMitraFilter] = useState("all");
  const [listView, setListView] = useState("kalender");
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkOrder | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editTarget, setEditTarget] = useState<WorkOrder | null>(null);
  const [editForm, setEditForm] = useState<Partial<WorkOrder>>({});
  const [editLoading, setEditLoading] = useState(false);

  const filtered = useMemo(() => workOrders.filter((wo) => {
    const q = search.toLowerCase();
    return (
      (!q || wo.id.toLowerCase().includes(q) || wo.title.toLowerCase().includes(q) ||
        wo.location.toLowerCase().includes(q) || wo.category.toLowerCase().includes(q) ||
        getAssignedMitraLabel(wo).toLowerCase().includes(q)) &&
      (statusFilter === "all" || wo.status === statusFilter) &&
      (mitraFilter === "all" || wo.slots.some((s) => s.mitraId === mitraFilter))
    );
  }), [workOrders, search, statusFilter, mitraFilter]);

  const stats = useMemo(() => ({
    total: filtered.length,
    available: filtered.filter((w) => w.status === "available").length,
    inProgress: filtered.filter((w) => w.status === "in_progress").length,
    completed: filtered.filter((w) => w.status === "completed" || w.status === "verified").length,
  }), [filtered]);

  const getProofForSlot = (woId: string, slotId: string) =>
    proofs.find((p) => p.woId === woId && p.slotId === slotId);

  const openEdit = (wo: WorkOrder) => {
    setEditTarget(wo);
    setEditForm({ title: wo.title, description: wo.description, category: wo.category, location: wo.location, commission: wo.commission, workDate: wo.workDate, startTime: wo.startTime, endTime: wo.endTime });
  };

  const handleSaveEdit = async () => {
    if (!editTarget || !editForm.title || !editForm.location || !editForm.workDate) {
      toast.error("Judul, lokasi, dan tanggal wajib diisi"); return;
    }
    setEditLoading(true);
    try {
      const res = await fetch(`/api/work-orders/${editTarget.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editForm),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? "Gagal update WO"); }
      await sync();
      toast.success("Work Order berhasil diperbarui");
      setEditTarget(null);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Gagal memperbarui WO"); }
    finally { setEditLoading(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteWorkOrder(deleteTarget.id);
      toast.success("Work Order berhasil dihapus");
      setDeleteTarget(null); setSelectedWO(null);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Gagal menghapus WO"); }
    finally { setDeleting(false); }
  };

  return (
    <>
      <DashboardHeader title="Tracking WO Mitra" description="Pantau status pekerjaan, slot CSO, progress mitra secara real-time" />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 overflow-auto">
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total WO" value={stats.total} icon={List} description="Sesuai filter" />
          <StatCard title="Tersedia" value={stats.available} icon={CalendarDays} description="Menunggu mitra ambil slot" />
          <StatCard title="Dikerjakan" value={stats.inProgress} icon={Users} description="Sedang berjalan" />
          <StatCard title="Selesai" value={stats.completed} icon={Filter} description="Completed & verified" />
        </div>

        {/* Filter */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Filter className="h-4 w-4" />Filter Tracking</CardTitle>
            <CardDescription>Data WO sama seperti Upload WO Manual</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Cari ID, judul, lokasi, kategori, atau nama mitra..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Select value={mitraFilter} onValueChange={(v) => setMitraFilter(v ?? "all")}>
                <SelectTrigger className="w-full sm:w-52"><SelectValue placeholder="Semua Mitra" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Mitra</SelectItem>
                  {mitra.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Tabs value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
              <TabsList>
                {STATUS_TABS.map((tab) => {
                  const count = tab.value === "all" ? workOrders.length
                    : tab.value === "completed" ? workOrders.filter((w) => w.status === "completed" || w.status === "verified").length
                    : workOrders.filter((w) => w.status === tab.value).length;
                  return <TabsTrigger key={tab.value} value={tab.value}>{tab.label} ({count})</TabsTrigger>;
                })}
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        {/* List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daftar Work Order</CardTitle>
            <CardDescription>{filtered.length} WO — kalender & tabel tracking mitra</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={listView} onValueChange={(v) => v && setListView(v)}>
              <TabsList className="mb-4">
                <TabsTrigger value="kalender" className="gap-1"><CalendarDays className="h-3.5 w-3.5" />Kalender</TabsTrigger>
                <TabsTrigger value="tabel" className="gap-1"><List className="h-3.5 w-3.5" />Tabel</TabsTrigger>
              </TabsList>
              <TabsContent value="kalender"><WOCalendar workOrders={filtered} /></TabsContent>
              <TabsContent value="tabel">
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead><TableHead>Judul</TableHead><TableHead>Tgl</TableHead>
                        <TableHead>Jam</TableHead><TableHead>Lokasi</TableHead><TableHead>Slot CSO</TableHead>
                        <TableHead>Mitra</TableHead><TableHead>Progress</TableHead><TableHead>Status</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.length === 0 ? (
                        <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">Tidak ada WO</TableCell></TableRow>
                      ) : filtered.map((wo) => (
                        <TableRow key={wo.id}>
                          <TableCell className="font-mono text-xs">{wo.id}</TableCell>
                          <TableCell className="max-w-[140px] truncate font-medium">{wo.title}</TableCell>
                          <TableCell className="text-xs whitespace-nowrap">{wo.workDate ? format(new Date(wo.workDate), "dd/MM/yy", { locale: localeId }) : "—"}</TableCell>
                          <TableCell className="text-xs whitespace-nowrap">{formatTimeRange(wo.startTime, wo.endTime)}</TableCell>
                          <TableCell className="text-xs max-w-[100px] truncate">
                            <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3 shrink-0" />{wo.location}</span>
                          </TableCell>
                          <TableCell className="text-xs">
                            <Badge variant="outline">{getFilledSlotCount(wo)}/{wo.requiredCso} CSO</Badge>
                            {getOpenSlotCount(wo) > 0 && <p className="text-[10px] text-muted-foreground mt-0.5">{getOpenSlotCount(wo)} terbuka</p>}
                          </TableCell>
                          <TableCell className="text-xs max-w-[120px] truncate">{getAssignedMitraLabel(wo)}</TableCell>
                          <TableCell className="text-xs">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                                <div className="h-full bg-primary rounded-full" style={{ width: `${wo.progress}%` }} />
                              </div>
                              <span>{wo.progress}%</span>
                            </div>
                          </TableCell>
                          <TableCell><Badge className={statusColor(wo.status)} variant="secondary">{getStatusLabel(wo.status)}</Badge></TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="outline" size="sm" onClick={() => setSelectedWO(wo)}>Detail</Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50" title="Edit WO" onClick={() => openEdit(wo)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                title={wo.status === "in_progress" ? "Tidak bisa hapus WO yang sedang dikerjakan" : "Hapus WO"}
                                disabled={wo.status === "in_progress"} onClick={() => setDeleteTarget(wo)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedWO} onOpenChange={() => setSelectedWO(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-2">
              <DialogTitle className="leading-tight">{selectedWO?.title}</DialogTitle>
              <div className="flex gap-1 shrink-0">
                <Button variant="outline" size="sm" className="h-7 gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                  onClick={() => { selectedWO && openEdit(selectedWO); setSelectedWO(null); }}>
                  <Pencil className="h-3.5 w-3.5" />Edit
                </Button>
                <Button variant="outline" size="sm" className="h-7 gap-1 text-destructive border-red-200 hover:bg-red-50"
                  disabled={selectedWO?.status === "in_progress"}
                  onClick={() => { setDeleteTarget(selectedWO); setSelectedWO(null); }}>
                  <Trash2 className="h-3.5 w-3.5" />Hapus
                </Button>
              </div>
            </div>
          </DialogHeader>
          {selectedWO && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">ID WO</span><span className="font-mono text-xs">{selectedWO.id}</span>
                <span className="text-muted-foreground">Kategori</span><span>{selectedWO.category}</span>
                <span className="text-muted-foreground">Lokasi</span><span>{selectedWO.location}</span>
                <span className="text-muted-foreground">Tanggal</span><span>{format(new Date(selectedWO.workDate), "dd MMM yyyy", { locale: localeId })}</span>
                <span className="text-muted-foreground">Jam</span><span>{formatTimeRange(selectedWO.startTime, selectedWO.endTime)}</span>
                <span className="text-muted-foreground">Durasi per CSO</span><span>{formatDuration(selectedWO.durationMinutes)}</span>
                <span className="text-muted-foreground">Komisi total</span><span>{formatCurrency(selectedWO.commission)}</span>
                <span className="text-muted-foreground">Komisi per CSO</span><span>{formatCurrency(getCommissionPerCso(selectedWO))}</span>
                <span className="text-muted-foreground">Progress</span><span className="font-semibold">{selectedWO.progress}%</span>
                <span className="text-muted-foreground">Status</span>
                <Badge className={statusColor(selectedWO.status)} variant="secondary">{getStatusLabel(selectedWO.status as WorkOrderStatus)}</Badge>
              </div>
              {selectedWO.description && <p className="text-xs text-muted-foreground border rounded-md p-2">{selectedWO.description}</p>}
              <div>
                <p className="font-medium mb-2 flex items-center gap-1"><Users className="h-4 w-4" />Tracking Slot CSO & Mitra</p>
                <div className="space-y-2">
                  {selectedWO.slots.map((slot) => {
                    const proof = getProofForSlot(selectedWO.id, slot.id);
                    const hasProof = !!(slot.beforePhotoUrl || slot.afterPhotoUrl || proof);
                    return (
                      <div key={slot.id} className="rounded-lg border p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-xs">Slot {slot.slotNumber}</span>
                          <Badge variant="outline" className="text-xs">{slotStatusLabel(slot.status)}</Badge>
                        </div>
                        {slot.mitraName ? (
                          <>
                            <div className="flex justify-between text-xs"><span className="text-muted-foreground">Mitra</span><span className="font-medium">{slot.mitraName}</span></div>
                            <div className="flex justify-between text-xs items-center">
                              <span className="text-muted-foreground">Progress</span>
                              <div className="flex items-center gap-2">
                                <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                                  <div className="h-full bg-primary rounded-full" style={{ width: `${slot.progress ?? 0}%` }} />
                                </div>
                                <span>{slot.progress ?? 0}%</span>
                              </div>
                            </div>
                            <div className="flex justify-between text-xs items-center">
                              <span className="text-muted-foreground">Bukti foto</span>
                              {hasProof ? <span className="inline-flex items-center gap-1 text-emerald-700"><Camera className="h-3 w-3" />Ada bukti</span>
                                : <span className="text-muted-foreground">Belum diunggah</span>}
                            </div>
                          </>
                        ) : <p className="text-xs text-blue-600">Slot terbuka — menunggu mitra ambil</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => { if (!o) setEditTarget(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4 text-blue-600" />Edit Work Order — {editTarget?.id}
            </DialogTitle>
          </DialogHeader>
          {editTarget && (
            <div className="space-y-3">
              <div className="space-y-1.5"><Label>Judul Pekerjaan *</Label><Input value={editForm.title ?? ""} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Deskripsi</Label><Textarea rows={3} value={editForm.description ?? ""} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Kategori</Label><Input value={editForm.category ?? ""} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Lokasi *</Label><Input value={editForm.location ?? ""} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} /></div>
              </div>
              <div className="space-y-1.5"><Label>Tanggal *</Label><Input type="date" value={editForm.workDate ?? ""} onChange={(e) => setEditForm({ ...editForm, workDate: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Jam Mulai</Label><Input type="time" value={editForm.startTime ?? ""} onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Jam Selesai</Label><Input type="time" value={editForm.endTime ?? ""} onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })} /></div>
              </div>
              <div className="space-y-1.5"><Label>Komisi Total (Rp)</Label><Input type="number" min="0" value={editForm.commission ?? ""} onChange={(e) => setEditForm({ ...editForm, commission: Number(e.target.value) })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)} disabled={editLoading}><X className="h-4 w-4 mr-1" />Batal</Button>
            <Button onClick={handleSaveEdit} disabled={editLoading}><Save className="h-4 w-4 mr-1" />{editLoading ? "Menyimpan..." : "Simpan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Work Order?</AlertDialogTitle>
            <AlertDialogDescription>
              WO <span className="font-mono font-semibold">{deleteTarget?.id}</span> — <strong>{deleteTarget?.title}</strong> akan dihapus permanen. Tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Menghapus..." : "Ya, Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
