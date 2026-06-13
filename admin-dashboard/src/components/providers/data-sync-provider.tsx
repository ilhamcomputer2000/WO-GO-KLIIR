"use client";

import { useEffect } from "react";
import { useDataStore } from "@/stores/data-store";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw } from "lucide-react";

const SYNC_INTERVAL_MS = 5000;

export function DataSyncProvider({ children }: { children: React.ReactNode }) {
  const sync = useDataStore((s) => s.sync);
  const isSyncing = useDataStore((s) => s.isSyncing);
  const lastSynced = useDataStore((s) => s.lastSynced);
  const syncError = useDataStore((s) => s.syncError);

  useEffect(() => {
    sync();
    const interval = setInterval(sync, SYNC_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [sync]);

  return (
    <>
      {syncError && (
        <div className="bg-destructive/10 text-destructive text-xs px-4 py-1.5 text-center">
          Sync error: {syncError}
        </div>
      )}
      <div className="hidden">
        {isSyncing && <Loader2 className="h-3 w-3 animate-spin" />}
        {lastSynced && (
          <Badge variant="outline" className="text-[10px]">
            <RefreshCw className="h-2 w-2 mr-1" />
            Synced
          </Badge>
        )}
      </div>
      {children}
    </>
  );
}
