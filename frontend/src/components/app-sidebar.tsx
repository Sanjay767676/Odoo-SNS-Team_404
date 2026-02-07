import { useLocation, Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import type { Company } from "@shared/schema";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Package,
  BarChart3,
  FileText,
  CreditCard,
  ShoppingBag,
  User,
  LogOut,
  Layers,
  FileCheck,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const adminMenuItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Products", url: "/admin/products", icon: Package },
  { title: "Subscriptions", url: "/admin/subscriptions", icon: Layers },
  { title: "Invoices", url: "/admin/invoices", icon: FileText },
  { title: "Payments", url: "/admin/payments", icon: CreditCard },
  { title: "Quotation Templates", url: "/admin/quotation-templates", icon: FileCheck },
  { title: "Reports", url: "/admin/reports", icon: BarChart3 },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

const internalMenuItems = [
  { title: "Dashboard", url: "/internal", icon: LayoutDashboard },
  { title: "Invoices", url: "/internal/invoices", icon: FileText },
];

const userMenuItems = [
  { title: "Browse Products", url: "/user", icon: ShoppingBag },
  { title: "My Subscriptions", url: "/user/subscriptions", icon: Layers },
  { title: "Invoices", url: "/user/invoices", icon: CreditCard },
  { title: "Profile", url: "/user/profile", icon: User },
];

const roleLabels: Record<string, string> = {
  admin: "Admin Portal",
  internal: "Internal Portal",
  user: "User Portal",
};

const roleColors: Record<string, string> = {
  admin: "bg-primary text-primary-foreground",
  internal: "bg-chart-2 text-white dark:text-foreground",
  user: "bg-chart-4 text-white dark:text-foreground",
};

export function AppSidebar() {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const { data: company } = useQuery<Company>({
    queryKey: [user?.companyId ? `/api/companies/${user.companyId}` : null],
    enabled: !!user?.companyId,
  });

  if (!user) return null;

  const menuItems =
    user.role === "admin"
      ? adminMenuItems
      : user.role === "internal"
        ? internalMenuItems
        : userMenuItems;

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const brandColor = company?.primaryColor || "#6366f1";

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-md"
            style={{ backgroundColor: brandColor }}
          >
            <Layers className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">{company?.name || "SubsManager"}</span>
            <Badge
              className={`text-[10px] px-1.5 py-0 w-fit ${roleColors[user.role] || ""}`}
              data-testid="badge-role"
            >
              {roleLabels[user.role] || user.role}
            </Badge>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild data-active={isActive}>
                      <Link href={item.url} data-testid={`nav-${item.title.toLowerCase().replace(/\s/g, "-")}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs bg-muted">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" data-testid="text-user-name">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => logout()}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
