"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileUp,
  FilePlus,
  MapPinned,
  Coins,
  Receipt,
  Camera,
  LogOut,
} from "lucide-react";
import Image from "next/image";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useAuthStore } from "@/stores/auth-store";
import { useRouter } from "next/navigation";

const menuItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Manajemen Mitra",
    href: "/mitra",
    icon: Users,
  },
  {
    title: "Upload WO Otomatis",
    href: "/work-orders/upload-otomatis",
    icon: FileUp,
  },
  {
    title: "Upload WO Manual",
    href: "/work-orders/upload-manual",
    icon: FilePlus,
  },
  {
    title: "Tracking WO Mitra",
    href: "/tracking-wo-mitra",
    icon: MapPinned,
  },
  {
    title: "Bagi Hasil per WO",
    href: "/bagi-hasil",
    icon: Coins,
  },
  {
    title: "Bukti Bagi Hasil",
    href: "/bukti-saldo",
    icon: Receipt,
  },
  {
    title: "Bukti Penyelesaian WO",
    href: "/bukti-wo",
    icon: Camera,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-3 py-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 overflow-hidden rounded-md px-1 py-1 hover:bg-sidebar-accent transition-colors"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-sidebar-border bg-white">
            <Image
              src="/logo-goklirr.png"
              alt="GO KLIRR"
              width={36}
              height={36}
              className="h-7 w-7 object-contain"
            />
          </div>
          <span className="truncate text-base font-bold tracking-wide text-foreground group-data-[collapsible=icon]:hidden">
            GO KLIRR
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Utama</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={<Link href={item.href} />}
                    isActive={pathname === item.href}
                    tooltip={item.title}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="mb-2 truncate text-xs text-muted-foreground">
          {user?.email}
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} tooltip="Keluar">
              <LogOut className="h-4 w-4" />
              <span>Keluar</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
