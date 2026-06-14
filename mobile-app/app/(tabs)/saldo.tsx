"use client";
import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Modal,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/stores/auth-store";
import { fetchMitraPayouts, resolveImageUrl, getPayoutStatusLabel } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { PayoutRecord } from "@/types";

export default function SaldoScreen() {
  const mitra = useAuthStore((s) => s.mitra);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const load = async (silent = false) => {
    if (!mitra) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const res = await fetchMitraPayouts(mitra.id);
      setPayouts(res.payouts);
    } catch {
      // silent
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [mitra?.id])
  );

  // Summary
  const totalPaid = payouts
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0);
  const totalPending = payouts
    .filter((p) => p.status === "pending" || p.status === "approved")
    .reduce((sum, p) => sum + p.amount, 0);
  const paidCount = payouts.filter((p) => p.status === "paid").length;

  const getStatusStyle = (status: PayoutRecord["status"]) => {
    switch (status) {
      case "paid":
        return { bg: "#e8f5e9", color: "#2e7d32", icon: "checkmark-circle" as const, label: "Sudah Ditransfer" };
      case "approved":
        return { bg: "#e3f2fd", color: "#1565c0", icon: "time" as const, label: "Menunggu Transfer" };
      case "pending":
        return { bg: "#fff3e0", color: "#e65100", icon: "hourglass-outline" as const, label: "Menunggu Verifikasi" };
      case "rejected":
        return { bg: "#ffebee", color: "#c62828", icon: "close-circle" as const, label: "Ditolak" };
      default:
        return { bg: "#f5f5f5", color: "#888", icon: "help-circle-outline" as const, label: status };
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2e7d32" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { borderColor: "#c8e6c9" }]}>
          <View style={[styles.summaryIconWrap, { backgroundColor: "#e8f5e9" }]}>
            <Ionicons name="cash" size={20} color="#2e7d32" />
          </View>
          <Text style={styles.summaryAmount}>{formatCurrency(totalPaid)}</Text>
          <Text style={styles.summaryLabel}>Total Diterima</Text>
        </View>
        <View style={[styles.summaryCard, { borderColor: "#ffe0b2" }]}>
          <View style={[styles.summaryIconWrap, { backgroundColor: "#fff3e0" }]}>
            <Ionicons name="time" size={20} color="#e65100" />
          </View>
          <Text style={[styles.summaryAmount, { color: "#e65100" }]}>{formatCurrency(totalPending)}</Text>
          <Text style={styles.summaryLabel}>Menunggu</Text>
        </View>
      </View>

      {/* History Header */}
      <View style={styles.historyHeader}>
        <Text style={styles.historyTitle}>Riwayat Komisi</Text>
        <Text style={styles.historyCount}>{payouts.length} transaksi</Text>
      </View>

      {/* Payout List */}
      <FlatList
        data={payouts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const st = getStatusStyle(item.status);
          return (
            <View style={styles.payoutCard}>
              <View style={styles.payoutHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.payoutTitle} numberOfLines={1}>{item.woTitle}</Text>
                  <Text style={styles.payoutDate}>{formatDate(item.createdAt)}</Text>
                </View>
                <Text style={styles.payoutAmount}>{formatCurrency(item.amount)}</Text>
              </View>

              {/* Status Badge */}
              <View style={styles.payoutStatusRow}>
                <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                  <Ionicons name={st.icon as keyof typeof Ionicons.glyphMap} size={12} color={st.color} />
                  <Text style={[styles.statusBadgeText, { color: st.color }]}>{st.label}</Text>
                </View>

                {item.paidAt && (
                  <Text style={styles.paidDate}>
                    Ditransfer {formatDate(item.paidAt)}
                  </Text>
                )}
              </View>

              {/* Transfer Proof */}
              {item.status === "paid" && item.transferProofUrl && (
                <TouchableOpacity
                  style={styles.proofBtn}
                  onPress={() => setPreviewUrl(resolveImageUrl(item.transferProofUrl!))}
                  activeOpacity={0.7}
                >
                  <Image
                    source={{ uri: resolveImageUrl(item.transferProofUrl) }}
                    style={styles.proofThumb}
                    resizeMode="cover"
                  />
                  <View style={styles.proofTextWrap}>
                    <Text style={styles.proofLabel}>Bukti Transfer</Text>
                    <Text style={styles.proofHint}>Ketuk untuk melihat</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color="#aaa" />
                </TouchableOpacity>
              )}
            </View>
          );
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load(true);
            }}
            colors={["#2e7d32"]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="file-tray-outline" size={40} color="#ccc" />
            </View>
            <Text style={styles.emptyTitle}>Belum ada riwayat saldo</Text>
            <Text style={styles.emptyDesc}>
              Komisi akan muncul di sini setelah Anda menyelesaikan pekerjaan dan diverifikasi admin.
            </Text>
          </View>
        }
        contentContainerStyle={payouts.length === 0 ? styles.emptyContainer : styles.listContent}
      />

      {/* Image Preview Modal */}
      <Modal visible={!!previewUrl} transparent animationType="fade" onRequestClose={() => setPreviewUrl(null)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalClose} onPress={() => setPreviewUrl(null)}>
            <View style={styles.modalCloseBg}>
              <Ionicons name="close" size={20} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Bukti Transfer</Text>
          {previewUrl && (
            <Image source={{ uri: previewUrl }} style={styles.modalImage} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f7f4" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  // Summary
  summaryRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
  },
  summaryIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  summaryAmount: { fontSize: 17, fontWeight: "800", color: "#2e7d32", marginBottom: 4 },
  summaryLabel: { fontSize: 12, color: "#888", fontWeight: "500" },

  // History
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  historyTitle: { fontSize: 16, fontWeight: "700", color: "#111" },
  historyCount: { fontSize: 12, color: "#999" },

  // Payout Cards
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  payoutCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#eef3ee",
  },
  payoutHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  payoutTitle: { fontSize: 14, fontWeight: "700", color: "#111" },
  payoutDate: { fontSize: 12, color: "#999", marginTop: 3 },
  payoutAmount: { fontSize: 15, fontWeight: "800", color: "#2e7d32" },
  payoutStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusBadgeText: { fontSize: 11, fontWeight: "600" },
  paidDate: { fontSize: 11, color: "#888" },

  // Proof Button
  proofBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fdf8",
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#e8f5e9",
    gap: 10,
  },
  proofThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#eee",
  },
  proofTextWrap: { flex: 1 },
  proofLabel: { fontSize: 13, fontWeight: "600", color: "#333" },
  proofHint: { fontSize: 11, color: "#888", marginTop: 2 },

  // Empty
  emptyContainer: { flexGrow: 1, justifyContent: "center", padding: 24 },
  emptyWrap: { alignItems: "center" },
  emptyIconWrap: {
    marginBottom: 16,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#f0f4f0",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: "#333", marginBottom: 8 },
  emptyDesc: { color: "#888", textAlign: "center", lineHeight: 20, paddingHorizontal: 20 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalClose: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
  },
  modalCloseBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 16,
  },
  modalImage: {
    width: "100%",
    height: "70%",
    borderRadius: 12,
  },
});
