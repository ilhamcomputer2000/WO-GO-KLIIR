"use client";

import { useMemo } from "react";
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  Loader2,
  Users,
  Wallet,
  TrendingUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  useDataStore,
  formatCurrency,
  getStatusLabel,
  computeDashboardStats,
} from "@/stores/data-store";
import { getAssignedMitraLabel, getOpenSlotCount } from "@/lib/work-order-utils";

const CHART_COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd"];

export default function DashboardPage() {
  const workOrders = useDataStore((s) => s.workOrders);
  const mitra = useDataStore((s) => s.mitra);
  const payouts = useDataStore((s) => s.payouts);

  const stats = useMemo(
    () => computeDashboardStats(mitra, workOrders, payouts),
    [mitra, workOrders, payouts]
  );

  const woStatusData = useMemo(
    () =>
      [
        { name: "Pending", value: workOrders.filter((w) => w.status === "pending").length },
        { name: "Tersedia", value: workOrders.filter((w) => w.status === "available").length },
        { name: "Dikerjakan", value: workOrders.filter((w) => w.status === "in_progress").length },
        {
          name: "Selesai",
          value: workOrders.filter(
            (w) => w.status === "completed" || w.status === "verified"
          ).length,
        },
      ].filter((d) => d.value > 0),
    [workOrders]
  );

  const mitraPerformance = useMemo(
    () =>
      mitra
        .filter((m) => m.status === "active")
        .sort((a, b) => b.completedWO - a.completedWO)
        .slice(0, 5)
        .map((m) => ({
          name: m.name.split(" ")[0],
          wo: m.completedWO,
          komisi: m.totalCommission / 1000000,
        })),
    [mitra]
  );

  const recentWO = useMemo(
    () =>
      [...workOrders]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 5),
    [workOrders]
  );

  const statusColor = (status: string) => {
    const map: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      available: "bg-blue-100 text-blue-800",
      in_progress: "bg-purple-100 text-purple-800",
      completed: "bg-green-100 text-green-800",
      verified: "bg-emerald-100 text-emerald-800",
    };
    return map[status] ?? "bg-gray-100 text-gray-800";
  };

  return (
    <>
      <DashboardHeader
        title="Dashboard Super Admin"
        description="Ringkasan aktivitas dan performa sistem"
      />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 overflow-auto">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Work Order"
            value={stats.totalWO}
            icon={ClipboardList}
            description={`${stats.pendingWO} menunggu`}
          />
          <StatCard
            title="Sedang Dikerjakan"
            value={stats.inProgressWO}
            icon={Loader2}
            description="WO aktif saat ini"
          />
          <StatCard
            title="WO Selesai"
            value={stats.completedWO}
            icon={CheckCircle2}
            trend="+12% bulan ini"
          />
          <StatCard
            title="Mitra Aktif"
            value={`${stats.activeMitra}/${stats.totalMitra}`}
            icon={Users}
            description={`${stats.pendingMitra} menunggu ACC`}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard
            title="Komisi Dibayar"
            value={formatCurrency(stats.totalCommissionPaid)}
            icon={Wallet}
            description="Total bagi hasil terdistribusi"
          />
          <StatCard
            title="Komisi Pending"
            value={formatCurrency(stats.totalCommissionPending)}
            icon={Clock}
            description="Menunggu persetujuan/pembayaran"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Status Work Order
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={woStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                    isAnimationActive={false}
                  >
                    {woStatusData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Performa Mitra Terbaik</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={mitraPerformance}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    formatter={(value, name) =>
                      name === "komisi"
                        ? [`Rp ${Number(value)}jt`, "Komisi"]
                        : [value, "WO Selesai"]
                    }
                  />
                  <Bar
                    dataKey="wo"
                    fill="#6366f1"
                    name="WO Selesai"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Work Order Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID WO</TableHead>
                  <TableHead>Judul</TableHead>
                  <TableHead>Lokasi</TableHead>
                  <TableHead>Komisi</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>CSO / Slot</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentWO.map((wo) => (
                  <TableRow key={wo.id}>
                    <TableCell className="font-mono text-xs">{wo.id}</TableCell>
                    <TableCell className="font-medium">{wo.title}</TableCell>
                    <TableCell>{wo.location}</TableCell>
                    <TableCell>{formatCurrency(wo.commission)}</TableCell>
                    <TableCell>
                      <Badge className={statusColor(wo.status)} variant="secondary">
                        {getStatusLabel(wo.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {getAssignedMitraLabel(wo)}
                      <span className="text-muted-foreground ml-1">
                        ({getOpenSlotCount(wo)}/{wo.requiredCso} slot)
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
