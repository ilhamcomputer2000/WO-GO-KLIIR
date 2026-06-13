import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
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

  // Track store hydration from AsyncStorage
  const [hasHydrated, setHasHydrated] = useState(
    useAuthStore.persist.hasHydrated()
  );

  useEffect(() => {
    // Subscribe to hydration completion in case it hasn't finished yet
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      setHasHydrated(true);
    });
    // Also check immediately in case it already finished
    if (useAuthStore.persist.hasHydrated()) {
      setHasHydrated(true);
    }
    return unsub;
  }, []);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  useEffect(() => {
    // Wait for fonts and store hydration before navigating
    if (!loaded || !hasHydrated) return;
    const inAuth = segments[0] === "login";

    if (!isAuthenticated && !inAuth) {
      router.replace("/login");
    } else if (isAuthenticated && inAuth) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, segments, loaded, hasHydrated, router]);

  // Don't render anything until fonts loaded AND store hydrated
  if (!loaded || !hasHydrated) return null;

  return (
    <Stack screenOptions={{ headerTintColor: "#2e7d32" }}>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="wo/[id]"
        options={{ title: "Detail Work Order", headerBackTitle: "Kembali" }}
      />
    </Stack>
  );
}
