import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { API_URL } from "@/constants/config";

export type NotifItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  read: boolean;
  created_at: string;
  target: string;
  mitra_id: string | null;
};

interface NotificationState {
  items: NotifItem[];
  unreadCount: number;
  loading: boolean;
  channelSubscribed: boolean;
  fetch: (mitraId: string) => Promise<void>;
  markAllRead: (mitraId: string) => Promise<void>;
  addItem: (item: NotifItem) => void;
  subscribeRealtime: (mitraId: string) => () => void;
}

export const useNotificationStore = create<NotificationState>()((set, get) => ({
  items: [],
  unreadCount: 0,
  loading: false,
  channelSubscribed: false,

  fetch: async (mitraId: string) => {
    set({ loading: true });
    try {
      const res = await fetch(`${API_URL}/api/notifications?mitra_id=${mitraId}`, {
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return;
      const data = await res.json();
      const items: NotifItem[] = data.notifications ?? [];
      set({
        items,
        unreadCount: items.filter((n) => !n.read).length,
      });
    } catch {
      // silent fail
    } finally {
      set({ loading: false });
    }
  },

  markAllRead: async (mitraId: string) => {
    set((s) => ({
      items: s.items.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
    try {
      await fetch(`${API_URL}/api/notifications?mitra_id=${mitraId}`, {
        method: "PATCH",
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      // silent
    }
  },

  addItem: (item: NotifItem) => {
    set((s) => ({
      items: [item, ...s.items].slice(0, 50),
      unreadCount: s.unreadCount + 1,
    }));
  },

  subscribeRealtime: (mitraId: string) => {
    if (get().channelSubscribed) return () => {};

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ch = (supabase.channel as any)(`mitra-notif-${mitraId}`);

    ch
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `mitra_id=eq.${mitraId}`,
      }, (payload: { new: NotifItem }) => {
        get().addItem(payload.new);
      })
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: "target=eq.all",
      }, (payload: { new: NotifItem }) => {
        // Only add if we don't already have it (dedup with mitra filter)
        const exists = get().items.find((i) => i.id === payload.new.id);
        if (!exists) get().addItem(payload.new);
      })
      .subscribe();

    set({ channelSubscribed: true });

    return () => {
      supabase.removeChannel(ch);
      set({ channelSubscribed: false });
    };
  },
}));
