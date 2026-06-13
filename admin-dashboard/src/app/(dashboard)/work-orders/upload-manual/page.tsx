"use client";

import { useState } from "react";
import { FilePlus, Plus, CalendarDays, List, Users, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WOCalendar } from "@/components/work-orders/wo-calendar";
import {
  useDataStore,
  formatCurrency,
  getStatusLabel,
} from "@/stores/data-store";
import {
  formatDuration,
  formatTimeRange,
  getOpenSlotCount,
} from "@/lib/work-order-utils";

const CATEGORIES = [
  "Kebersihan",
  "Instalasi",
  "IT Support",
  "Maintenance",
  "Elektrikal",
  "Survey",
  "Lainnya",
];

const DURATION_PRESETS = [
  { label: "30 menit", value: 30 },
  { label: "60 menit", value: 60 },
  { label: "90 menit", value: 90 },
  { label: "2 jam", value: 120 },
  { label: "3 jam", value: 180 },
  { label: "4 jam", value: 240 },
];

const initialForm = {
  title: "",
  description: "",
  category: "",
  location: "",
  commission: "",
  workDate: "",
  startTime: "",
  endTime: "",
  durationMinutes: "60",
  requiredCso: "1",
};

export default function UploadManualPage() {
  const workOrders = useDataStore((s) => s.workOrders);
  const addWorkOrder = useDataStore((s) => s.addWorkOrder);
  const deleteWorkOrder = useDataStore((s) => s.deleteWorkOrder);

  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [listView, setListView] = useState("kalender");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const requiredCso = parseInt(form.requiredCso, 10) || 1;
  const durationMinutes = parseInt(form.durationMinutes, 10) || 60;
  const commissionTotal = parseInt(form.commission, 10) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !form.title ||
      !form.category ||
      !form.location ||
      !form.commission ||
      !form.workDate ||
      !form.startTime ||
      !form.endTime ||
      !form.durationMinutes ||
      !form.requiredCso
    ) {
      toast.error("Lengkapi semua field wajib");
      return;
    }

    if (form.endTime <= form.startTime) {
      toast.error("Jam selesai harus setelah jam mulai");
      return;
    }

    if (requiredCso < 1) {
      toast.error("Minimal 1 CSO dibutuhkan");
      return;
    }

    setLoading(true);
    await new Promise((r) => setTimeout(r, 400));

    await addWorkOrder({
      title: form.title,
      description: form.description,
      category: form.category,
      location: form.location,
      commission: commissionTotal,
      workDate: form.workDate,
      startTime: form.startTime,
      endTime: form.endTime,
      durationMinutes,
      requiredCso,
      slots: [],
      status: "available",
    });

    toast.success(
      `Work Order dibuat! ${requiredCso} slot CSO terbuka untuk mitra.`
    );
    setForm(initialForm);
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteWorkOrder(deleteId);
      toast.success("Work Order berhasil dihapus");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus WO");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const statusColor = (status: string) => {
    const map: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      available: "bg-blue-100 text-blue-800",
      in_progress: "bg-purple-100 text-purple-800",
      completed: "bg-green-100 text-green-800",
      verified: "bg-emerald-100 text-emerald-800",
    };
    return map[status] ?? "";
  };

  return (
    <>
      <DashboardHeader
        title="Upload Work Order Manual"
        description="Input pekerjaan per jam — sistem slot CSO (Custodian Service Officer)"
      />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 overflow-auto">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FilePlus className="h-4 w-4" />
                Form Input WO
              </CardTitle>
              <CardDescription>
                Contoh: Pembersihan 60 menit, butuh 3 CSO → sistem buka 3 slot
                terpisah untuk mitra ambil.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Judul Pekerjaan *</Label>
                  <Input
                    id="title"
                    placeholder="Contoh: Pembersihan Lobi Gedung"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Deskripsi</Label>
                  <Textarea
                    id="description"
                    placeholder="Detail pekerjaan yang harus dikerjakan..."
                    rows={3}
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Kategori *</Label>
                    <Select
                      value={form.category}
                      onValueChange={(v) =>
                        v && setForm({ ...form, category: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih kategori" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Lokasi *</Label>
                    <Input
                      id="location"
                      placeholder="Kota / Area"
                      value={form.location}
                      onChange={(e) =>
                        setForm({ ...form, location: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="rounded-lg border bg-muted/40 p-3 space-y-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Jadwal Pekerjaan
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="workDate">Tanggal Pekerjaan *</Label>
                    <Input
                      id="workDate"
                      type="date"
                      value={form.workDate}
                      onChange={(e) =>
                        setForm({ ...form, workDate: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startTime">Jam Mulai *</Label>
                      <Input
                        id="startTime"
                        type="time"
                        value={form.startTime}
                        onChange={(e) =>
                          setForm({ ...form, startTime: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endTime">Jam Selesai *</Label>
                      <Input
                        id="endTime"
                        type="time"
                        value={form.endTime}
                        min={form.startTime || undefined}
                        onChange={(e) =>
                          setForm({ ...form, endTime: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border bg-muted/40 p-3 space-y-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Sistem Per Jam & Slot CSO
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Durasi per CSO *</Label>
                      <Select
                        value={form.durationMinutes}
                        onValueChange={(v) =>
                          v && setForm({ ...form, durationMinutes: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DURATION_PRESETS.map((d) => (
                            <SelectItem key={d.value} value={String(d.value)}>
                              {d.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="requiredCso">Jumlah CSO Dibutuhkan *</Label>
                      <Input
                        id="requiredCso"
                        type="number"
                        min="1"
                        max="20"
                        placeholder="3"
                        value={form.requiredCso}
                        onChange={(e) =>
                          setForm({ ...form, requiredCso: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>
                  <div className="flex items-start gap-2 rounded-md bg-blue-50 border border-blue-100 p-2 text-xs text-blue-800">
                    <Users className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>
                      Akan dibuka <strong>{requiredCso} slot</strong> untuk CSO.
                      Setiap mitra ambil 1 slot = 1 orang mengerjakan selama{" "}
                      <strong>{formatDuration(durationMinutes)}</strong>.
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="commission">Komisi Total (Rp) *</Label>
                    <Input
                      id="commission"
                      type="number"
                      min="0"
                      placeholder="450000"
                      value={form.commission}
                      onChange={(e) =>
                        setForm({ ...form, commission: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Komisi per CSO</Label>
                    <div className="flex h-8 items-center rounded-md border bg-muted/50 px-3 text-sm">
                      {commissionTotal > 0
                        ? formatCurrency(
                            Math.round(commissionTotal / requiredCso)
                          )
                        : "—"}
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  <Plus className="mr-2 h-4 w-4" />
                  {loading
                    ? "Menyimpan..."
                    : `Buat WO — ${requiredCso} Slot CSO`}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Daftar Work Order</CardTitle>
                  <CardDescription>
                    {workOrders.length} WO terdaftar
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={listView} onValueChange={(v) => v && setListView(v)}>
                <TabsList className="mb-4">
                  <TabsTrigger value="kalender" className="gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Kalender
                  </TabsTrigger>
                  <TabsTrigger value="tabel" className="gap-1">
                    <List className="h-3.5 w-3.5" />
                    Tabel
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="kalender">
                  <WOCalendar workOrders={workOrders} />
                </TabsContent>

                <TabsContent value="tabel">
                  <div className="max-h-[500px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Judul</TableHead>
                          <TableHead>Tgl</TableHead>
                          <TableHead>Jam</TableHead>
                          <TableHead>Slot</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {workOrders.map((wo) => (
                          <TableRow key={wo.id}>
                            <TableCell className="font-mono text-xs">
                              {wo.id}
                            </TableCell>
                            <TableCell className="max-w-[120px] truncate font-medium">
                              {wo.title}
                            </TableCell>
                            <TableCell className="text-xs whitespace-nowrap">
                              {wo.workDate
                                ? format(new Date(wo.workDate), "dd/MM/yy", {
                                    locale: localeId,
                                  })
                                : "—"}
                            </TableCell>
                            <TableCell className="text-xs whitespace-nowrap">
                              {formatTimeRange(wo.startTime, wo.endTime)}
                            </TableCell>
                            <TableCell className="text-xs">
                              <Badge variant="outline">
                                {getOpenSlotCount(wo)}/{wo.requiredCso} CSO
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={statusColor(wo.status)}
                                variant="secondary"
                              >
                                {getStatusLabel(wo.status)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                disabled={wo.status === "in_progress"}
                                title={
                                  wo.status === "in_progress"
                                    ? "Tidak bisa hapus WO yang sedang dikerjakan"
                                    : "Hapus WO"
                                }
                                onClick={() => setDeleteId(wo.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
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
      </div>

      {/* Konfirmasi Hapus WO */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Work Order?</AlertDialogTitle>
            <AlertDialogDescription>
              WO <span className="font-mono font-semibold">{deleteId}</span> akan
              dihapus permanen beserta data payout dan bukti terkait. Tindakan ini
              tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Menghapus..." : "Ya, Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
