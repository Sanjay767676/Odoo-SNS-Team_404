import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { FileText, DollarSign, CreditCard, CheckCircle2, Loader2, AlertTriangle, Printer, Building2 } from "lucide-react";
import type { Invoice, Subscription, Product, Plan } from "@shared/schema";

export default function UserInvoices() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const { data: invoices, isLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const { data: subscriptions } = useQuery<Subscription[]>({
    queryKey: ["/api/subscriptions"],
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: allPlans } = useQuery<Plan[]>({
    queryKey: ["/api/plans"],
  });

  const myInvoices = invoices?.filter((i) => i.userId === user?.id) || [];

  const isOverdue = (invoice: Invoice) => {
    if (invoice.status === "paid") return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(invoice.dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today;
  };

  const getSubscription = (id: string) => subscriptions?.find((s) => s.id === id);
  const getProduct = (id: string) => products?.find((p) => p.id === id);
  const getPlan = (id: string) => allPlans?.find((p) => p.id === id);

  const payMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const res = await apiRequest("PATCH", `/api/invoices/${invoiceId}/pay`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Payment successful!", description: "Invoice has been marked as paid." });
      setSelectedInvoice(null);
    },
    onError: (err: Error) => {
      toast({ title: "Payment failed", description: err.message, variant: "destructive" });
    },
  });

  const statusColors: Record<string, string> = {
    paid: "bg-chart-2/15 text-chart-2",
    pending: "bg-chart-4/15 text-chart-4",
    overdue: "bg-destructive/15 text-destructive",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Invoices</h1>
        <p className="text-sm text-muted-foreground mt-1">View and pay your invoices</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : myInvoices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="font-semibold text-lg mb-1">No invoices yet</h3>
            <p className="text-sm text-muted-foreground">Invoices will appear once you subscribe.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {myInvoices.map((invoice) => (
            <Card
              key={invoice.id}
              className="hover-elevate cursor-pointer"
              onClick={() => setSelectedInvoice(invoice)}
              data-testid={`card-invoice-${invoice.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-md bg-primary/10 shrink-0">
                      <DollarSign className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">Invoice #{invoice.id.slice(0, 8)}</p>
                      <p className="text-xs text-muted-foreground">Due: {invoice.dueDate}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">${Number(invoice.amount).toFixed(2)}</span>
                    {isOverdue(invoice) ? (
                      <Badge
                        className="text-[11px] shrink-0 no-default-hover-elevate no-default-active-elevate bg-destructive/15 text-destructive"
                        data-testid={`badge-overdue-${invoice.id}`}
                      >
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Overdue
                      </Badge>
                    ) : (
                      <Badge
                        className={`text-[11px] shrink-0 no-default-hover-elevate no-default-active-elevate ${statusColors[invoice.status] || statusColors.pending}`}
                      >
                        {invoice.status}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedInvoice} onOpenChange={(v) => !v && setSelectedInvoice(null)}>
        <DialogContent className="max-w-lg p-0 overflow-hidden" data-testid="dialog-invoice-detail">
          <DialogHeader className="sr-only">
            <DialogTitle>Invoice #{selectedInvoice?.id.slice(0, 8)}</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (() => {
            const sub = getSubscription(selectedInvoice.subscriptionId);
            const product = sub ? getProduct(sub.productId) : null;
            const plan = sub ? getPlan(sub.planId) : null;
            const invoiceOverdue = isOverdue(selectedInvoice);
            const lines = (selectedInvoice.lines as any[]) || [];
            const subtotalFromLines = lines.reduce((acc: number, l: any) => acc + Number(l.amount || 0), 0);

            return (
              <div className="bg-background">
                <div className="bg-primary/5 dark:bg-primary/10 px-6 py-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Invoice</p>
                      <p className="text-lg font-bold mt-0.5" data-testid="text-invoice-id">#{selectedInvoice.id.slice(0, 8)}</p>
                    </div>
                    <div className="text-right">
                      {invoiceOverdue ? (
                        <Badge className="no-default-hover-elevate no-default-active-elevate bg-destructive/15 text-destructive" data-testid="badge-invoice-status">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Overdue
                        </Badge>
                      ) : (
                        <Badge className={`no-default-hover-elevate no-default-active-elevate ${statusColors[selectedInvoice.status] || statusColors.pending}`} data-testid="badge-invoice-status">
                          {selectedInvoice.status === "paid" ? <CheckCircle2 className="h-3 w-3 mr-1" /> : null}
                          {selectedInvoice.status}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Separator className="my-4" />
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div data-testid="text-billed-to">
                      <p className="text-xs text-muted-foreground mb-0.5">Billed To</p>
                      <p className="font-medium">{user?.name}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                    <div className="text-right" data-testid="text-billed-from">
                      {product?.companyName && (
                        <>
                          <p className="text-xs text-muted-foreground mb-0.5">From</p>
                          <div className="flex items-center gap-1 justify-end">
                            <Building2 className="h-3 w-3 text-muted-foreground" />
                            <p className="font-medium">{product.companyName}</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Due Date</p>
                      <p className="font-medium" data-testid="text-invoice-due-date">{selectedInvoice.dueDate}</p>
                    </div>
                    {selectedInvoice.paidDate && (
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground mb-0.5">Paid Date</p>
                        <p className="font-medium" data-testid="text-invoice-paid-date">{selectedInvoice.paidDate}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="px-6 py-5 space-y-5">
                  {product && (
                    <div className="text-sm">
                      <p className="text-xs text-muted-foreground mb-1">Product</p>
                      <p className="font-medium">{product.name}{plan ? ` - ${plan.name}` : ""}</p>
                    </div>
                  )}

                  <div data-testid="table-invoice-lines">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 text-xs text-muted-foreground font-medium uppercase tracking-wider">Description</th>
                          <th className="text-right py-2 text-xs text-muted-foreground font-medium uppercase tracking-wider">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lines.length > 0 ? lines.map((line: any, i: number) => (
                          <tr key={i} className="border-b border-dashed last:border-0">
                            <td className="py-2.5">{line.description}</td>
                            <td className="py-2.5 text-right font-medium">${Number(line.amount).toFixed(2)}</td>
                          </tr>
                        )) : (
                          <tr className="border-b border-dashed">
                            <td className="py-2.5">Subscription charge</td>
                            <td className="py-2.5 text-right font-medium">${Number(selectedInvoice.amount).toFixed(2)}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-muted/40 rounded-md p-4 space-y-2" data-testid="invoice-totals">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>${(lines.length > 0 ? subtotalFromLines : Number(selectedInvoice.amount)).toFixed(2)}</span>
                    </div>
                    {Number(selectedInvoice.discountAmount || 0) > 0 && (
                      <div className="flex justify-between text-sm text-chart-2" data-testid="text-invoice-discount">
                        <span>{selectedInvoice.discountLabel || "Discount"}</span>
                        <span>-${Number(selectedInvoice.discountAmount).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax ({selectedInvoice.taxPercent || "18"}%)</span>
                      <span>${Number(selectedInvoice.tax || 0).toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-base">
                      <span>Total Due</span>
                      <span data-testid="text-invoice-total">${Number(selectedInvoice.amount).toFixed(2)}</span>
                    </div>
                  </div>

                  {selectedInvoice.status !== "paid" && (
                    <Button
                      className="w-full"
                      onClick={() => payMutation.mutate(selectedInvoice.id)}
                      disabled={payMutation.isPending}
                      data-testid="button-pay-invoice"
                    >
                      {payMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4 mr-2" />
                          Pay ${Number(selectedInvoice.amount).toFixed(2)}
                        </>
                      )}
                    </Button>
                  )}

                  {selectedInvoice.status === "paid" && (
                    <div className="flex items-center justify-center gap-2 text-chart-2 bg-chart-2/10 rounded-md py-3">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-sm font-medium">Payment Complete</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
