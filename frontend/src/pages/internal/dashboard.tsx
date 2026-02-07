import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Package, Plus, Globe, Loader2, Calendar, ClipboardList, CreditCard, DollarSign, AlertTriangle, TrendingUp, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Product, Plan, Subscription, Invoice } from "@shared/schema";

const planSchema = z.object({
  name: z.string().min(1, "Plan name is required"),
  price: z.string().min(1, "Price is required"),
  billingPeriod: z.string().min(1, "Billing period is required"),
  minQuantity: z.string().default("1"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  taxPercent: z.string().default("18"),
});

type PlanForm = z.infer<typeof planSchema>;

export default function InternalDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [planOptions, setPlanOptions] = useState({
    pausable: false,
    renewable: true,
    closable: true,
    autoClose: false,
  });
  const [discountType, setDiscountType] = useState("");

  const { data: products, isLoading: loadingProducts } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: plans, isLoading: loadingPlans } = useQuery<Plan[]>({
    queryKey: ["/api/plans"],
  });

  const { data: subscriptions, isLoading: loadingSubs } = useQuery<Subscription[]>({
    queryKey: ["/api/subscriptions"],
  });

  const { data: invoices, isLoading: loadingInvoices } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const myProductsRaw = products?.filter(
    (p) => p.assignedInternalId === user?.id && (p.status === "pending_internal" || p.status === "published")
  ) || [];

  const myProducts = searchQuery.trim()
    ? myProductsRaw.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.companyName && p.companyName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      p.type.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : myProductsRaw;

  const myProductIds = new Set(myProductsRaw.map((p) => p.id));

  const mySubscriptions = subscriptions?.filter((s) => myProductIds.has(s.productId)) || [];
  const activeSubCount = mySubscriptions.filter((s) => s.status === "active").length;

  const myPlansTotal = plans?.filter((p) => myProductIds.has(p.productId)).length || 0;

  const myRevenue = invoices?.reduce((sum, inv) => {
    if (inv.status !== "paid") return sum;
    const sub = subscriptions?.find((s) => s.id === inv.subscriptionId);
    if (!sub || !myProductIds.has(sub.productId)) return sum;
    return sum + Number(inv.amount);
  }, 0) || 0;

  const myOverdueCount = invoices?.filter((inv) => {
    if (inv.status === "paid") return false;
    const sub = subscriptions?.find((s) => s.id === inv.subscriptionId);
    if (!sub || !myProductIds.has(sub.productId)) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(inv.dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today;
  }).length || 0;

  const form = useForm<PlanForm>({
    resolver: zodResolver(planSchema),
    defaultValues: { name: "", price: "", billingPeriod: "monthly", minQuantity: "1", startDate: "", endDate: "", taxPercent: "18" },
  });

  const createPlanMutation = useMutation({
    mutationFn: async (data: PlanForm) => {
      let discountValue: number | null = null;
      if (discountType === "percent_first_month_10") {
        discountValue = 10;
      } else if (discountType === "fixed_200") {
        discountValue = 200;
      }
      const res = await apiRequest("POST", "/api/plans", {
        ...data,
        productId: selectedProduct?.id,
        minQuantity: Number(data.minQuantity) || 1,
        ...planOptions,
        discountType: discountType === "percent_first_month_10" ? "percent_first_month" : discountType === "fixed_200" ? "fixed" : null,
        discountValue,
        taxPercent: Number(data.taxPercent) || 18,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
      toast({ title: "Plan created", description: "Subscription plan added successfully." });
      setPlanDialogOpen(false);
      form.reset();
      setPlanOptions({ pausable: false, renewable: true, closable: true, autoClose: false });
      setDiscountType("");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (productId: string) => {
      const res = await apiRequest("PATCH", `/api/products/${productId}/publish`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Product published!", description: "Product is now visible to subscribers." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const getProductPlans = (productId: string) =>
    plans?.filter((p) => p.productId === productId) || [];

  const isLoading = loadingProducts || loadingPlans || loadingSubs || loadingInvoices;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-internal-welcome">
            Welcome, {user?.name}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage assigned products and subscription plans.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search assigned products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-[240px]"
              data-testid="input-search-internal-products"
            />
          </div>
          <Button variant="secondary" size="icon" data-testid="button-search-internal-submit">
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Active Subscriptions", value: activeSubCount, icon: CreditCard, color: "text-chart-4", bgColor: "bg-chart-4/10" },
          { label: "Total Plans", value: myPlansTotal, icon: TrendingUp, color: "text-chart-2", bgColor: "bg-chart-2/10" },
          { label: "Total Revenue", value: `$${myRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: DollarSign, color: "text-chart-5", bgColor: "bg-chart-5/10" },
          { label: "Overdue Invoices", value: myOverdueCount, icon: AlertTriangle, color: myOverdueCount > 0 ? "text-destructive" : "text-muted-foreground", bgColor: myOverdueCount > 0 ? "bg-destructive/10" : "bg-muted" },
        ].map((stat) => (
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
                    <p className="text-2xl font-bold mt-1" data-testid={`stat-internal-${stat.label.toLowerCase().replace(/\s/g, "-")}`}>
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

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="p-5 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : myProductsRaw.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <ClipboardList className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="font-semibold text-lg mb-1">No assigned products</h3>
            <p className="text-sm text-muted-foreground">
              Wait for an admin to assign products to you.
            </p>
          </CardContent>
        </Card>
      ) : myProducts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Search className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="font-semibold text-lg mb-1">No matching products</h3>
            <p className="text-sm text-muted-foreground">Try a different search term.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {myProducts.map((product) => {
            const productPlans = getProductPlans(product.id);
            return (
              <Card key={product.id} data-testid={`card-internal-product-${product.id}`}>
                <CardHeader className="pb-3 flex flex-row items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold truncate">{product.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {product.companyName || product.type} &middot; ${Number(product.salesPrice).toFixed(2)}
                    </p>
                  </div>
                  <Badge
                    className={`text-[11px] shrink-0 no-default-hover-elevate no-default-active-elevate ${product.status === "published"
                      ? "bg-chart-2/15 text-chart-2"
                      : "bg-chart-4/15 text-chart-4"
                      }`}
                  >
                    {product.status}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  {productPlans.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Plans</p>
                      {productPlans.map((plan) => (
                        <div key={plan.id} className="bg-muted/50 rounded-md px-3 py-2 text-sm space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="font-medium">{plan.name}</span>
                            </div>
                            <span>${Number(plan.price).toFixed(2)}/{plan.billingPeriod}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {plan.discountType && (
                              <Badge variant="secondary" className="text-[9px]" data-testid={`badge-plan-discount-${plan.id}`}>
                                {plan.discountType === "percent_first_month"
                                  ? `${plan.discountValue}% off 1st mo`
                                  : `Flat ${plan.discountValue} off`}
                              </Badge>
                            )}
                            <Badge variant="secondary" className="text-[9px]" data-testid={`badge-plan-tax-${plan.id}`}>
                              Tax: {plan.taxPercent || "18"}%
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    <Dialog open={planDialogOpen && selectedProduct?.id === product.id} onOpenChange={(v) => {
                      setPlanDialogOpen(v);
                      if (v) setSelectedProduct(product);
                    }}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => setSelectedProduct(product)} data-testid={`button-add-plan-${product.id}`}>
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Add Plan
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Add Subscription Plan</DialogTitle>
                        </DialogHeader>
                        <form
                          onSubmit={form.handleSubmit((data) => createPlanMutation.mutate(data))}
                          className="space-y-4 mt-2"
                        >
                          <div className="space-y-2">
                            <Label>Plan Name</Label>
                            <Input placeholder="e.g. Monthly Basic" {...form.register("name")} data-testid="input-plan-name" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Price ($)</Label>
                              <Input type="number" step="0.01" placeholder="0.00" {...form.register("price")} data-testid="input-plan-price" />
                            </div>
                            <div className="space-y-2">
                              <Label>Billing Period</Label>
                              <Select
                                defaultValue="monthly"
                                onValueChange={(val) => form.setValue("billingPeriod", val)}
                              >
                                <SelectTrigger data-testid="select-billing-period">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="daily">Daily</SelectItem>
                                  <SelectItem value="weekly">Weekly</SelectItem>
                                  <SelectItem value="monthly">Monthly</SelectItem>
                                  <SelectItem value="yearly">Yearly</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Min Quantity</Label>
                            <Input type="number" min="1" {...form.register("minQuantity")} data-testid="input-min-quantity" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Start Date</Label>
                              <Input type="date" {...form.register("startDate")} data-testid="input-start-date" />
                            </div>
                            <div className="space-y-2">
                              <Label>End Date</Label>
                              <Input type="date" {...form.register("endDate")} data-testid="input-end-date" />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Discount (Optional)</Label>
                            <Select value={discountType} onValueChange={setDiscountType}>
                              <SelectTrigger data-testid="select-discount">
                                <SelectValue placeholder="No discount" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No discount</SelectItem>
                                <SelectItem value="percent_first_month_10">10% off first month</SelectItem>
                                <SelectItem value="fixed_200">Fixed &#8377;200 off</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Tax Percentage (%)</Label>
                            <div className="flex items-center gap-2">
                              <Input type="number" step="0.1" min="0" max="100" {...form.register("taxPercent")} data-testid="input-tax-percent" />
                              <Badge variant="secondary" className="shrink-0 no-default-hover-elevate no-default-active-elevate">GST</Badge>
                            </div>
                            {form.watch("price") && form.watch("taxPercent") && (
                              <p className="text-xs text-muted-foreground" data-testid="text-tax-preview">
                                Tax on ${Number(form.watch("price") || 0).toFixed(2)}: ${(Number(form.watch("price") || 0) * Number(form.watch("taxPercent") || 18) / 100).toFixed(2)} ({form.watch("taxPercent")}%)
                              </p>
                            )}
                          </div>

                          <div className="space-y-3">
                            <Label>Plan Options</Label>
                            <div className="grid grid-cols-2 gap-3">
                              {[
                                { key: "pausable", label: "Pausable" },
                                { key: "renewable", label: "Renewable" },
                                { key: "closable", label: "Closable" },
                                { key: "autoClose", label: "Auto-close" },
                              ].map((opt) => (
                                <div key={opt.key} className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2">
                                  <span className="text-sm">{opt.label}</span>
                                  <Switch
                                    checked={(planOptions as any)[opt.key]}
                                    onCheckedChange={(v) =>
                                      setPlanOptions((prev) => ({ ...prev, [opt.key]: v }))
                                    }
                                    data-testid={`switch-${opt.key}`}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>

                          <Button type="submit" className="w-full" disabled={createPlanMutation.isPending} data-testid="button-submit-plan">
                            {createPlanMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Plan"}
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>

                    {product.status === "pending_internal" && productPlans.length > 0 && (
                      <Button
                        size="sm"
                        onClick={() => publishMutation.mutate(product.id)}
                        disabled={publishMutation.isPending}
                        data-testid={`button-publish-${product.id}`}
                      >
                        {publishMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                        ) : (
                          <Globe className="h-3.5 w-3.5 mr-1" />
                        )}
                        Publish
                      </Button>
                    )}
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
