// src/pages/dashboard/LayoutDashboard.tsx
import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/app-sidebar";
import { BranchSelector } from "@/components/BranchSelector";
import { UserNav } from "@/components/user-nav";
import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { ExchangeRateDisplay } from "@/components/ExchangeRateDisplay";
import { cn } from "@/lib/utils";

function DashboardHeader() {
  const { isMobile } = useSidebar();

  return (
    <header className={cn(
      "flex h-16 shrink-0 items-center justify-between border-b px-4 md:px-6 w-full",
      "bg-white shadow-sm"
    )}>
      <div className="flex items-center gap-2 md:gap-4">
        {/* Botón hamburguesa para mostrar/ocultar sidebar */}
        <SidebarTrigger />

        {/* BranchSelector responsive */}
        <div className={cn(
          "flex items-center",
          isMobile && "flex-1 min-w-0"
        )}>
          <BranchSelector />
        </div>

        {/* ExchangeRateDisplay solo en desktop */}
        {!isMobile && (
          <ExchangeRateDisplay
            showRefreshButton={true}
            showUpdateButton={true}
            variant="compact"
          />
        )}
      </div>

      <div className="ml-auto flex items-center gap-2 md:gap-4">
        <UserNav />
      </div>
    </header>
  );
}

export default function DashboardLayout() {
  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <div className="flex h-full w-full bg-gray-50 overflow-hidden">
        <AppSidebar />
        <div className="flex flex-1 flex-col overflow-hidden bg-white">
          <DashboardHeader />
          <main className="flex-1 overflow-hidden bg-white">
            <div className="h-full overflow-y-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}