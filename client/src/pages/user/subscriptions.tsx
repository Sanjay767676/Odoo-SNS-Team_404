import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Layers, Calendar, Hash } from "lucide-react";
import type { Subscription, Product, Plan } from "@shared/schema";

export default function UserSubscriptions() {
  const { user } = useAuth();

  const { data: subscriptions, isLoading: loadingSubs } = useQuery<Subscription[]>({
    queryKey: ["/api/subscriptions"],
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: plans } = useQuery<Plan[]>({
    queryKey: ["/api/plans"],
  });

  const mySubs = subscriptions?.filter((s) => s.userId === user?.id) || [];

  const getProduct = (id: string) => products?.find((p) => p.id === id);
  const getPlan = (id: string) => plans?.find((p) => p.id === id);

  const isLoading = loadingSubs;

  const statusColors: Record<string, string> = {
    active: "bg-chart-2/15 text-chart-2",
    paused: "bg-chart-4/15 text-chart-4",
    overdue: "bg-destructive/15 text-destructive",
    cancelled: "bg-muted text-muted-foreground",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Subscriptions</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your active subscriptions</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : mySubs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Layers className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="font-semibold text-lg mb-1">No subscriptions yet</h3>
            <p className="text-sm text-muted-foreground">Browse products to start subscribing.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {mySubs.map((sub) => {
            const product = getProduct(sub.productId);
            const plan = getPlan(sub.planId);
            return (
              <Card key={sub.id} data-testid={`card-subscription-${sub.id}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-md bg-primary/10 shrink-0">
                        <Layers className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{product?.name || "Unknown Product"}</h3>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {plan?.name || "Unknown Plan"}
                          {plan && ` - $${Number(plan.price).toFixed(2)}/${plan.billingPeriod}`}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                          <div className="flex items-center gap-1">
                            <Hash className="h-3 w-3" />
                            <span>#{sub.id.slice(0, 8)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>Started {sub.startDate}</span>
                          </div>
                          {sub.endDate && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>Expires {sub.endDate}</span>
                            </div>
                          )}
                          <span>Qty: {sub.quantity}</span>
                        </div>
                      </div>
                    </div>
                    <Badge
                      className={`shrink-0 no-default-hover-elevate no-default-active-elevate ${statusColors[sub.status] || statusColors.active}`}
                    >
                      {sub.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
