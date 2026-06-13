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
import { fetchAvailableWorkOrders } from "@/lib/api";
import type { WorkOrder } from "@/types";
import { WOCard } from "@/components/WOCard";

export default function WorkOrdersScreen() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setError("");
      const res = await fetchAvailableWorkOrders();
      setWorkOrders(res.workOrders);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2e7d32" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>
        Pilih WO dan ambil 1 slot CSO. Setiap mitra hanya bisa ambil 1 slot per WO.
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
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
          <Text style={styles.empty}>Tidak ada WO dengan slot terbuka.</Text>
        }
        contentContainerStyle={workOrders.length === 0 ? styles.emptyContainer : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f9f5", padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  hint: { fontSize: 13, color: "#666", marginBottom: 12, lineHeight: 18 },
  error: { color: "#d32f2f", marginBottom: 8 },
  empty: { color: "#888", textAlign: "center", marginTop: 40 },
  emptyContainer: { flexGrow: 1 },
});
