import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { fetchAvailableWorkOrders } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import type { WorkOrder } from "@/types";
import { WOCard } from "@/components/WOCard";
import { ScreenHeader } from "@/components/ScreenHeader";

export default function WorkOrdersScreen() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      setError("");
      const res = await fetchAvailableWorkOrders(signal);
      if (signal?.aborted) return;
      setWorkOrders(res.workOrders);
    } catch (e) {
      if (e instanceof Error && (e.name === "AbortError" || e.message.includes("canceled") || e.message.includes("aborted"))) {
        return;
      }
      if (!signal?.aborted) {
        setError(e instanceof Error ? e.message : "Gagal memuat data");
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  // Supabase Realtime — auto-refresh saat ada WO baru atau WO diupdate
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channel = (supabase.channel as any)("wo-available-list")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "work_orders",
      }, () => {
        const controller = new AbortController();
        load(controller.signal);
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "work_orders",
      }, () => {
        const controller = new AbortController();
        load(controller.signal);
      })
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      load(controller.signal);
      return () => {
        controller.abort();
      };
    }, [load])
  );

  const handleRefresh = () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setRefreshing(true);
    load(controller.signal);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2e7d32" />
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <ScreenHeader title="Tersedia" />

      <FlatList
        data={workOrders}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.headerSection}>
            <View style={styles.headerTextRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.headingTitle}>Ambil WO Baru</Text>
                <Text style={styles.headingDesc}>
                  Pilih WO dan ambil 1 slot CSO. Setiap mitra hanya bisa ambil 1 slot per WO.
                </Text>
              </View>
              <TouchableOpacity style={styles.searchBtn} activeOpacity={0.7}>
                <Ionicons name="search-outline" size={18} color="#666" />
              </TouchableOpacity>
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>
        }
        renderItem={({ item }) => <WOCard wo={item} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#2e7d32"]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptySection}>
            {/* Empty Illustration */}
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconWrap}>
                <View style={styles.emptyIconInner}>
                  <Ionicons name="clipboard-outline" size={36} color="#2e7d32" />
                  <View style={styles.emptyBadge}>
                    <Text style={styles.emptyBadgeText}>!</Text>
                  </View>
                </View>
              </View>
              <Text style={styles.emptyTitle}>Tidak ada WO Aktif</Text>
              <Text style={styles.emptyDesc}>
                Saat ini tidak ada Work Order dengan slot terbuka.{"\n"}
                Kami akan memberitahu Anda saat ada jadwal baru tersedia.
              </Text>
              <TouchableOpacity
                style={styles.reloadBtn}
                onPress={handleRefresh}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh-outline" size={16} color="#fff" />
                <Text style={styles.reloadBtnText}>Muat Ulang Halaman</Text>
              </TouchableOpacity>
            </View>

            {/* Tips Cards */}
            <View style={styles.tipsRow}>
              <View style={styles.tipCard}>
                <Ionicons name="bulb-outline" size={20} color="#2e7d32" />
                <Text style={styles.tipTitle}>Tips Cepat</Text>
                <Text style={styles.tipDesc}>
                  Pastikan notifikasi menyala agar tidak ketinggalan WO baru.
                </Text>
              </View>
              <View style={styles.tipCard}>
                <Ionicons name="help-circle-outline" size={20} color="#2e7d32" />
                <Text style={styles.tipTitle}>Butuh Bantuan?</Text>
                <Text style={styles.tipDesc}>
                  Hubungi CSO koordinator via menu Chat jika ada kendala.
                </Text>
              </View>
            </View>
          </View>
        }
        contentContainerStyle={
          workOrders.length === 0 ? styles.emptyContainer : styles.listContent
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: "#f4f7f4" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f4f7f4" },

  // Header
  headerSection: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  headerTextRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  headingTitle: { fontSize: 19, fontWeight: "800", color: "#1a1a1a", marginBottom: 4 },
  headingDesc: { fontSize: 13, color: "#888", lineHeight: 19 },
  searchBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e8f5e9",
    marginTop: 2,
  },
  error: { color: "#d32f2f", marginTop: 8, fontSize: 13 },

  // List
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },

  // Empty state
  emptyContainer: { flexGrow: 1 },
  emptySection: { paddingHorizontal: 16, paddingTop: 8 },
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#eef3ee",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  emptyIconWrap: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: "#e8f5e9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyIconInner: { position: "relative" },
  emptyBadge: {
    position: "absolute",
    top: -4,
    right: -10,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#e65100",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: "#1a1a1a", marginBottom: 8 },
  emptyDesc: { fontSize: 13, color: "#999", textAlign: "center", lineHeight: 20 },
  reloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#2e7d32",
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 22,
  },
  reloadBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  // Tips
  tipsRow: { flexDirection: "row", gap: 10, marginTop: 16, paddingBottom: 24 },
  tipCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#eef3ee",
  },
  tipTitle: { fontSize: 13, fontWeight: "700", color: "#1a1a1a", marginTop: 8, marginBottom: 4 },
  tipDesc: { fontSize: 11, color: "#999", lineHeight: 16 },
});
