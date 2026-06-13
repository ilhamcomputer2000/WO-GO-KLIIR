import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Link } from "expo-router";
import type { WorkOrder } from "@/types";
import {
  formatCurrency,
  formatDate,
  formatDuration,
  getCommissionPerCso,
  getOpenSlotCount,
} from "@/lib/utils";

interface WOCardProps {
  wo: WorkOrder;
}

export function WOCard({ wo }: WOCardProps) {
  const openSlots = getOpenSlotCount(wo);

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
