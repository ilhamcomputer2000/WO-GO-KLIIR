import { useEffect } from "react";
import { Tabs } from "expo-router";
import { StyleSheet, View, ColorValue } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

/* ─── Animated tab icon wrapper ─── */
function AnimatedTabIcon({
  focused,
  color,
  activeIcon,
  inactiveIcon,
  size = 22,
}: {
  focused: boolean;
  color: string | ColorValue;
  activeIcon: string;
  inactiveIcon: string;
  size?: number;
}) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (focused) {
      scale.value = withSequence(
        withSpring(1.18, { damping: 8, stiffness: 300 }),
        withSpring(1.0, { damping: 6, stiffness: 200 })
      );
    } else {
      scale.value = withSpring(1, { damping: 12, stiffness: 200 });
    }
  }, [focused, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const iconName = focused ? activeIcon : inactiveIcon;

  return (
    <Animated.View
      style={[
        styles.iconContainer,
        animStyle,
        {
          backgroundColor: focused ? "#1b3a20" : "transparent",
          borderRadius: 12,
          padding: 7,
        },
      ]}
    >
      <Ionicons
        name={iconName as keyof typeof Ionicons.glyphMap}
        size={size}
        color={focused ? "#fff" : color}
      />
    </Animated.View>
  );
}

/* ─── Tab Layout ─── */
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#2e7d32",
        tabBarInactiveTintColor: "#a0a0a0",
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopWidth: 0,
          elevation: 16,
          shadowColor: "#000",
          shadowOpacity: 0.1,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: -6 },
          height: 68,
          paddingBottom: 10,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          letterSpacing: 0.3,
          marginTop: 2,
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
              activeIcon="wallet"
              inactiveIcon="wallet-outline"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="work-orders"
        options={{
          title: "Tersedia",
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon
              focused={focused}
              color={color}
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
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon
              focused={focused}
              color={color}
              activeIcon="person"
              inactiveIcon="person-outline"
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
    width: 38,
    height: 34,
  },
});
