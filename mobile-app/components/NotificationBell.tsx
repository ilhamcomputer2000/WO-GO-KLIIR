import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withRepeat,
} from "react-native-reanimated";
import { useAuthStore } from "@/stores/auth-store";
import { useNotificationStore, type NotifItem } from "@/stores/notification-store";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins} mnt lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} jam lalu`;
  return `${Math.floor(hrs / 24)} hari lalu`;
}

function notifIcon(type: string) {
  if (type === "new_wo") return { name: "briefcase-outline" as const, color: "#1976d2" };
  if (type === "payout_approved") return { name: "checkmark-circle-outline" as const, color: "#2e7d32" };
  if (type === "payout_paid") return { name: "wallet-outline" as const, color: "#2e7d32" };
  if (type === "slot_approved") return { name: "star-outline" as const, color: "#2e7d32" };
  if (type === "slot_rejected") return { name: "close-circle-outline" as const, color: "#c62828" };
  return { name: "notifications-outline" as const, color: "#666" };
}

export function NotificationBell() {
  const mitra = useAuthStore((s) => s.mitra);
  const { items, unreadCount, loading, fetch, markAllRead, subscribeRealtime } =
    useNotificationStore();
  const [open, setOpen] = useState(false);
  const rotation = useSharedValue(0);
  const unsubRef = useRef<(() => void) | null>(null);

  // Fetch + subscribe saat component mount
  useEffect(() => {
    if (!mitra) return;
    fetch(mitra.id);
    unsubRef.current = subscribeRealtime(mitra.id);
    return () => {
      unsubRef.current?.();
    };
  }, [mitra?.id]);

  // Animasi ring saat ada notif baru
  useEffect(() => {
    if (unreadCount > 0) {
      rotation.value = withRepeat(
        withSequence(
          withTiming(15, { duration: 100 }),
          withTiming(-12, { duration: 100 }),
          withTiming(8, { duration: 100 }),
          withTiming(-5, { duration: 100 }),
          withTiming(0, { duration: 100 })
        ),
        3
      );
    }
  }, [unreadCount]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const handleOpen = async () => {
    setOpen(true);
    if (mitra && unreadCount > 0) {
      await markAllRead(mitra.id);
    }
  };

  const renderItem = ({ item }: { item: NotifItem }) => {
    const icon = notifIcon(item.type);
    return (
      <View style={[styles.notifItem, !item.read && styles.notifUnread]}>
        <View style={styles.notifIcon}>
          <Ionicons name={icon.name} size={20} color={icon.color} />
        </View>
        <View style={styles.notifContent}>
          <Text style={[styles.notifTitle, !item.read && styles.notifTitleBold]}>
            {item.title}
          </Text>
          <Text style={styles.notifBody} numberOfLines={2}>
            {item.body}
          </Text>
          <Text style={styles.notifTime}>{timeAgo(item.created_at)}</Text>
        </View>
        {!item.read && <View style={styles.unreadDot} />}
      </View>
    );
  };

  return (
    <>
      <TouchableOpacity onPress={handleOpen} style={styles.bellBtn} activeOpacity={0.7}>
        <Animated.View style={animStyle}>
          <Ionicons
            name={unreadCount > 0 ? "notifications" : "notifications-outline"}
            size={24}
            color="#2e7d32"
          />
        </Animated.View>
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <Ionicons name="notifications" size={20} color="#2e7d32" />
              <Text style={styles.modalTitle}>Notifikasi</Text>
            </View>
            <TouchableOpacity onPress={() => setOpen(false)} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#666" />
            </TouchableOpacity>
          </View>

          {loading && items.length === 0 ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#2e7d32" />
            </View>
          ) : items.length === 0 ? (
            <View style={styles.center}>
              <Ionicons name="notifications-off-outline" size={48} color="#ddd" />
              <Text style={styles.emptyText}>Belum ada notifikasi</Text>
            </View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.list}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bellBtn: { position: "relative", padding: 4 },
  badge: {
    position: "absolute",
    top: 0,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#e53935",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },

  modal: { flex: 1, backgroundColor: "#f5f9f5" },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e8f5e9",
  },
  modalHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  modalTitle: { fontSize: 17, fontWeight: "700", color: "#1a1a1a" },
  closeBtn: { padding: 4 },

  list: { paddingVertical: 8 },
  separator: { height: 1, backgroundColor: "#f0f0f0", marginLeft: 60 },

  notifItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    gap: 12,
  },
  notifUnread: { backgroundColor: "#f0f8f0" },
  notifIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#e8f5e9",
    alignItems: "center",
    justifyContent: "center",
  },
  notifContent: { flex: 1 },
  notifTitle: { fontSize: 13, color: "#333", lineHeight: 18 },
  notifTitleBold: { fontWeight: "700", color: "#1a1a1a" },
  notifBody: { fontSize: 12, color: "#888", marginTop: 2, lineHeight: 16 },
  notifTime: { fontSize: 11, color: "#bbb", marginTop: 4 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2e7d32",
    marginTop: 4,
  },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText: { fontSize: 14, color: "#aaa" },
});
