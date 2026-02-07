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
import { ShoppingBag, Layers, Loader2, CheckCircle2, Building2 } from "lucide-react";
import type { Product, Plan } from "@shared/schema";

export default function UserBrowse() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [subscribed, setSubscribed] = useState(false);

  const { data: products, isLoading: loadingProducts } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: plans } = useQuery<Plan[]>({
    queryKey: ["/api/plans"],
  });

  const publishedProducts = products?.filter((p) => p.status === "published") || [];

  const getProductPlans = (productId: string) =>
    plans?.filter((p) => p.productId === productId) || [];

  const subscribeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/subscriptions", {
        productId: selectedProduct?.id,
        planId: selectedPlanId,
        quantity: Number(quantity) || 1,
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
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Browse Products</h1>
        <p className="text-sm text-muted-foreground mt-1">Discover and subscribe to products</p>
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
                    <div className="p-2.5 rounded-md bg-primary/10 shrink-0">
                      <Layers className="h-5 w-5 text-primary" />
                    </div>
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

              <Button
                className="w-full"
                onClick={() => subscribeMutation.mutate()}
                disabled={!selectedPlanId || subscribeMutation.isPending}
                data-testid="button-subscribe"
              >
                {subscribeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Subscribe"
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
