import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import "react-native-reanimated";
import { useAuthStore } from "@/stores/auth-store";

export { ErrorBoundary } from "expo-router";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });
  const router = useRouter();
  const segments = useSegments();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setHasHydrated(true);
      return;
    }
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      setHasHydrated(true);
    });
    const t = setTimeout(() => setHasHydrated(true), 1500);
    return () => { unsub(); clearTimeout(t); };
  }, []);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  useEffect(() => {
    if (!loaded || !hasHydrated) return;

    const inAuth = segments[0] === "login" || segments[0] === "register";

    if (!isAuthenticated && !inAuth) {
      // Logged out — go to login
      router.replace("/login");
    } else if (isAuthenticated && inAuth) {
      // Logged in but on auth screen — go to tabs
      router.replace("/(tabs)");
    }
    // Otherwise stay where we are
  }, [isAuthenticated, segments, loaded, hasHydrated]);

  if (!loaded || !hasHydrated) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f0f7f0" }}>
        <ActivityIndicator size="large" color="#2e7d32" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerTintColor: "#2e7d32" }}>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="wo/[id]"
        options={{ title: "Detail Work Order", headerBackTitle: "Kembali" }}
      />
    </Stack>
  );
}
