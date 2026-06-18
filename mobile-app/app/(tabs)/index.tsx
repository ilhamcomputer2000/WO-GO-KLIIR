import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/stores/auth-store";
import { fetchAvailableWorkOrders, fetchMyWorkOrders } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";
import { WOCard } from "@/components/WOCard";
import { ScreenHeader } from "@/components/ScreenHeader";
import type { WorkOrder } from "@/types";

export default function HomeScreen() {
  const mitra = useAuthStore((s) => s.mitra);
  const router = useRouter();
  const [available, setAvailable] = useState(0);
  const [myCount, setMyCount] = useState(0);
  const [recent, setRecent] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (!mitra) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const [availRes, myRes] = await Promise.all([
        fetchAvailableWorkOrders(),
        fetchMyWorkOrders(mitra.id),
      ]);
      setAvailable(availRes.workOrders.length);
      setMyCount(myRes.workOrders.length);
      setRecent(availRes.workOrders.slice(0, 3));
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [mitra?.id])
  );

  // Realtime: refresh stats saat ada WO baru
  useEffect(() => {
    if (!mitra) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channel = (supabase.channel as any)("home-wo-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "work_orders" }, () => {
        load();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [mitra?.id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2e7d32" />
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <ScreenHeader title="Beranda" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            colors={["#2e7d32"]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <View style={styles.greeting}>
          <Text style={styles.hello}>Halo, {mitra?.name} 👋</Text>
          <Text style={styles.role}>Custodian Service Officer (CSO)</Text>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statCircle, { borderColor: "#2e7d32" }]}>
              <Text style={[styles.statValue, { color: "#2e7d32" }]}>{available}</Text>
            </View>
            <Text style={styles.statLabel}>WO{"\n"}TERSEDIA</Text>
          </View>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push("/(tabs)/my-work")}
            activeOpacity={0.8}
          >
            <View style={[styles.statCircle, { borderColor: "#1976d2" }]}>
              <Text style={[styles.statValue, { color: "#1976d2" }]}>{myCount}</Text>
            </View>
            <Text style={styles.statLabel}>WO SAYA</Text>
          </TouchableOpacity>

          <View style={styles.statCard}>
            <View style={[styles.statCircle, { borderColor: "#2e7d32" }]}>
              <Text style={[styles.statValue, { color: "#2e7d32", fontSize: 14 }]}>
                {formatCurrency(mitra?.totalCommission ?? 0).replace("Rp", "").trim()}
              </Text>
            </View>
            <Text style={styles.statLabel}>KOMISI</Text>
          </View>
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>WO Terbaru Tersedia</Text>
          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() => router.push("/(tabs)/work-orders")}
          >
            <Ionicons name="options-outline" size={18} color="#666" />
          </TouchableOpacity>
        </View>

        {/* WO List or Empty State */}
        {recent.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <View style={styles.emptyIconInner}>
                <Ionicons name="clipboard-outline" size={32} color="#2e7d32" />
                <View style={styles.emptyBadge}>
                  <Text style={styles.emptyBadgeText}>!</Text>
                </View>
              </View>
            </View>
            <Text style={styles.emptyTitle}>Belum ada WO tersedia</Text>
            <Text style={styles.emptyDesc}>
              Saat ini tidak ada pekerjaan baru di sekitar area Anda.{"\n"}
              Silakan cek kembali nanti.
            </Text>
            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={() => { setRefreshing(true); load(); }}
              activeOpacity={0.8}
            >
              <Text style={styles.refreshBtnText}>Segarkan Halaman</Text>
            </TouchableOpacity>
          </View>
        ) : (
          recent.map((wo) => <WOCard key={wo.id} wo={wo} />)
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: "#f4f7f4" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f4f7f4" },

  // Greeting
  greeting: { marginBottom: 20 },
  hello: { fontSize: 22, fontWeight: "800", color: "#1a1a1a" },
  role: { fontSize: 13, color: "#888", marginTop: 4 },

  // Stats
  statsRow: { flexDirection: "row", justifyContent: "space-between", gap: 10, marginBottom: 24 },
  statCard: { flex: 1, alignItems: "center" },
  statCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  statValue: { fontSize: 20, fontWeight: "800" },
  statLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#888",
    textAlign: "center",
    letterSpacing: 0.5,
    lineHeight: 13,
  },

  // Section header
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: "#1a1a1a" },
  filterBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e8f5e9",
  },

  // Empty state
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
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#e8f5e9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyIconInner: { position: "relative" },
  emptyBadge: {
    position: "absolute",
    top: -4,
    right: -8,
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
  refreshBtn: {
    backgroundColor: "#2e7d32",
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingVertical: 12,
    marginTop: 20,
  },
  refreshBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
