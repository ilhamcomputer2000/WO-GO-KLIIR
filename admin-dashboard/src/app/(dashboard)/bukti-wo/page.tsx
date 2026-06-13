"use client";

import { useState } from "react";
import { Search, Camera, Filter, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/dialog";
import {
  useDataStore,
  getPayoutStatusLabel,
} from "@/stores/data-store";
import type { CompletionProof } from "@/types";

function verificationBadge(status?: string) {
  const map: Record<string, string> = {
    pending_review: "bg-amber-100 text-amber-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  };
  const labels: Record<string, string> = {
    pending_review: "Menunggu Review",
    approved: "Disetujui",
    rejected: "Ditolak",
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedProof, setSelectedProof] = useState<CompletionProof | null>(
    null
  );
  const [processing, setProcessing] = useState(false);

  const getSlotVerification = (proof: CompletionProof) => {
    const wo = workOrders.find((w) => w.id === proof.woId);
    const slot = wo?.slots.find((s) => s.id === proof.slotId);
    return slot?.verificationStatus;
  };

  const getPayout = (proof: CompletionProof) =>
    payouts.find(
      (p) =>
        p.woId === proof.woId &&
        p.slotId === proof.slotId &&
        p.mitraId === proof.mitraId
    );

  const filtered = proofs.filter((p) => {
    const vStatus = getSlotVerification(p);
    const matchSearch =
      p.woId.toLowerCase().includes(search.toLowerCase()) ||
      p.woTitle.toLowerCase().includes(search.toLowerCase()) ||
      p.mitraName.toLowerCase().includes(search.toLowerCase());
    const matchWo = woFilter === "all" || p.woId === woFilter;
    const matchMitra = mitraFilter === "all" || p.mitraId === mitraFilter;
    const matchReview =
      reviewFilter === "all" ||
      vStatus === reviewFilter ||
      (!vStatus && reviewFilter === "pending_review");
    return matchSearch && matchWo && matchMitra && matchReview;
  });

  const pendingCount = proofs.filter(
    (p) =>
      getSlotVerification(p) === "pending_review" || !getSlotVerification(p)
  ).length;

  const handleVerify = async (proof: CompletionProof, action: "approve" | "reject") => {
    setProcessing(true);
    try {
      await verifySlot(proof.woId, proof.mitraId, action);
      toast.success(
        action === "approve"
          ? "Pekerjaan disetujui — lanjut upload bukti transfer di Bagi Hasil"
          : "Pekerjaan ditolak — mitra diminta perbaiki"
      );
      setSelectedProof(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verifikasi gagal");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <DashboardHeader
        title="Bukti Penyelesaian WO"
        description="Review bukti foto mitra — setujui jika pekerjaan sudah sesuai, lalu upload bukti transfer di menu Bagi Hasil"
      />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 overflow-auto">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            title="Total Bukti"
            value={filtered.length}
            icon={Camera}
            description="Foto terunggah mitra"
          />
          <StatCard
            title="Menunggu Review"
            value={pendingCount}
            icon={Filter}
            description="Perlu dicek admin"
          />
          <StatCard
            title="Sudah Disetujui"
            value={
              proofs.filter((p) => getSlotVerification(p) === "approved").length
            }
            icon={CheckCircle}
            description="Siap transfer komisi"
          />
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filter Bukti
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari WO, judul, atau nama mitra..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={reviewFilter} onValueChange={(v) => setReviewFilter(v ?? "all")}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Status review" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Review</SelectItem>
                <SelectItem value="pending_review">Menunggu Review</SelectItem>
                <SelectItem value="approved">Disetujui</SelectItem>
                <SelectItem value="rejected">Ditolak</SelectItem>
              </SelectContent>
            </Select>
            <Select value={woFilter} onValueChange={(v) => setWoFilter(v ?? "all")}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Semua WO" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua WO</SelectItem>
                {workOrders.map((wo) => (
                  <SelectItem key={wo.id} value={wo.id}>
                    {wo.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={mitraFilter}
              onValueChange={(v) => setMitraFilter(v ?? "all")}
            >
              <SelectTrigger className="w-full sm:w-44">
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
          </CardContent>
        </Card>

        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              Belum ada bukti penyelesaian. Mitra mengunggah foto dari aplikasi
              mobile setelah menyelesaikan pekerjaan.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((proof) => {
              const vStatus = getSlotVerification(proof);
              const payout = getPayout(proof);
              return (
                <Card key={proof.id} className="overflow-hidden">
                  <button
                    type="button"
                    className="w-full"
                    onClick={() => {
                      setSelectedProof(proof);
                      setPreviewUrl(proof.imageUrl);
                    }}
                  >
                    <div className="relative aspect-[4/3] bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={proof.imageUrl}
                        alt={`Bukti ${proof.woId}`}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  </button>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        {proof.woId}
                      </Badge>
                      {verificationBadge(vStatus ?? "pending_review")}
                    </div>
                    <p className="text-sm font-medium line-clamp-1">
                      {proof.woTitle}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {proof.mitraName}
                    </p>
                    {payout && (
                      <Badge variant="outline" className="text-[10px]">
                        {getPayoutStatusLabel(payout.status)}
                      </Badge>
                    )}
                    {(vStatus === "pending_review" || !vStatus) && (
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          className="flex-1 h-8"
                          disabled={processing}
                          onClick={() => handleVerify(proof, "approve")}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Setujui
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-8 text-red-600"
                          disabled={processing}
                          onClick={() => handleVerify(proof, "reject")}
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Tolak
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog
        open={!!previewUrl}
        onOpenChange={() => {
          setPreviewUrl(null);
          setSelectedProof(null);
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Review Bukti Penyelesaian</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <div className="relative w-full aspect-[4/3]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Preview bukti"
                className="object-contain w-full h-full rounded-md"
              />
            </div>
          )}
          {selectedProof &&
            (getSlotVerification(selectedProof) === "pending_review" ||
              !getSlotVerification(selectedProof)) && (
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  disabled={processing}
                  onClick={() => handleVerify(selectedProof, "approve")}
                >
                  Pekerjaan Sesuai — Setujui
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 text-red-600"
                  disabled={processing}
                  onClick={() => handleVerify(selectedProof, "reject")}
                >
                  Tidak Sesuai — Tolak
                </Button>
              </div>
            )}
        </DialogContent>
      </Dialog>
    </>
  );
}
