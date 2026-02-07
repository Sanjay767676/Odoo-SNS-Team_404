import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingBag, Loader2, CheckCircle2, Building2, Tag, Percent, DollarSign, CreditCard, Layers } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Product, Plan, Invoice, Subscription } from "@shared/schema";

export default function UserBrowse() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [subscribed, setSubscribed] = useState(false);
  const [discountCode, setDiscountCode] = useState("");
  const [discountValidation, setDiscountValidation] = useState<{ valid: boolean; label?: string; type?: string; value?: number } | null>(null);
  const [validatingCode, setValidatingCode] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});

  const { data: products, isLoading: loadingProducts } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: plans } = useQuery<Plan[]>({
    queryKey: ["/api/plans"],
  });

  const { data: invoices, isLoading: loadingInvoices } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const { data: subscriptions, isLoading: loadingSubs } = useQuery<Subscription[]>({
    queryKey: ["/api/subscriptions"],
  });

  const publishedProducts = products?.filter((p) => p.status === "published") || [];

  const thisYear = new Date().getFullYear();
  const totalSpentThisYear = invoices?.reduce((sum, inv) => {
    if (inv.userId !== user?.id || inv.status !== "paid") return sum;
    if (inv.paidDate) {
      const pd = new Date(inv.paidDate);
      if (pd.getFullYear() === thisYear) {
        return sum + Number(inv.amount);
      }
    }
    return sum;
  }, 0) || 0;

  const activeSubCount = subscriptions?.filter((s) => s.userId === user?.id && s.status === "active").length || 0;

  const getProductPlans = (productId: string) =>
    plans?.filter((p) => p.productId === productId) || [];

  const validateDiscount = async () => {
    if (!discountCode.trim()) {
      setDiscountValidation(null);
      return;
    }
    setValidatingCode(true);
    try {
      const res = await apiRequest("POST", "/api/discount-codes/validate", { code: discountCode.trim() });
      const data = await res.json();
      setDiscountValidation(data);
      if (!data.valid) {
        toast({ title: "Invalid code", description: data.message || "This discount code is not valid.", variant: "destructive" });
      }
    } catch {
      setDiscountValidation({ valid: false });
    } finally {
      setValidatingCode(false);
    }
  };

  const selectedPlan = plans?.find((p) => p.id === selectedPlanId);

  const getVariantExtraPrice = () => {
    if (!selectedProduct) return 0;
    const variants = (selectedProduct.variants as any[]) || [];
    let extra = 0;
    Object.entries(selectedVariants).forEach(([attr, val]) => {
      const v = variants.find(variant => variant.attribute === attr && variant.value === val);
      if (v) extra += Number(v.extraPrice || 0);
    });
    return extra;
  };

  const variantExtra = getVariantExtraPrice();
  const basePrice = (Number(selectedPlan?.price || 0) + variantExtra) * (Number(quantity) || 1);
  const taxPercent = Number(selectedPlan?.taxPercent || 18);

  const getDiscountAmount = () => {
    if (discountValidation?.valid && discountValidation.type && discountValidation.value) {
      if (discountValidation.type === "percent_first_month") {
        return basePrice * discountValidation.value / 100;
      } else if (discountValidation.type === "fixed") {
        return Math.min(discountValidation.value, basePrice);
      }
    }
    if (selectedPlan?.discountType && selectedPlan?.discountValue) {
      if (selectedPlan.discountType === "percent_first_month") {
        return basePrice * Number(selectedPlan.discountValue) / 100;
      } else if (selectedPlan.discountType === "fixed") {
        return Math.min(Number(selectedPlan.discountValue), basePrice);
      }
    }
    return 0;
  };

  const discountAmt = getDiscountAmount();
  const subtotal = basePrice - discountAmt;
  const taxAmt = subtotal * taxPercent / 100;
  const total = subtotal + taxAmt;

  const subscribeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/subscriptions", {
        productId: selectedProduct?.id,
        planId: selectedPlanId,
        quantity: Number(quantity) || 1,
        discountCode: discountCode.trim() || null,
        selectedVariants,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setSubscribed(true);
      toast({ title: "Subscribed!", description: "Your subscription has been created." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const closeDialog = () => {
    setSelectedProduct(null);
    setSelectedPlanId("");
    setQuantity("1");
    setSubscribed(false);
    setDiscountCode("");
    setDiscountValidation(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Browse Products</h1>
        <p className="text-sm text-muted-foreground mt-1">Discover and subscribe to products</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total Spent This Year", value: `$${totalSpentThisYear.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: DollarSign, color: "text-chart-5", bgColor: "bg-chart-5/10", testId: "stat-total-spent-this-year" },
          { label: "Active Subscriptions", value: activeSubCount, icon: CreditCard, color: "text-chart-4", bgColor: "bg-chart-4/10", testId: "stat-user-active-subs" },
          { label: "Available Products", value: publishedProducts.length, icon: Layers, color: "text-primary", bgColor: "bg-primary/10", testId: "stat-available-products" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-5">
              {(loadingProducts || loadingInvoices || loadingSubs) ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-16" />
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold mt-1" data-testid={stat.testId}>
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

      {loadingProducts ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="p-5 space-y-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : publishedProducts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <ShoppingBag className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="font-semibold text-lg mb-1">No products available</h3>
            <p className="text-sm text-muted-foreground">Check back later for new products.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {publishedProducts.map((product) => {
            const productPlans = getProductPlans(product.id);
            const lowestPrice = productPlans.length > 0
              ? Math.min(...productPlans.map((p) => Number(p.price)))
              : Number(product.salesPrice);

            return (
              <Card
                key={product.id}
                className="hover-elevate cursor-pointer"
                onClick={() => setSelectedProduct(product)}
                data-testid={`card-browse-product-${product.id}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10 rounded-md shrink-0" data-testid={`avatar-product-${product.id}`}>
                      <AvatarFallback className="rounded-md bg-primary/10 text-primary text-sm font-bold">
                        {(product.companyName || product.name).slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold truncate">{product.name}</h3>
                      {product.companyName && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Building2 className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{product.companyName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">{product.type}</p>

                  {productPlans.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {productPlans.map((plan) => (
                        <Badge key={plan.id} variant="secondary" className="text-[10px]">
                          {plan.billingPeriod}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold">From ${lowestPrice.toFixed(2)}</span>
                    {productPlans.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        /{productPlans[0]?.billingPeriod}
                      </span>
                    )}
                  </div>

                  <Button className="w-full" size="sm" data-testid={`button-view-product-${product.id}`}>
                    View Plans
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!selectedProduct} onOpenChange={(v) => !v && closeDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedProduct?.name}</DialogTitle>
          </DialogHeader>
          {subscribed ? (
            <div className="flex flex-col items-center py-8">
              <div className="p-3 rounded-full bg-chart-2/10 mb-4">
                <CheckCircle2 className="h-10 w-10 text-chart-2" />
              </div>
              <h3 className="text-lg font-semibold mb-1">Subscription Created!</h3>
              <p className="text-sm text-muted-foreground text-center mb-4">
                You're now subscribed. Check your subscriptions page.
              </p>
              <Button onClick={closeDialog} data-testid="button-close-success">Done</Button>
            </div>
          ) : (
            <div className="space-y-4 mt-2">
              {selectedProduct?.companyName && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span>{selectedProduct.companyName}</span>
                </div>
              )}

              <div className="text-sm">
                <span className="text-muted-foreground">Type: </span>
                <span className="font-medium">{selectedProduct?.type}</span>
              </div>

              <div className="text-sm">
                <span className="text-muted-foreground">Base Price: </span>
                <span className="font-medium">${Number(selectedProduct?.salesPrice || 0).toFixed(2)}</span>
              </div>

              {selectedProduct && selectedProduct.variants && (selectedProduct.variants as any[]).length > 0 && (
                <div className="space-y-3 py-2 bg-muted/30 p-3 rounded-md">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Tag className="h-3 w-3" /> Select Variants
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {Array.from(new Set((selectedProduct.variants as any[]).map(v => v.attribute))).map(attr => (
                      <div key={attr} className="space-y-1.5">
                        <Label className="text-[11px] font-medium">{attr}</Label>
                        <Select
                          value={selectedVariants[attr] || ""}
                          onValueChange={(val) => setSelectedVariants(prev => ({ ...prev, [attr]: val }))}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder={`Select ${attr}`} />
                          </SelectTrigger>
                          <SelectContent>
                            {(selectedProduct!.variants as any[])
                              .filter(v => v.attribute === attr)
                              .map(v => (
                                <SelectItem key={v.value} value={v.value} className="text-xs">
                                  {v.value} {Number(v.extraPrice) > 0 ? `(+$${v.extraPrice})` : ""}
                                </SelectItem>
                              ))
                            }
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedProduct && getProductPlans(selectedProduct.id).length > 0 && (
                <div className="space-y-2">
                  <Label>Select Plan</Label>
                  <Select onValueChange={setSelectedPlanId} value={selectedPlanId}>
                    <SelectTrigger data-testid="select-plan">
                      <SelectValue placeholder="Choose a plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {getProductPlans(selectedProduct.id).map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name} - ${Number(plan.price).toFixed(2)}/{plan.billingPeriod}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  data-testid="input-quantity"
                />
              </div>

              <div className="space-y-2">
                <Label>Discount Code (Optional)</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter code e.g. FIRST10"
                    value={discountCode}
                    onChange={(e) => {
                      setDiscountCode(e.target.value);
                      setDiscountValidation(null);
                    }}
                    data-testid="input-discount-code"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={validateDiscount}
                    disabled={!discountCode.trim() || validatingCode}
                    data-testid="button-validate-code"
                  >
                    {validatingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                  </Button>
                </div>
                {discountValidation?.valid && (
                  <div className="flex items-center gap-2 text-sm text-chart-2" data-testid="text-discount-applied">
                    <Tag className="h-3.5 w-3.5" />
                    <span>{discountValidation.label}</span>
                  </div>
                )}
              </div>

              {selectedPlanId && (
                <div className="rounded-md border p-3 space-y-2 text-sm" data-testid="price-breakdown">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>${basePrice.toFixed(2)}</span>
                  </div>
                  {discountAmt > 0 && (
                    <div className="flex justify-between text-chart-2">
                      <span className="flex items-center gap-1">
                        <Percent className="h-3 w-3" />
                        Discount
                      </span>
                      <span>-${discountAmt.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax ({taxPercent}%)</span>
                    <span>${taxAmt.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t pt-2">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              )}

              <Button
                className="w-full"
                onClick={() => subscribeMutation.mutate()}
                disabled={!selectedPlanId || subscribeMutation.isPending}
                data-testid="button-subscribe"
              >
                {subscribeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  `Subscribe - $${total.toFixed(2)}`
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
