import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCard, Search, Calendar, DollarSign, ArrowUpRight } from "lucide-react";
import { useState } from "react";
import type { Payment, Invoice } from "@shared/schema";

export default function AdminPayments() {
    const [search, setSearch] = useState("");

    const { data: payments, isLoading: loadingPayments } = useQuery<Payment[]>({
        queryKey: ["/api/payments"],
    });

    const { data: invoices } = useQuery<Invoice[]>({
        queryKey: ["/api/invoices"],
    });

    const filteredPayments = payments?.filter((p) =>
        p.invoiceId.toLowerCase().includes(search.toLowerCase()) ||
        p.method.toLowerCase().includes(search.toLowerCase())
    ).sort((a, b) => b.date.localeCompare(a.date)) || [];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold">Payment Ledger</h1>
                    <p className="text-sm text-muted-foreground mt-1">Full history of received payments</p>
                </div>
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by Invoice ID or Method..."
                        className="pl-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        data-testid="input-search-payments"
                    />
                </div>
            </div>

            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 border-b text-muted-foreground">
                                <tr>
                                    <th className="p-4 font-medium uppercase text-[11px] tracking-wider">Date</th>
                                    <th className="p-4 font-medium uppercase text-[11px] tracking-wider">Invoice #</th>
                                    <th className="p-4 font-medium uppercase text-[11px] tracking-wider">Method</th>
                                    <th className="p-4 font-medium uppercase text-[11px] tracking-wider text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {loadingPayments ? (
                                    [1, 2, 3].map((i) => (
                                        <tr key={i}>
                                            {Array(4).fill(0).map((_, j) => (
                                                <td key={j} className="p-4"><Skeleton className="h-4 w-full" /></td>
                                            ))}
                                        </tr>
                                    ))
                                ) : filteredPayments.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="p-16 text-center text-muted-foreground italic">
                                            No payments recorded yet.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredPayments.map((p) => (
                                        <tr key={p.id} className="hover:bg-muted/30 transition-colors" data-testid={`row-payment-${p.id}`}>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                                    {p.date}
                                                </div>
                                            </td>
                                            <td className="p-4 font-mono text-xs">#{p.invoiceId.slice(0, 8)}</td>
                                            <td className="p-4">
                                                <Badge variant="secondary" className="capitalize text-[11px] font-medium">
                                                    {p.method}
                                                </Badge>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5 font-bold text-chart-2">
                                                    <DollarSign className="h-3.5 w-3.5" />
                                                    {Number(p.amount).toFixed(2)}
                                                    <ArrowUpRight className="h-3.5 w-3.5 opacity-40" />
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
            {...props}
        />
    );
}
