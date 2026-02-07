import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation, useSearch } from "wouter";
import { Loader2, KeyRound, CheckCircle2 } from "lucide-react";

const resetSchema = z.object({
    password: z.string().min(8, "Password must be at least 8 characters")
        .regex(/[A-Z]/, "Must contain uppercase letter")
        .regex(/[a-z]/, "Must contain lowercase letter")
        .regex(/[^A-Za-z0-9]/, "Must contain special character"),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

type ResetForm = z.infer<typeof resetSchema>;

export default function ResetPassword() {
    const { toast } = useToast();
    const [, setLocation] = useLocation();
    const search = useSearch();
    const token = new URLSearchParams(search).get("token");

    const form = useForm<ResetForm>({
        resolver: zodResolver(resetSchema),
        defaultValues: { password: "", confirmPassword: "" },
    });

    const mutation = useMutation({
        mutationFn: async (data: ResetForm) => {
            const res = await apiRequest("POST", "/api/auth/reset-password", {
                token,
                password: data.password,
            });
            return res.json();
        },
        onSuccess: () => {
            toast({ title: "Success", description: "Your password has been reset successfully." });
            setTimeout(() => setLocation("/auth"), 2000);
        },
        onError: (err: Error) => {
            // Handled by global toast in queryClient
        },
    });

    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
                <Card className="w-full max-w-sm border-destructive/20 shadow-lg">
                    <CardContent className="pt-8 pb-8 text-center text-destructive">
                        <p className="font-semibold px-4">Invalid or missing reset token. Please request a new link.</p>
                        <Button asChild variant="outline" className="mt-4 border-destructive/20 text-destructive hover:bg-destructive/5" onClick={() => setLocation("/auth/forgot-password")}>
                            <span>Request New Link</span>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (mutation.isSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
                <Card className="w-full max-w-md shadow-lg border-2">
                    <CardContent className="pt-10 pb-10 flex flex-col items-center text-center">
                        <div className="p-3 rounded-full bg-chart-2/10 mb-5">
                            <CheckCircle2 className="h-10 w-10 text-chart-2" />
                        </div>
                        <CardTitle className="text-2xl font-bold mb-2">Password Reset!</CardTitle>
                        <CardDescription className="text-sm">
                            Your password has been successfully updated. Redirecting to login...
                        </CardDescription>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
            <Card className="w-full max-w-md shadow-lg border-2">
                <CardHeader className="space-y-1 pt-8">
                    <div className="flex justify-center mb-4">
                        <div className="p-2 rounded-md bg-primary/10">
                            <KeyRound className="h-6 w-6 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold text-center">Reset Password</CardTitle>
                    <CardDescription className="text-center text-sm">
                        Please enter your new password below.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pb-8">
                    <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">New Password</Label>
                            <Input
                                id="password"
                                type="password"
                                {...form.register("password")}
                                data-testid="input-reset-password"
                            />
                            {form.formState.errors.password && (
                                <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm Password</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                {...form.register("confirmPassword")}
                                data-testid="input-reset-confirm"
                            />
                            {form.formState.errors.confirmPassword && (
                                <p className="text-xs text-destructive">{form.formState.errors.confirmPassword.message}</p>
                            )}
                        </div>
                        <Button type="submit" className="w-full" disabled={mutation.isPending} data-testid="button-reset-submit">
                            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reset Password"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
