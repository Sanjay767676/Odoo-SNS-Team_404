import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Package, DollarSign, Users, TrendingUp, AlertTriangle, CreditCard } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Product, Subscription, Invoice } from "@shared/schema";

export default function AdminDashboard() {
  const { user } = useAuth();

  const { data: products, isLoading: loadingProducts } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: subscriptions, isLoading: loadingSubs } = useQuery<Subscription[]>({
    queryKey: ["/api/subscriptions"],
  });

  const { data: invoices, isLoading: loadingInvoices } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const isLoading = loadingProducts || loadingSubs || loadingInvoices;

  const myProducts = products?.filter((p) => p.adminId === user?.id) || [];
  const myProductIds = new Set(myProducts.map((p) => p.id));
  const publishedCount = myProducts.filter((p) => p.status === "published").length;

  const activeSubscriptions = subscriptions?.filter(
    (s) => myProductIds.has(s.productId) && s.status === "active"
  ) || [];

  const overdueInvoices = invoices?.filter((inv) => {
    if (inv.status === "paid") return false;
    const sub = subscriptions?.find((s) => s.id === inv.subscriptionId);
    if (!sub || !myProductIds.has(sub.productId)) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(inv.dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today;
  }) || [];

  const monthlyRevenue = (() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    let total = 0;
    invoices?.forEach((inv) => {
      if (inv.status !== "paid") return;
      const sub = subscriptions?.find((s) => s.id === inv.subscriptionId);
      if (!sub || !myProductIds.has(sub.productId)) return;
      if (inv.paidDate) {
        const pd = new Date(inv.paidDate);
        if (pd.getMonth() === thisMonth && pd.getFullYear() === thisYear) {
          total += Number(inv.amount);
        }
      }
    });
    return total;
  })();

  const stats = [
    {
      label: "My Products",
      value: myProducts.length,
      icon: Package,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Published",
      value: publishedCount,
      icon: TrendingUp,
      color: "text-chart-2",
      bgColor: "bg-chart-2/10",
    },
    {
      label: "Active Subscriptions",
      value: activeSubscriptions.length,
      icon: CreditCard,
      color: "text-chart-4",
      bgColor: "bg-chart-4/10",
    },
    {
      label: "Monthly Revenue",
      value: `$${monthlyRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: "text-chart-5",
      bgColor: "bg-chart-5/10",
    },
    {
      label: "Overdue Invoices",
      value: overdueInvoices.length,
      icon: AlertTriangle,
      color: overdueInvoices.length > 0 ? "text-destructive" : "text-muted-foreground",
      bgColor: overdueInvoices.length > 0 ? "bg-destructive/10" : "bg-muted",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-admin-welcome">
          Welcome back, {user?.name}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Here's an overview of your products and performance.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-5">
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-16" />
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold mt-1" data-testid={`stat-${stat.label.toLowerCase().replace(/\s/g, "-")}`}>
                      {stat.value}
                    </p>
                  </div>
                  <div className={`p-2 rounded-md ${stat.bgColor}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Recent Products</h2>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : myProducts.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">No products yet. Create your first product!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {myProducts.slice(0, 5).map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between gap-4 p-3 rounded-md bg-muted/50"
                  data-testid={`product-row-${product.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">${Number(product.salesPrice).toFixed(2)}</p>
                    <StatusBadge status={product.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    assigned: "bg-chart-4/15 text-chart-4",
    published: "bg-chart-2/15 text-chart-2",
  };
  return (
    <span className={`inline-block text-[11px] px-2 py-0.5 rounded-md font-medium ${colors[status] || colors.draft}`}>
      {status}
    </span>
  );
}
