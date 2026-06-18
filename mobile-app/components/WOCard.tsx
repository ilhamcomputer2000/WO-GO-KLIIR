import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { WorkOrder, WorkOrderSlot } from "@/types";
import {
  formatCurrency,
  formatDate,
  formatDuration,
  getCommissionPerCso,
  getOpenSlotCount,
} from "@/lib/utils";

interface WOCardProps {
  wo: WorkOrder;
  /** When provided, shows work status badge based on this mitra's slot */
  mitraId?: string;
}

function getSlotStatusInfo(slot: WorkOrderSlot) {
  // Rejected — needs re-upload
  if (slot.verificationStatus === "rejected") {
    return {
      label: "Foto Ditolak",
      bg: "#ffebee",
      color: "#c62828",
      icon: "close-circle" as const,
    };
  }

  // Approved by admin
  if (slot.verificationStatus === "approved") {
    return {
      label: "Disetujui Admin",
      bg: "#e8f5e9",
      color: "#2e7d32",
      icon: "checkmark-circle" as const,
    };
  }

  // Completed, waiting for admin review
  if (slot.status === "completed" && slot.verificationStatus === "pending_review") {
    return {
      label: "Menunggu Review",
      bg: "#fff3e0",
      color: "#e65100",
      icon: "hourglass-outline" as const,
    };
  }

  // Completed (no verification status set yet)
  if (slot.status === "completed") {
    return {
      label: "Pekerjaan Selesai",
      bg: "#e3f2fd",
      color: "#1565c0",
      icon: "checkmark-done" as const,
    };
  }

  // In progress — has before photo but not after
  if (slot.beforePhotoUrl && !slot.afterPhotoUrl) {
    return {
      label: "Sedang Dikerjakan",
      bg: "#e3f2fd",
      color: "#1565c0",
      icon: "construct" as const,
    };
  }

  // Just taken the slot
  return {
    label: "Slot Diambil",
    bg: "#f3e5f5",
    color: "#7b1fa2",
    icon: "hand-left" as const,
  };
}

export function WOCard({ wo, mitraId }: WOCardProps) {
  const openSlots = getOpenSlotCount(wo);
  const mySlot = mitraId ? wo.slots.find((s) => s.mitraId === mitraId) : undefined;
  const statusInfo = mySlot ? getSlotStatusInfo(mySlot) : undefined;

  return (
    <Link href={`/wo/${wo.id}`} asChild>
      <TouchableOpacity style={styles.card} activeOpacity={0.7}>
        <View style={styles.header}>
          <Text style={styles.id}>{wo.id}</Text>
          <View style={[styles.badge, openSlots > 0 ? styles.badgeOpen : styles.badgeFull]}>
            <Text style={styles.badgeText}>
              {openSlots}/{wo.requiredCso} slot
            </Text>
          </View>
        </View>
        <Text style={styles.title}>{wo.title}</Text>
        <Text style={styles.meta}>
          {wo.category} · {wo.location}
        </Text>
        <View style={styles.row}>
          <Text style={styles.date}>
            {formatDate(wo.workDate)} · {wo.startTime}–{wo.endTime}
          </Text>
        </View>

        {/* ── Work Status Badge ── */}
        {statusInfo && (
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
            <Ionicons name={statusInfo.icon} size={14} color={statusInfo.color} />
            <Text style={[styles.statusBadgeText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
            {mySlot && mySlot.progress !== undefined && mySlot.progress < 100 && (
              <Text style={[styles.statusProgress, { color: statusInfo.color }]}>
                {mySlot.progress}%
              </Text>
            )}
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.commission}>
            {formatCurrency(getCommissionPerCso(wo))}/CSO
          </Text>
          <Text style={styles.duration}>{formatDuration(wo.durationMinutes)}</Text>
        </View>
      </TouchableOpacity>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e8f5e9",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  id: { fontSize: 11, color: "#888", fontFamily: "monospace" },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeOpen: { backgroundColor: "#e3f2fd" },
  badgeFull: { backgroundColor: "#f5f5f5" },
  badgeText: { fontSize: 11, fontWeight: "600", color: "#1565c0" },
  title: { fontSize: 16, fontWeight: "700", color: "#1a1a1a", marginBottom: 4 },
  meta: { fontSize: 13, color: "#666", marginBottom: 6 },
  row: { marginBottom: 10 },
  date: { fontSize: 12, color: "#888" },
  // Status badge
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 10,
  },
  statusBadgeText: { fontSize: 12, fontWeight: "700" },
  statusProgress: { fontSize: 11, fontWeight: "600", marginLeft: 2 },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 10,
  },
  commission: { fontSize: 15, fontWeight: "700", color: "#2e7d32" },
  duration: { fontSize: 12, color: "#666" },
});
