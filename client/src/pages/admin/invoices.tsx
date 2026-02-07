import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    FileText, CheckCircle2, XCircle, Send, Printer,
    MoreVertical, Search, Filter, ArrowRight
} from "lucide-react";
import { useState } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Invoice, User as UserType } from "@shared/schema";

export default function AdminInvoices() {
    const { toast } = useToast();
    const [search, setSearch] = useState("");

    const { data: invoices, isLoading: loadingInvoices } = useQuery<Invoice[]>({
        queryKey: ["/api/invoices"],
    });

    const { data: users } = useQuery<UserType[]>({
        queryKey: ["/api/users"],
    });

    const mutation = useMutation({
        mutationFn: async ({ id, action }: { id: string, action: string }) => {
            const res = await apiRequest("PATCH", `/api/invoices/${id}/${action}`);
            return res.json();
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
            toast({ title: "Updated", description: `Invoice marked as ${variables.action}.` });
        },
        onError: (err: Error) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        },
    });

    const statusColors: Record<string, string> = {
        paid: "bg-chart-2/15 text-chart-2 border-chart-2/20",
        pending: "bg-chart-4/15 text-chart-4 border-chart-4/20",
        overdue: "bg-destructive/15 text-destructive border-destructive/20",
        confirmed: "bg-primary/15 text-primary border-primary/20",
        cancelled: "bg-muted text-muted-foreground border-muted-foreground/20",
        sent: "bg-blue-500/15 text-blue-500 border-blue-500/20",
    };

    const filteredInvoices = invoices?.filter((inv) =>
        inv.id.toLowerCase().includes(search.toLowerCase())
    ).sort((a, b) => b.dueDate.localeCompare(a.dueDate)) || [];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold">Manage Invoices</h1>
                    <p className="text-sm text-muted-foreground mt-1">Lifecycle control for all tenant invoices</p>
                </div>
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by ID..."
                        className="pl-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        data-testid="input-search-invoices"
                    />
                </div>
            </div>

            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 border-b">
                                <tr>
                                    <th className="text-left p-4 font-medium text-muted-foreground">Invoice #</th>
                                    <th className="text-left p-4 font-medium text-muted-foreground">Customer</th>
                                    <th className="text-left p-4 font-medium text-muted-foreground">Due Date</th>
                                    <th className="text-right p-4 font-medium text-muted-foreground">Amount</th>
                                    <th className="text-center p-4 font-medium text-muted-foreground">Status</th>
                                    <th className="text-right p-4 font-medium text-muted-foreground">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {loadingInvoices ? (
                                    [1, 2, 3].map((i) => (
                                        <tr key={i}>
                                            {Array(6).fill(0).map((_, j) => (
                                                <td key={j} className="p-4"><Skeleton className="h-4 w-full" /></td>
                                            ))}
                                        </tr>
                                    ))
                                ) : filteredInvoices.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-12 text-center text-muted-foreground">
                                            <FileText className="h-10 w-10 mx-auto mb-4 opacity-20" />
                                            No invoices found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredInvoices.map((inv) => {
                                        const user = users?.find(u => u.id === inv.userId);
                                        return (
                                            <tr key={inv.id} className="hover:bg-muted/30 transition-colors" data-testid={`row-invoice-${inv.id}`}>
                                                <td className="p-4 font-mono text-xs">#{inv.id.slice(0, 8)}</td>
                                                <td className="p-4 font-medium">{user?.name || "Loading..."}</td>
                                                <td className="p-4 text-muted-foreground">{inv.dueDate}</td>
                                                <td className="p-4 text-right font-bold">${Number(inv.amount).toFixed(2)}</td>
                                                <td className="p-4">
                                                    <div className="flex justify-center">
                                                        <Badge variant="outline" className={statusColors[inv.status] || "bg-muted"}>
                                                            {inv.status}
                                                        </Badge>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" data-testid={`button-actions-${inv.id}`}>
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => mutation.mutate({ id: inv.id, action: "confirm" })} className="gap-2">
                                                                <CheckCircle2 className="h-4 w-4 text-chart-2" /> Confirm
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => mutation.mutate({ id: inv.id, action: "send" })} className="gap-2">
                                                                <Send className="h-4 w-4 text-blue-500" /> Send
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => mutation.mutate({ id: inv.id, action: "print" })} className="gap-2">
                                                                <Printer className="h-4 w-4 text-muted-foreground" /> Print
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => mutation.mutate({ id: inv.id, action: "cancel" })} className="gap-2 text-destructive">
                                                                <XCircle className="h-4 w-4" /> Cancel
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// Re-using the same Input for search from UI library
function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
            {...props}
        />
    );
}
