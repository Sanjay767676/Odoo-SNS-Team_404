import { useAuth } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Settings, User, Building2, Bell, Tag, Plus, Trash2, Loader2, UserPlus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Company, User as UserType, Discount, Tax } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const internalUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type InternalUserForm = z.infer<typeof internalUserSchema>;


const discountCodes = [
  { code: "FIRST10", type: "Percentage", value: "10% off" },
  { code: "SAVE200", type: "Flat", value: "$200 off" },
  { code: "WELCOME15", type: "Percentage", value: "15% off" },
  { code: "FLAT500", type: "Flat", value: "$500 off" },
];

export default function AdminSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: company, isLoading: loadingCompany } = useQuery<Company>({
    queryKey: [user?.companyId ? `/api/companies/${user.companyId}` : null],
    enabled: !!user?.companyId,
  });

  const { data: internals, isLoading: loadingInternals } = useQuery<UserType[]>({
    queryKey: ["/api/users/internals"],
  });

  const { data: discounts } = useQuery<Discount[]>({ queryKey: ["/api/discounts"] });
  const { data: taxes } = useQuery<Tax[]>({ queryKey: ["/api/taxes"] });

  const updateCompanyMutation = useMutation({
    mutationFn: async (data: Partial<Company>) => {
      const res = await apiRequest("PATCH", `/api/companies/${user?.companyId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/companies/${user?.companyId}`] });
      toast({ title: "Updated", description: "Company settings saved successfully." });
    },
  });

  const createInternalMutation = useMutation({
    mutationFn: async (data: InternalUserForm) => {
      const res = await apiRequest("POST", "/api/users/internals", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/internals"] });
      toast({ title: "Success", description: "Internal user created successfully." });
    },
  });

  const internalForm = useForm<InternalUserForm>({
    resolver: zodResolver(internalUserSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  if (loadingCompany || loadingInternals) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-settings-title">
            <Settings className="h-6 w-6" />
            Admin Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your company, internal reviewers, and financial settings.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Company Settings */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5" /> Company Settings
            </CardTitle>
            <CardDescription>Update your company's profile and branding</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">Company Name</Label>
              <Input
                id="company-name"
                defaultValue={company?.name}
                onBlur={(e) => updateCompanyMutation.mutate({ name: e.target.value })}
                data-testid="input-company-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand-color">Primary Brand Color</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="brand-color"
                  type="color"
                  defaultValue={company?.primaryColor || "#6366f1"}
                  onBlur={(e) => updateCompanyMutation.mutate({ primaryColor: e.target.value })}
                  className="w-12 h-10 p-1"
                />
                <Input
                  defaultValue={company?.primaryColor || "#6366f1"}
                  className="flex-1 font-mono text-sm"
                  readOnly
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Management */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <UserPlus className="h-5 w-5" /> Manage Internals
            </CardTitle>
            <CardDescription>Create internal reviewers for product assignment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              onSubmit={internalForm.handleSubmit((data) => {
                createInternalMutation.mutate(data);
                internalForm.reset();
              })}
              className="space-y-3"
            >
              <Input placeholder="Full Name" {...internalForm.register("name")} />
              <Input placeholder="Email" {...internalForm.register("email")} />
              <Input type="password" placeholder="Password" {...internalForm.register("password")} />
              <Button type="submit" className="w-full" disabled={createInternalMutation.isPending}>
                {createInternalMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Internal User"}
              </Button>
            </form>
            <Separator />
            <div className="space-y-2 max-h-[150px] overflow-y-auto">
              {internals?.map((i) => (
                <div key={i.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{i.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{i.email}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">Internal</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Taxes & Discounts */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Tag className="h-5 w-5" /> Financial Settings
            </CardTitle>
            <CardDescription>Manage your taxes and active discount codes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Active Taxes</h3>
                  <Button variant="ghost" size="sm" className="h-7 px-2"><Plus className="h-3.5 w-3.5 mr-1" /> Add</Button>
                </div>
                <div className="space-y-2">
                  {taxes?.map(tax => (
                    <div key={tax.id} className="flex items-center justify-between p-3 rounded-md border bg-card shadow-sm">
                      <span className="text-sm font-medium">{tax.name}</span>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary">{tax.percentage}%</Badge>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Discount Codes</h3>
                  <Button variant="ghost" size="sm" className="h-7 px-2"><Plus className="h-3.5 w-3.5 mr-1" /> Add</Button>
                </div>
                <div className="space-y-2">
                  {discounts?.map(discount => (
                    <div key={discount.id} className="flex items-center justify-between p-3 rounded-md border bg-card shadow-sm">
                      <div>
                        <span className="text-sm font-bold font-mono">{discount.name}</span>
                        <p className="text-[10px] text-muted-foreground uppercase">{discount.type.replace('_', ' ')}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="border-primary/20 text-primary">{discount.type.includes('percent') ? `${discount.value}%` : `$${discount.value}`}</Badge>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

