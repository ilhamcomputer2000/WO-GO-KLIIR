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
} from "@/components/ui/dialog";
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
    toast.success(`Akun ${m.name} berhasil di-ACC`);
  };

  const handleSuspend = async (m: Mitra) => {
    await updateMitraStatus(m.id, "suspended");
    toast.warning(`Akun ${m.name} di-suspend`);
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
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">ID Mitra</span>
                <span className="font-mono">{selectedMitra.id}</span>
                <span className="text-muted-foreground">Nama</span>
                <span className="font-medium">{selectedMitra.name}</span>
                <span className="text-muted-foreground">Email</span>
                <span>{selectedMitra.email}</span>
                <span className="text-muted-foreground">Telepon</span>
                <span>{selectedMitra.phone}</span>
                <span className="text-muted-foreground">Alamat</span>
                <span>{selectedMitra.address ?? "—"}</span>
                <span className="text-muted-foreground">Terdaftar</span>
                <span>{selectedMitra.registeredAt}</span>
                <span className="text-muted-foreground">Status</span>
                <Badge className={statusBadge(selectedMitra.status)} variant="secondary">
                  {getMitraStatusLabel(selectedMitra.status)}
                </Badge>
                <span className="text-muted-foreground">WO Selesai</span>
                <span>{selectedMitra.completedWO}</span>
                <span className="text-muted-foreground">Total Komisi</span>
                <span>{formatCurrency(selectedMitra.totalCommission)}</span>
              </div>
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
    </>
  );
}
