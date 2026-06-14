import { useCallback, useEffect, useRef, useState } from "react";
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
import { supabase } from "@/lib/supabase";
import type { WorkOrder } from "@/types";
import { WOCard } from "@/components/WOCard";

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
        // WO baru dibuat — fetch ulang tanpa loading spinner
        const controller = new AbortController();
        load(controller.signal);
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "work_orders",
      }, () => {
        // WO diupdate (slot diambil, status berubah) — refresh silent
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
              abortRef.current?.abort();
              const controller = new AbortController();
              abortRef.current = controller;
              setRefreshing(true);
              load(controller.signal);
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
