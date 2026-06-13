"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/stores/auth-store";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useDataStore } from "@/stores/data-store";

interface DashboardHeaderProps {
  title: string;
  description?: string;
}

export function DashboardHeader({ title, description }: DashboardHeaderProps) {
  const user = useAuthStore((s) => s.user);
  const isSyncing = useDataStore((s) => s.isSyncing);
  const lastSynced = useDataStore((s) => s.lastSynced);

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <div className="flex flex-1 items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold">{title}</h1>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="hidden sm:inline-flex text-[10px] text-emerald-700 border-emerald-200"
          >
            {isSyncing ? "Syncing..." : lastSynced ? "Live sync" : "..."}
          </Badge>
          <Badge variant="secondary" className="hidden sm:inline-flex">
            Super Admin
          </Badge>
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {user?.name?.charAt(0) ?? "S"}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
