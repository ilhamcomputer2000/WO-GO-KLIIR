"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";
import { DEMO_CREDENTIALS } from "@/lib/mock-data";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: (email, password) => {
        if (
          email === DEMO_CREDENTIALS.email &&
          password === DEMO_CREDENTIALS.password
        ) {
          set({
            isAuthenticated: true,
            user: {
              id: "SA-001",
              email: DEMO_CREDENTIALS.email,
              name: "Super Admin",
              role: "super_admin",
            },
          });
          return true;
        }
        return false;
      },
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    { name: "wo-auth" }
  )
);
