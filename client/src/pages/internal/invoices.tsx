import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, DollarSign } from "lucide-react";
import type { Invoice } from "@shared/schema";

export default function InternalInvoices() {
  const { data: invoices, isLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const statusColors: Record<string, string> = {
    paid: "bg-chart-2/15 text-chart-2",
    pending: "bg-chart-4/15 text-chart-4",
    overdue: "bg-destructive/15 text-destructive",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Invoices & Payments</h1>
        <p className="text-sm text-muted-foreground mt-1">Track invoices for published subscriptions</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : !invoices || invoices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="font-semibold text-lg mb-1">No invoices yet</h3>
            <p className="text-sm text-muted-foreground">
              Invoices will appear here once subscribers start paying.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <h2 className="font-semibold">All Invoices</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between gap-4 p-3 rounded-md bg-muted/50"
                  data-testid={`invoice-row-${invoice.id}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-md bg-primary/10">
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
                      className={`text-[11px] no-default-hover-elevate no-default-active-elevate ${statusColors[invoice.status] || statusColors.pending}`}
                    >
                      {invoice.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
