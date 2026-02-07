import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Layers, Calendar, User, Package } from "lucide-react";
import { useState } from "react";
import type { Subscription, Product, User as UserType, Plan } from "@shared/schema";

export default function AdminSubscriptions() {
    const [search, setSearch] = useState("");

    const { data: subscriptions, isLoading: loadingSubs } = useQuery<Subscription[]>({
        queryKey: ["/api/subscriptions"],
    });

    const { data: products } = useQuery<Product[]>({
        queryKey: ["/api/products"],
    });

    const { data: plans } = useQuery<Plan[]>({
        queryKey: ["/api/plans"],
    });

    const { data: users } = useQuery<UserType[]>({
        queryKey: ["/api/users"], // Assuming there's a route to get users or I'll need to add it
    });

    const filteredSubs = subscriptions?.filter((sub) => {
        const product = products?.find((p) => p.id === sub.productId);
        return (
            product?.name.toLowerCase().includes(search.toLowerCase()) ||
            sub.id.toLowerCase().includes(search.toLowerCase())
        );
    }) || [];

    const getStatusColor = (status: string) => {
        switch (status) {
            case "active": return "bg-chart-2/15 text-chart-2 border-chart-2/20";
            case "draft": return "bg-muted text-muted-foreground border-muted-foreground/20";
            case "closed": return "bg-destructive/15 text-destructive border-destructive/20";
            case "quotation": return "bg-chart-4/15 text-chart-4 border-chart-4/20";
            default: return "bg-muted";
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold">Subscriptions</h1>
                    <p className="text-sm text-muted-foreground mt-1">Monitor and manage all customer subscriptions</p>
                </div>
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search subscriptions..."
                        className="pl-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        data-testid="input-search-subs"
                    />
                </div>
            </div>

            {loadingSubs ? (
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-24 w-full" />
                    ))}
                </div>
            ) : filteredSubs.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center py-12">
                        <Layers className="h-12 w-12 text-muted-foreground/40 mb-4" />
                        <h3 className="font-semibold text-lg">No subscriptions found</h3>
                        <p className="text-sm text-muted-foreground">Subscriptions will appear here once users join.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {filteredSubs.map((sub) => {
                        const product = products?.find((p) => p.id === sub.productId);
                        const plan = plans?.find((p) => p.id === sub.planId);
                        return (
                            <Card key={sub.id} className="hover:border-primary/50 transition-colors" data-testid={`card-sub-${sub.id}`}>
                                <CardContent className="p-0">
                                    <div className="flex flex-col sm:flex-row sm:items-center">
                                        <div className="p-4 flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <Badge variant="outline" className={getStatusColor(sub.status)}>
                                                    {sub.status.toUpperCase()}
                                                </Badge>
                                                <span className="text-xs font-mono text-muted-foreground">#{sub.id.slice(0, 8)}</span>
                                            </div>
                                            <h3 className="font-bold text-lg">{product?.name || "Loading product..."}</h3>
                                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                                <div className="flex items-center gap-1.5">
                                                    <Package className="h-3.5 w-3.5" />
                                                    <span>{plan?.name || "Loading plan..."}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    <span>Started {sub.startDate}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="border-t sm:border-t-0 sm:border-l bg-muted/20 p-4 sm:w-48 flex flex-col justify-center text-right">
                                            <p className="text-sm text-muted-foreground mb-1">Total Value</p>
                                            <p className="text-2xl font-bold">${Number(sub.total).toFixed(2)}</p>
                                            <p className="text-[10px] text-muted-foreground mt-1">Includes tax & discounts</p>
                                        </div>
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
