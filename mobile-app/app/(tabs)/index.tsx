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
import { useAuthStore } from "@/stores/auth-store";
import { fetchAvailableWorkOrders, fetchMyWorkOrders } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";
import { WOCard } from "@/components/WOCard";
import { NotificationBell } from "@/components/NotificationBell";
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
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load(); }}
          colors={["#2e7d32"]}
        />
      }
    >
      {/* Header row with greeting + bell */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.hello}>Halo, {mitra?.name} 👋</Text>
          <Text style={styles.role}>Custodian Service Officer (CSO)</Text>
        </View>
        <NotificationBell />
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{available}</Text>
          <Text style={styles.statLabel}>WO Tersedia</Text>
        </View>
        {/* WO Saya stat — clickable, goes to account/wo-saya */}
        <TouchableOpacity
          style={styles.statCard}
          onPress={() => router.push("/(tabs)/my-work")}
          activeOpacity={0.8}
        >
          <Text style={[styles.statValue, { color: "#1976d2" }]}>{myCount}</Text>
          <Text style={styles.statLabel}>WO Saya</Text>
        </TouchableOpacity>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {formatCurrency(mitra?.totalCommission ?? 0).replace("Rp", "").trim()}
          </Text>
          <Text style={styles.statLabel}>Komisi</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>WO Terbaru Tersedia</Text>
      {recent.length === 0 ? (
        <Text style={styles.empty}>Belum ada WO tersedia saat ini.</Text>
      ) : (
        recent.map((wo) => <WOCard key={wo.id} wo={wo} />)
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f9f5", padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  hello: { fontSize: 22, fontWeight: "bold", color: "#1a1a1a" },
  role: { fontSize: 13, color: "#666", marginTop: 4 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e8f5e9",
  },
  statValue: { fontSize: 18, fontWeight: "bold", color: "#2e7d32" },
  statLabel: { fontSize: 11, color: "#888", marginTop: 4, textAlign: "center" },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#333", marginBottom: 12 },
  empty: { color: "#888", textAlign: "center", marginTop: 20 },
});
