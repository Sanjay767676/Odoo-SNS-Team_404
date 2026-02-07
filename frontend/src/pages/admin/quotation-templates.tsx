import { useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, FileCheck, Loader2, CalendarDays, Layers, Package } from "lucide-react";
import type { Product, Plan, QuotationTemplate } from "@shared/schema";

const templateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  validityDays: z.string().min(1, "Validity days required"),
});

type TemplateForm = z.infer<typeof templateSchema>;

interface ProductLine {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export default function QuotationTemplates() {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [productLines, setProductLines] = useState<ProductLine[]>([]);
  const [lineProductId, setLineProductId] = useState("");
  const [lineQuantity, setLineQuantity] = useState("1");
  const [linePrice, setLinePrice] = useState("");

  const { data: templates, isLoading: loadingTemplates } = useQuery<QuotationTemplate[]>({
    queryKey: ["/api/quotation-templates"],
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: plans } = useQuery<Plan[]>({
    queryKey: ["/api/plans"],
  });

  const recurringPlans = plans?.filter((p) => {
    const product = products?.find((pr) => pr.id === p.productId);
    return product && (product.status === "published" || product.status === "pending_internal");
  }) || [];

  const form = useForm<TemplateForm>({
    resolver: zodResolver(templateSchema),
    defaultValues: { name: "", validityDays: "30" },
  });

  const createMutation = useMutation({
    mutationFn: async (data: TemplateForm) => {
      const res = await apiRequest("POST", "/api/quotation-templates", {
        name: data.name,
        validityDays: Number(data.validityDays),
        recurringPlanId: selectedPlanId || null,
        productLines,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotation-templates"] });
      toast({ title: "Template created", description: "Quotation template saved successfully." });
      setCreateOpen(false);
      form.reset();
      setSelectedPlanId("");
      setProductLines([]);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/quotation-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotation-templates"] });
      toast({ title: "Deleted", description: "Template removed." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const addProductLine = () => {
    const product = products?.find((p) => p.id === lineProductId);
    if (!product) return;
    const price = linePrice ? Number(linePrice) : Number(product.salesPrice);
    setProductLines((prev) => [
      ...prev,
      {
        productId: product.id,
        productName: product.name,
        quantity: Number(lineQuantity) || 1,
        unitPrice: price,
      },
    ]);
    setLineProductId("");
    setLineQuantity("1");
    setLinePrice("");
  };

  const removeProductLine = (index: number) => {
    setProductLines((prev) => prev.filter((_, i) => i !== index));
  };

  const getLineTotalForTemplate = (lines: any[]) => {
    return (lines || []).reduce((sum: number, l: any) => sum + l.quantity * l.unitPrice, 0);
  };

  const getPlanName = (planId: string | null) => {
    if (!planId) return null;
    const plan = plans?.find((p) => p.id === planId);
    if (!plan) return null;
    const product = products?.find((p) => p.id === plan.productId);
    return `${product?.name || "Product"} - ${plan.name} ($${Number(plan.price).toFixed(2)}/${plan.billingPeriod})`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-quotation-templates-title">Quotation Templates</h1>
          <p className="text-sm text-muted-foreground mt-1">Create reusable quotation templates for your products</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-template">
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Quotation Template</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={form.handleSubmit((data) => createMutation.mutate(data))}
              className="space-y-4 mt-2"
            >
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input placeholder="e.g. Enterprise Quote Q1" {...form.register("name")} data-testid="input-template-name" />
              </div>

              <div className="space-y-2">
                <Label>Validity (Days)</Label>
                <Input type="number" min="1" {...form.register("validityDays")} data-testid="input-validity-days" />
              </div>

              <div className="space-y-2">
                <Label>Recurring Plan (Optional)</Label>
                <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                  <SelectTrigger data-testid="select-recurring-plan">
                    <SelectValue placeholder="Select a recurring plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No recurring plan</SelectItem>
                    {recurringPlans.map((plan) => {
                      const product = products?.find((p) => p.id === plan.productId);
                      return (
                        <SelectItem key={plan.id} value={plan.id}>
                          {product?.name} - {plan.name} (${Number(plan.price).toFixed(2)}/{plan.billingPeriod})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Product Lines</Label>
                {productLines.length > 0 && (
                  <div className="space-y-2">
                    {productLines.map((line, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 bg-muted/50 rounded-md px-3 py-2 text-sm">
                        <div className="min-w-0 flex-1">
                          <span className="font-medium">{line.productName}</span>
                          <span className="text-muted-foreground ml-2">x{line.quantity} @ ${line.unitPrice.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">${(line.quantity * line.unitPrice).toFixed(2)}</span>
                          <Button type="button" size="icon" variant="ghost" onClick={() => removeProductLine(i)} data-testid={`button-remove-line-${i}`}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm font-medium px-3 pt-1">
                      <span>Lines Total</span>
                      <span>${getLineTotalForTemplate(productLines).toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-2 rounded-md border p-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Add Product Line</p>
                  <Select value={lineProductId} onValueChange={(val) => {
                    setLineProductId(val);
                    const p = products?.find((pr) => pr.id === val);
                    if (p) setLinePrice(String(Number(p.salesPrice)));
                  }}>
                    <SelectTrigger data-testid="select-line-product">
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {(products || []).map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} (${Number(p.salesPrice).toFixed(2)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Quantity</Label>
                      <Input type="number" min="1" value={lineQuantity} onChange={(e) => setLineQuantity(e.target.value)} data-testid="input-line-quantity" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Unit Price ($)</Label>
                      <Input type="number" step="0.01" value={linePrice} onChange={(e) => setLinePrice(e.target.value)} data-testid="input-line-price" />
                    </div>
                  </div>
                  <Button type="button" variant="outline" size="sm" className="w-full" onClick={addProductLine} disabled={!lineProductId} data-testid="button-add-line">
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add Line
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-template">
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Template"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loadingTemplates ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="p-5 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !templates || templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <FileCheck className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="font-semibold text-lg mb-1">No quotation templates</h3>
            <p className="text-sm text-muted-foreground">Create your first template to streamline quoting.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {templates.map((template) => (
            <Card key={template.id} data-testid={`card-template-${template.id}`}>
              <CardHeader className="pb-3 flex flex-row items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <FileCheck className="h-4 w-4 text-primary shrink-0" />
                    <h3 className="font-semibold truncate">{template.name}</h3>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                    <div className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      <span>{template.validityDays} days validity</span>
                    </div>
                    <span>Created {template.createdAt}</span>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => deleteMutation.mutate(template.id)}
                  disabled={deleteMutation.isPending}
                  data-testid={`button-delete-template-${template.id}`}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {template.recurringPlanId && (
                  <div className="flex items-center gap-2 text-sm">
                    <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Recurring:</span>
                    <span className="font-medium truncate">{getPlanName(template.recurringPlanId) || "Plan removed"}</span>
                  </div>
                )}

                {((template.productLines as any[]) || []).length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Product Lines</p>
                    {((template.productLines as any[]) || []).map((line: any, i: number) => (
                      <div key={i} className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-1.5 text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <Package className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="truncate">{line.productName}</span>
                          <Badge variant="secondary" className="text-[10px] shrink-0">x{line.quantity}</Badge>
                        </div>
                        <span className="font-medium shrink-0">${(line.quantity * line.unitPrice).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm font-medium px-3 pt-1">
                      <span>Total</span>
                      <span>${getLineTotalForTemplate(template.productLines as any[]).toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
