import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useAuthStore } from "@/stores/auth-store";
import { fetchAvailableWorkOrders, fetchMyWorkOrders } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { WOCard } from "@/components/WOCard";

export default function HomeScreen() {
  const mitra = useAuthStore((s) => s.mitra);
  const [available, setAvailable] = useState(0);
  const [myCount, setMyCount] = useState(0);
  const [recent, setRecent] = useState<import("@/types").WorkOrder[]>([]);
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
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          colors={["#2e7d32"]}
        />
      }
    >
      <View style={styles.greeting}>
        <Text style={styles.hello}>Halo, {mitra?.name} 👋</Text>
        <Text style={styles.role}>Custodian Service Officer (CSO)</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{available}</Text>
          <Text style={styles.statLabel}>WO Tersedia</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{myCount}</Text>
          <Text style={styles.statLabel}>WO Saya</Text>
        </View>
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
  greeting: { marginBottom: 20 },
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
  },
  empty: { color: "#888", textAlign: "center", marginTop: 20 },
});
