import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useAuthStore } from "@/stores/auth-store";
import { fetchMyWorkOrders } from "@/lib/api";
import type { WorkOrder } from "@/types";
import { WOCard } from "@/components/WOCard";

export default function MyWorkScreen() {
  const mitra = useAuthStore((s) => s.mitra);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (!mitra) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const res = await fetchMyWorkOrders(mitra.id);
      setWorkOrders(res.workOrders);
    } catch {
      // ignore, show empty list
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
    <FlatList
      style={styles.container}
      data={workOrders}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <WOCard wo={item} />}
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
      ListEmptyComponent={
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>Belum ada WO diambil</Text>
          <Text style={styles.empty}>
            Buka tab WO Tersedia untuk ambil slot pekerjaan.
          </Text>
        </View>
      }
      contentContainerStyle={
        workOrders.length === 0 ? styles.emptyContainer : styles.list
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f9f5" },
  list: { padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyContainer: { flexGrow: 1, justifyContent: "center", padding: 24 },
  emptyBox: { alignItems: "center" },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: "#333", marginBottom: 8 },
  empty: { color: "#888", textAlign: "center", lineHeight: 20 },
});
