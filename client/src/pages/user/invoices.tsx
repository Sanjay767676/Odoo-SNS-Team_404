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
import { FileText, DollarSign, CreditCard, CheckCircle2, Loader2 } from "lucide-react";
import type { Invoice } from "@shared/schema";

export default function UserInvoices() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const { data: invoices, isLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const myInvoices = invoices?.filter((i) => i.userId === user?.id) || [];

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
                    <Badge
                      className={`text-[11px] shrink-0 no-default-hover-elevate no-default-active-elevate ${statusColors[invoice.status] || statusColors.pending}`}
                    >
                      {invoice.status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedInvoice} onOpenChange={(v) => !v && setSelectedInvoice(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invoice #{selectedInvoice?.id.slice(0, 8)}</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4 mt-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <Badge
                  className={`text-[11px] no-default-hover-elevate no-default-active-elevate ${statusColors[selectedInvoice.status] || statusColors.pending}`}
                >
                  {selectedInvoice.status}
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Due Date</span>
                <span className="font-medium">{selectedInvoice.dueDate}</span>
              </div>
              {selectedInvoice.paidDate && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Paid Date</span>
                  <span className="font-medium">{selectedInvoice.paidDate}</span>
                </div>
              )}

              {((selectedInvoice.lines as any[]) || []).length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Line Items</p>
                  <div className="space-y-1">
                    {((selectedInvoice.lines as any[]) || []).map((line: any, i: number) => (
                      <div key={i} className="flex justify-between text-sm bg-muted/50 rounded-md px-3 py-2">
                        <span>{line.description}</span>
                        <span className="font-medium">${Number(line.amount).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t pt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span>${Number(selectedInvoice.tax || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>${Number(selectedInvoice.amount).toFixed(2)}</span>
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
                      Pay Now
                    </>
                  )}
                </Button>
              )}

              {selectedInvoice.status === "paid" && (
                <div className="flex items-center justify-center gap-2 text-chart-2 bg-chart-2/10 rounded-md py-3">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm font-medium">Paid</span>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
