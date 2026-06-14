import { useEffect } from "react";
import { Tabs } from "expo-router";
import { StyleSheet, View, ColorValue } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  interpolate,
} from "react-native-reanimated";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

/* ─── Animated tab icon wrapper ─── */
function AnimatedTabIcon({
  focused,
  color,
  iconSet,
  activeIcon,
  inactiveIcon,
  size = 24,
}: {
  focused: boolean;
  color: string | ColorValue;
  iconSet: "ionicons" | "material";
  activeIcon: string;
  inactiveIcon: string;
  size?: number;
}) {
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (focused) {
      // Bounce-up spring animation when focused
      scale.value = withSequence(
        withSpring(1.25, { damping: 8, stiffness: 300 }),
        withSpring(1.05, { damping: 6, stiffness: 200 })
      );
      translateY.value = withSpring(-2, { damping: 10, stiffness: 250 });
    } else {
      scale.value = withSpring(1, { damping: 12, stiffness: 200 });
      translateY.value = withSpring(0, { damping: 12, stiffness: 200 });
    }
  }, [focused, scale, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
    ],
    opacity: interpolate(scale.value, [1, 1.25], [0.7, 1]),
  }));

  const iconName = focused ? activeIcon : inactiveIcon;

  return (
    <Animated.View style={[styles.iconContainer, animatedStyle]}>
      {/* Active indicator dot */}
      {focused && <View style={styles.activeDot} />}
      {iconSet === "ionicons" ? (
        <Ionicons name={iconName as keyof typeof Ionicons.glyphMap} size={size} color={color} />
      ) : (
        <MaterialCommunityIcons
          name={iconName as keyof typeof MaterialCommunityIcons.glyphMap}
          size={size}
          color={color}
        />
      )}
    </Animated.View>
  );
}

/* ─── Tab Layout ─── */
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#2e7d32",
        tabBarInactiveTintColor: "#a0a0a0",
        headerStyle: {
          backgroundColor: "#f8fdf8",
          shadowColor: "#2e7d32",
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 4,
        },
        headerTintColor: "#2e7d32",
        headerTitleStyle: { fontWeight: "700", fontSize: 17 },
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopWidth: 0,
          elevation: 12,
          shadowColor: "#000",
          shadowOpacity: 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -4 },
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          letterSpacing: 0.2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Beranda",
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon
              focused={focused}
              color={color}
              iconSet="ionicons"
              activeIcon="home"
              inactiveIcon="home-outline"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="saldo"
        options={{
          title: "Saldo",
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon
              focused={focused}
              color={color}
              iconSet="ionicons"
              activeIcon="wallet"
              inactiveIcon="wallet-outline"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="work-orders"
        options={{
          title: "WO Tersedia",
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon
              focused={focused}
              color={color}
              iconSet="ionicons"
              activeIcon="clipboard"
              inactiveIcon="clipboard-outline"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon
              focused={focused}
              color={color}
              iconSet="ionicons"
              activeIcon="chatbubbles"
              inactiveIcon="chatbubbles-outline"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="my-work"
        options={{
          href: null, // hidden from tab bar
          title: "WO Saya",
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Akun",
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon
              focused={focused}
              color={color}
              iconSet="ionicons"
              activeIcon="person-circle"
              inactiveIcon="person-circle-outline"
            />
          ),
        }}
      />
      <Tabs.Screen name="two" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
  },
  activeDot: {
    position: "absolute",
    top: -3,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#2e7d32",
  },
});
