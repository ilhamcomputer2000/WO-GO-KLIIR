"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, BellRing, Clipboard, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

type Notif = {
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

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins} menit lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} jam lalu`;
  return `${Math.floor(hrs / 24)} hari lalu`;
}

function notifIcon(type: string) {
  if (type === "new_wo") return <Clipboard className="h-4 w-4 text-blue-600" />;
  if (type === "new_mitra") return <Users className="h-4 w-4 text-emerald-600" />;
  return <Bell className="h-4 w-4 text-gray-500" />;
}

export function NotificationBell() {
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const channelRef = useRef<ReturnType<NonNullable<ReturnType<typeof getSupabaseBrowser>>["channel"]> | null>(null);

  const unread = notifs.filter((n) => !n.read).length;

  const fetchNotifs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?target=admin");
      const json = await res.json();
      setNotifs(json.notifications ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
    const supabase = getSupabaseBrowser();
    if (!supabase) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channel = (supabase.channel as any)("admin-notifications")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
      }, (payload: { new: Notif }) => {
        const row = payload.new;
        if (row.target === "all" || row.target === "admin") {
          setNotifs((prev) => [row, ...prev].slice(0, 50));
        }
      })
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleOpen = async () => {
    setOpen(true);
    if (unread > 0) {
      setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
      try {
        await fetch("/api/notifications?target=admin", { method: "PATCH" });
      } catch { /* ignore */ }
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="relative h-8 w-8"
        aria-label="Notifikasi"
        onClick={handleOpen}
      >
        {unread > 0 ? (
          <BellRing className="h-4 w-4 text-primary" style={{ animation: "ring 1s ease-in-out 3" }} />
        ) : (
          <Bell className="h-4 w-4" />
        )}
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm p-0">
          <DialogHeader className="px-4 pt-4 pb-3 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <DialogTitle className="text-sm font-semibold">Notifikasi</DialogTitle>
                {unread > 0 && (
                  <Badge className="h-5 px-1.5 text-[10px]" variant="destructive">
                    {unread} baru
                  </Badge>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[400px]">
            {loading && notifs.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <span className="text-sm text-muted-foreground">Memuat...</span>
              </div>
            ) : notifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Bell className="h-8 w-8 text-muted-foreground/30" />
                <span className="text-sm text-muted-foreground">Belum ada notifikasi</span>
              </div>
            ) : (
              <ul className="divide-y">
                {notifs.map((n) => (
                  <li
                    key={n.id}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3",
                      !n.read && "bg-blue-50/60"
                    )}
                  >
                    <div className="mt-0.5 shrink-0">{notifIcon(n.type)}</div>
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-sm leading-snug", !n.read ? "font-semibold" : "font-medium text-foreground/80")}>
                        {n.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground/70">{timeAgo(n.created_at)}</p>
                    </div>
                    {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {notifs.length > 0 && (
            <>
              <Separator />
              <div className="px-4 py-2">
                <p className="text-[10px] text-center text-muted-foreground">
                  {notifs.length} notifikasi terakhir
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
