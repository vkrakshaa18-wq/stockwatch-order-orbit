import { createFileRoute, Outlet, redirect, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, BarChart3, Boxes, ClipboardList, LayoutDashboard, LogOut, Package, Truck, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Logo } from "@/components/app/Logo";
import { productsQuery } from "@/lib/data";
import { stockStatus } from "@/lib/stock";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AppLayout,
});

const nav = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Products", url: "/products", icon: Package },
  { title: "Inventory", url: "/inventory", icon: ArrowLeftRight },
  { title: "Suppliers", url: "/suppliers", icon: Truck },
  { title: "Orders", url: "/orders", icon: ClipboardList },
  { title: "Reports", url: "/reports", icon: BarChart3 },
] as const;

function AppSidebar() {
  const { state, setOpenMobile } = useSidebar();
  const path = useRouterState({ select: (r) => r.location.pathname });
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-4">
        {state === "collapsed" ? (
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-primary text-primary-foreground"><Boxes className="h-5 w-5" /></div>
        ) : (
          <Logo light />
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map((i) => (
                <SidebarMenuItem key={i.url}>
                  <SidebarMenuButton asChild isActive={path.startsWith(i.url)} tooltip={i.title}>
                    <Link to={i.url} onClick={() => setOpenMobile(false)}>
                      <i.icon className="h-4 w-4" />
                      <span>{i.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3 text-[11px] text-sidebar-foreground/60">{state !== "collapsed" && "v1.0 · College Project"}</SidebarFooter>
    </Sidebar>
  );
}

function AppLayout() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: products = [] } = useQuery(productsQuery);
  const alerts = products.filter((p) => stockStatus(p.quantity, p.low_stock_threshold) !== "in_stock");
  const name = (user.user_metadata?.["full_name"] as string) || user.email || "User";
  const initials = name.split(/\s+/).map((s) => s[0]).join("").slice(0, 2).toUpperCase();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-card/90 px-4 backdrop-blur">
            <SidebarTrigger />
            <div className="hidden text-sm font-semibold text-foreground sm:block">Stock Management System</div>
            <div className="ml-auto flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger className="relative grid h-9 w-9 place-items-center rounded-full hover:bg-muted" aria-label="Stock alerts">
                  <Bell className="h-4 w-4" />
                  {alerts.length > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">{alerts.length}</span>}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72">
                  <DropdownMenuLabel>Stock alerts</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {alerts.length === 0 && <div className="px-2 py-3 text-sm text-muted-foreground">All products are well stocked.</div>}
                  {alerts.slice(0, 8).map((p) => (
                    <DropdownMenuItem key={p.id} onClick={() => navigate({ to: "/inventory" })} className="flex justify-between">
                      <span className="truncate">{p.name}</span>
                      <span className={p.quantity === 0 ? "text-xs font-semibold text-destructive" : "text-xs font-semibold text-warning-foreground"}>
                        {p.quantity === 0 ? "Out of stock" : `${p.quantity} left`}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 rounded-full p-1 pr-3 hover:bg-muted">
                  <Avatar className="h-8 w-8"><AvatarFallback className="bg-primary text-xs text-primary-foreground">{initials}</AvatarFallback></Avatar>
                  <span className="hidden max-w-40 truncate text-sm font-medium md:block">{name}</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="truncate">{name}</div>
                    <div className="truncate text-xs font-normal text-muted-foreground">{user.email}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="text-destructive"><LogOut className="h-4 w-4" /> Log out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 lg:p-8"><Outlet /></main>
        </div>
      </div>
    </SidebarProvider>
  );
}
