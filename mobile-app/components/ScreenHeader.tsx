import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/stores/auth-store";
import { NotificationBell } from "@/components/NotificationBell";

interface ScreenHeaderProps {
  title: string;
  /** Extra action icons rendered before the bell */
  extraRight?: React.ReactNode;
}

export function ScreenHeader({ title, extraRight }: ScreenHeaderProps) {
  const mitra = useAuthStore((s) => s.mitra);
  const profileUrl = (mitra as unknown as Record<string, string>)?.profilePhotoUrl;

  return (
    <View style={styles.header}>
      {/* Left: Avatar + Title */}
      <View style={styles.left}>
        <View style={styles.avatar}>
          {profileUrl ? (
            <Image source={{ uri: profileUrl }} style={styles.avatarImg} />
          ) : (
            <Text style={styles.avatarText}>
              {mitra?.name?.charAt(0)?.toUpperCase() ?? "M"}
            </Text>
          )}
        </View>
        <Text style={styles.title}>{title}</Text>
      </View>

      {/* Right: Extra icons + Bell */}
      <View style={styles.right}>
        {extraRight}
        <NotificationBell />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 52,
    paddingBottom: 14,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eef3ee",
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#2e7d32",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
  title: {
    fontSize: 19,
    fontWeight: "800",
    color: "#2e7d32",
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
});
