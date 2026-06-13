import { Tabs, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { TouchableOpacity } from "react-native";
import { useAuthStore } from "@/stores/auth-store";

export default function TabLayout() {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#2e7d32",
        tabBarInactiveTintColor: "#999",
        headerStyle: { backgroundColor: "#f8fdf8" },
        headerTintColor: "#2e7d32",
        headerTitleStyle: { fontWeight: "700" },
        headerRight: () => (
          <TouchableOpacity onPress={handleLogout} style={{ marginRight: 16 }}>
            <SymbolView
              name={{ ios: "rectangle.portrait.and.arrow.right", android: "logout", web: "logout" }}
              size={22}
              tintColor="#d32f2f"
            />
          </TouchableOpacity>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Beranda",
          tabBarIcon: ({ color }) => (
            <SymbolView name={{ ios: "house.fill", android: "home", web: "home" }} tintColor={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="work-orders"
        options={{
          title: "WO Tersedia",
          tabBarIcon: ({ color }) => (
            <SymbolView name={{ ios: "list.bullet.clipboard", android: "assignment", web: "list" }} tintColor={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="my-work"
        options={{
          title: "WO Saya",
          tabBarIcon: ({ color }) => (
            <SymbolView name={{ ios: "briefcase.fill", android: "work", web: "work" }} tintColor={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen name="two" options={{ href: null }} />
    </Tabs>
  );
}
