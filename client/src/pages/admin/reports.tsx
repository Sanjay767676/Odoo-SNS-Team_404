import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, CreditCard, AlertTriangle, TrendingUp } from "lucide-react";
import type { Product, Subscription, Invoice } from "@shared/schema";

export default function AdminReports() {
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

  const myProductIds = products?.filter((p) => p.adminId === user?.id).map((p) => p.id) || [];
  const activeSubs = subscriptions?.filter((s) => myProductIds.includes(s.productId) && s.status === "active").length || 0;
  const totalRevenue = invoices?.filter((i) => i.status === "paid").reduce((sum, i) => sum + Number(i.amount), 0) || 0;
  const overdueCount = invoices?.filter((i) => i.status === "overdue").length || 0;
  const pendingCount = invoices?.filter((i) => i.status === "pending").length || 0;

  const reportCards = [
    {
      label: "Active Subscriptions",
      value: activeSubs,
      icon: Activity,
      color: "text-chart-2",
      bgColor: "bg-chart-2/10",
      description: "Currently active subscriber plans",
    },
    {
      label: "Total Revenue",
      value: `$${totalRevenue.toLocaleString()}`,
      icon: TrendingUp,
      color: "text-primary",
      bgColor: "bg-primary/10",
      description: "Revenue from paid invoices",
    },
    {
      label: "Overdue Invoices",
      value: overdueCount,
      icon: AlertTriangle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      description: "Invoices past their due date",
    },
    {
      label: "Pending Payments",
      value: pendingCount,
      icon: CreditCard,
      color: "text-chart-4",
      bgColor: "bg-chart-4/10",
      description: "Invoices awaiting payment",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of your business metrics</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {reportCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="p-6">
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-3 w-48" />
                </div>
              ) : (
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-md ${card.bgColor}`}>
                    <card.icon className={`h-6 w-6 ${card.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{card.label}</p>
                    <p className="text-3xl font-bold mt-1" data-testid={`stat-${card.label.toLowerCase().replace(/\s/g, "-")}`}>
                      {card.value}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
