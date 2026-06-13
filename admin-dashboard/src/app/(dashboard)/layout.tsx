"use client";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AuthGuard } from "@/components/layout/auth-guard";
import { DataSyncProvider } from "@/components/providers/data-sync-provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <DataSyncProvider>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset className="overflow-hidden">
            {children}
          </SidebarInset>
        </SidebarProvider>
      </DataSyncProvider>
    </AuthGuard>
  );
}
