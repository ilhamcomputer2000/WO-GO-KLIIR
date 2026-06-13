import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Mitra } from "@/types";

interface AuthState {
  mitra: Mitra | null;
  isAuthenticated: boolean;
  setMitra: (mitra: Mitra | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      mitra: null,
      isAuthenticated: false,
      setMitra: (mitra) => set({ mitra, isAuthenticated: !!mitra }),
      logout: () => set({ mitra: null, isAuthenticated: false }),
    }),
    {
      name: "goklirr-mitra-auth",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Hook to check if the store has finished hydrating from AsyncStorage
export function useHasHydrated() {
  return useAuthStore.persist.hasHydrated();
}
