import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Mitra } from "@/types";

interface AuthState {
  mitra: Mitra | null;
  isAuthenticated: boolean;
  setMitra: (mitra: Mitra | null) => void;
  updateMitra: (updates: Partial<Mitra>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      mitra: null,
      isAuthenticated: false,
      setMitra: (mitra) => set({ mitra, isAuthenticated: !!mitra }),
      updateMitra: (updates) => {
        const current = get().mitra;
        if (current) set({ mitra: { ...current, ...updates } });
      },
      logout: () => set({ mitra: null, isAuthenticated: false }),
    }),
    {
      name: "goklirr-mitra-auth",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export function useHasHydrated() {
  return useAuthStore.persist.hasHydrated();
}
