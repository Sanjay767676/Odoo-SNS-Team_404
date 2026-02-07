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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Package, Plus, Trash2, UserPlus, Loader2, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Product, User } from "@shared/schema";

const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  type: z.string().min(1, "Product type is required"),
  salesPrice: z.string().min(1, "Sales price is required"),
  costPrice: z.string().min(1, "Cost price is required"),
  companyName: z.string().optional(),
});

type ProductForm = z.infer<typeof productSchema>;

export default function AdminProducts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [variants, setVariants] = useState<{ attribute: string; value: string; extraPrice: number }[]>([]);
  const [variantForm, setVariantForm] = useState({ attribute: "", value: "", extraPrice: "" });

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: internals } = useQuery<User[]>({
    queryKey: ["/api/users/internals"],
  });

  const myProducts = products?.filter((p) => p.adminId === user?.id) || [];
  const filteredProducts = searchQuery.trim()
    ? myProducts.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.companyName && p.companyName.toLowerCase().includes(searchQuery.toLowerCase())) || p.type.toLowerCase().includes(searchQuery.toLowerCase()))
    : myProducts;

  const form = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: { name: "", type: "", salesPrice: "", costPrice: "", companyName: "" },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ProductForm) => {
      const res = await apiRequest("POST", "/api/products", {
        ...data,
        salesPrice: data.salesPrice,
        costPrice: data.costPrice,
        variants,
        companyName: data.companyName || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Product created", description: "Your product has been created successfully." });
      setCreateOpen(false);
      form.reset();
      setVariants([]);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({ productId, internalId }: { productId: string; internalId: string }) => {
      const res = await apiRequest("PATCH", `/api/products/${productId}/assign`, { internalId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Product assigned", description: "Internal reviewer has been assigned." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const addVariant = () => {
    if (variantForm.attribute && variantForm.value) {
      setVariants([...variants, { ...variantForm, extraPrice: Number(variantForm.extraPrice) || 0 }]);
      setVariantForm({ attribute: "", value: "", extraPrice: "" });
    }
  };

  const removeVariant = (i: number) => {
    setVariants(variants.filter((_, idx) => idx !== i));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your product catalog</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-[220px]"
              data-testid="input-search-products"
            />
          </div>
          <Button variant="secondary" size="icon" data-testid="button-search-admin-submit">
            <Search className="h-4 w-4" />
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-product">
                <Plus className="h-4 w-4 mr-2" />
                Create Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Product</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={form.handleSubmit((data) => createMutation.mutate(data))}
                className="space-y-4 mt-2"
              >
                <div className="space-y-2">
                  <Label>Product Name</Label>
                  <Input placeholder="e.g. Netflix Premium" {...form.register("name")} data-testid="input-product-name" />
                  {form.formState.errors.name && (
                    <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Input placeholder="e.g. Streaming" {...form.register("type")} data-testid="input-product-type" />
                  </div>
                  <div className="space-y-2">
                    <Label>Company Name</Label>
                    <Input placeholder="e.g. Netflix Inc." {...form.register("companyName")} data-testid="input-company-name" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Sales Price ($)</Label>
                    <Input type="number" step="0.01" placeholder="0.00" {...form.register("salesPrice")} data-testid="input-sales-price" />
                  </div>
                  <div className="space-y-2">
                    <Label>Cost Price ($)</Label>
                    <Input type="number" step="0.01" placeholder="0.00" {...form.register("costPrice")} data-testid="input-cost-price" />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Variants</Label>
                  <div className="flex gap-2 flex-wrap">
                    <Input
                      placeholder="Attribute"
                      className="flex-1 min-w-[100px]"
                      value={variantForm.attribute}
                      onChange={(e) => setVariantForm({ ...variantForm, attribute: e.target.value })}
                      data-testid="input-variant-attribute"
                    />
                    <Input
                      placeholder="Value"
                      className="flex-1 min-w-[100px]"
                      value={variantForm.value}
                      onChange={(e) => setVariantForm({ ...variantForm, value: e.target.value })}
                      data-testid="input-variant-value"
                    />
                    <Input
                      type="number"
                      placeholder="Extra $"
                      className="w-24"
                      value={variantForm.extraPrice}
                      onChange={(e) => setVariantForm({ ...variantForm, extraPrice: e.target.value })}
                      data-testid="input-variant-price"
                    />
                    <Button type="button" size="icon" variant="outline" onClick={addVariant} data-testid="button-add-variant">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {variants.length > 0 && (
                    <div className="space-y-1">
                      {variants.map((v, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm bg-muted/50 rounded-md px-3 py-2">
                          <span className="font-medium">{v.attribute}:</span>
                          <span>{v.value}</span>
                          {v.extraPrice > 0 && <span className="text-muted-foreground">(+${v.extraPrice})</span>}
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="ml-auto h-6 w-6"
                            onClick={() => removeVariant(i)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-product">
                  {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Product"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-5 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : myProducts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Package className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="font-semibold text-lg mb-1">No products yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Create your first product to get started.</p>
            <Button onClick={() => setCreateOpen(true)} data-testid="button-create-first-product">
              <Plus className="h-4 w-4 mr-2" /> Create Product
            </Button>
          </CardContent>
        </Card>
      ) : filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Search className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="font-semibold text-lg mb-1">No matching products</h3>
            <p className="text-sm text-muted-foreground">Try a different search term.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              internals={internals || []}
              onAssign={(internalId) => assignMutation.mutate({ productId: product.id, internalId })}
              isAssigning={assignMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductCard({
  product,
  internals,
  onAssign,
  isAssigning,
}: {
  product: Product;
  internals: User[];
  onAssign: (internalId: string) => void;
  isAssigning: boolean;
}) {
  const statusColors: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    pending_internal: "bg-chart-4/15 text-chart-4",
    published: "bg-chart-2/15 text-chart-2",
  };

  const assignedInternal = internals.find((i) => i.id === product.assignedInternalId);
  const variantsList = (product.variants as any[]) || [];

  return (
    <Card className="hover-elevate" data-testid={`card-product-${product.id}`}>
      <CardHeader className="pb-3 flex flex-row items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold truncate" data-testid={`text-product-name-${product.id}`}>{product.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{product.companyName || product.type}</p>
        </div>
        <Badge
          className={`text-[11px] shrink-0 no-default-hover-elevate no-default-active-elevate ${statusColors[product.status] || statusColors.draft}`}
        >
          {product.status.replace("_", " ")}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Sales Price</span>
          <span className="font-medium">${Number(product.salesPrice).toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Cost Price</span>
          <span className="font-medium">${Number(product.costPrice).toFixed(2)}</span>
        </div>

        {variantsList.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {variantsList.map((v: any, i: number) => (
              <Badge key={i} variant="secondary" className="text-[10px]">
                {v.attribute}: {v.value}
              </Badge>
            ))}
          </div>
        )}

        {product.status === "draft" && (
          <Select onValueChange={(val) => onAssign(val)}>
            <SelectTrigger data-testid={`select-assign-${product.id}`}>
              <div className="flex items-center gap-2">
                <UserPlus className="h-3.5 w-3.5" />
                <SelectValue placeholder="Assign to internal" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {internals.length === 0 ? (
                <SelectItem value="none" disabled>No internal reviewers found</SelectItem>
              ) : (
                internals.map((internal) => (
                  <SelectItem key={internal.id} value={internal.id}>
                    {internal.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        )}

        {product.status === "pending_internal" && assignedInternal && (
          <div className="flex items-center gap-2 text-sm bg-chart-4/10 text-chart-4 rounded-md px-3 py-2">
            <UserPlus className="h-3.5 w-3.5" />
            <span>Assigned to {assignedInternal.name}</span>
          </div>
        )}

        {product.status === "published" && (
          <div className="flex items-center gap-2 text-sm bg-chart-2/10 text-chart-2 rounded-md px-3 py-2">
            <Package className="h-3.5 w-3.5" />
            <span>Live on marketplace</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
