import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Layers, Calendar, Hash, Tag, Percent, ArrowUpCircle, CalendarClock } from "lucide-react";
import type { Subscription, Product, Plan } from "@shared/schema";

export default function UserSubscriptions() {
  const { user } = useAuth();
  const [upgradeSub, setUpgradeSub] = useState<Subscription | null>(null);
  const [selectedUpgradePlan, setSelectedUpgradePlan] = useState("");

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

  const getNextBilling = (sub: Subscription, plan: Plan | undefined) => {
    if (sub.status !== "active" || !plan) return null;
    const start = new Date(sub.startDate);
    const now = new Date();
    const period = plan.billingPeriod;
    let next = new Date(start);
    while (next <= now) {
      if (period === "monthly") next.setMonth(next.getMonth() + 1);
      else if (period === "quarterly") next.setMonth(next.getMonth() + 3);
      else if (period === "yearly") next.setFullYear(next.getFullYear() + 1);
      else next.setMonth(next.getMonth() + 1);
    }
    return next;
  };

  const formatDate = (d: Date) => {
    return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
  };

  const getUpgradePlans = (sub: Subscription) => {
    const productPlans = plans?.filter((p) => p.productId === sub.productId) || [];
    return productPlans.filter((p) => p.id !== sub.planId);
  };

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
                        {(Number(sub.discountAmount || 0) > 0 || Number(sub.taxAmount || 0) > 0 || sub.total) && (
                          <div className="flex items-center gap-3 mt-2 text-xs flex-wrap">
                            {Number(sub.discountAmount || 0) > 0 && (
                              <div className="flex items-center gap-1 text-chart-2" data-testid={`text-sub-discount-${sub.id}`}>
                                <Tag className="h-3 w-3" />
                                <span>-${Number(sub.discountAmount).toFixed(2)} discount</span>
                                {sub.discountCode && (
                                  <Badge variant="secondary" className="text-[9px] ml-1">{sub.discountCode}</Badge>
                                )}
                              </div>
                            )}
                            {Number(sub.taxAmount || 0) > 0 && (
                              <div className="flex items-center gap-1 text-muted-foreground" data-testid={`text-sub-tax-${sub.id}`}>
                                <Percent className="h-3 w-3" />
                                <span>${Number(sub.taxAmount).toFixed(2)} tax ({sub.taxPercent}%)</span>
                              </div>
                            )}
                            {sub.total && (
                              <span className="font-semibold text-foreground" data-testid={`text-sub-total-${sub.id}`}>
                                Total: ${Number(sub.total).toFixed(2)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <Badge
                        className={`no-default-hover-elevate no-default-active-elevate ${statusColors[sub.status] || statusColors.active}`}
                      >
                        {sub.status}
                      </Badge>
                      {sub.status === "active" && getUpgradePlans(sub).length > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setUpgradeSub(sub);
                            setSelectedUpgradePlan("");
                          }}
                          data-testid={`button-upgrade-${sub.id}`}
                        >
                          <ArrowUpCircle className="h-3.5 w-3.5 mr-1" />
                          Upgrade Plan
                        </Button>
                      )}
                    </div>
                  </div>
                  {(() => {
                    const nextBill = getNextBilling(sub, plan);
                    if (!nextBill || !plan) return null;
                    const amt = sub.total ? Number(sub.total) : Number(plan.price) * sub.quantity;
                    return (
                      <div className="mt-3 flex items-center gap-2 text-xs bg-muted/50 rounded-md px-3 py-2" data-testid={`text-next-billing-${sub.id}`}>
                        <CalendarClock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">
                          Next billing: <span className="font-medium text-foreground">{formatDate(nextBill)}</span>
                          {" "}
                          <span className="font-semibold text-foreground">${amt.toFixed(2)}</span>
                        </span>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      <Dialog open={!!upgradeSub} onOpenChange={(v) => { if (!v) { setUpgradeSub(null); setSelectedUpgradePlan(""); } }}>
        <DialogContent className="max-w-md" data-testid="dialog-upgrade-plan">
          <DialogHeader>
            <DialogTitle>Upgrade Plan</DialogTitle>
            <DialogDescription>
              Choose a new plan for {upgradeSub ? getProduct(upgradeSub.productId)?.name : ""}
            </DialogDescription>
          </DialogHeader>
          {upgradeSub && (() => {
            const currentPlan = getPlan(upgradeSub.planId);
            const availablePlans = getUpgradePlans(upgradeSub);
            const newPlan = plans?.find((p) => p.id === selectedUpgradePlan);
            return (
              <div className="space-y-4 mt-2">
                <div className="bg-muted/50 rounded-md p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">Current Plan</p>
                  <p className="text-sm font-medium">
                    {currentPlan?.name} - ${Number(currentPlan?.price || 0).toFixed(2)}/{currentPlan?.billingPeriod}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Select New Plan</Label>
                  <Select value={selectedUpgradePlan} onValueChange={setSelectedUpgradePlan}>
                    <SelectTrigger data-testid="select-upgrade-plan">
                      <SelectValue placeholder="Choose a plan to upgrade to" />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePlans.map((p) => (
                        <SelectItem key={p.id} value={p.id} data-testid={`option-upgrade-plan-${p.id}`}>
                          {p.name} - ${Number(p.price).toFixed(2)}/{p.billingPeriod}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {newPlan && (
                  <div className="rounded-md border p-3 space-y-2 text-sm" data-testid="upgrade-preview">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">New Price</span>
                      <span className="font-semibold">${Number(newPlan.price).toFixed(2)}/{newPlan.billingPeriod}</span>
                    </div>
                    {Number(newPlan.price) > Number(currentPlan?.price || 0) && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Difference</span>
                        <span className="text-chart-4 font-medium">
                          +${(Number(newPlan.price) - Number(currentPlan?.price || 0)).toFixed(2)}/{newPlan.billingPeriod}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <Button
                  className="w-full"
                  disabled={!selectedUpgradePlan}
                  onClick={() => {
                    setUpgradeSub(null);
                    setSelectedUpgradePlan("");
                  }}
                  data-testid="button-confirm-upgrade"
                >
                  <ArrowUpCircle className="h-4 w-4 mr-2" />
                  Confirm Upgrade
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Plan changes will take effect on your next billing cycle.
                </p>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
