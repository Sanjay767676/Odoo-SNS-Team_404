import { useState } from "react";
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
import { Link, useLocation } from "wouter";
import { Loader2, ArrowLeft, MailCheck } from "lucide-react";

const forgotSchema = z.object({
    email: z.string().email("Invalid email address"),
});

type ForgotForm = z.infer<typeof forgotSchema>;

export default function ForgotPassword() {
    const { toast } = useToast();
    const [submitted, setSubmitted] = useState(false);
    const [, setLocation] = useLocation();

    const form = useForm<ForgotForm>({
        resolver: zodResolver(forgotSchema),
        defaultValues: { email: "" },
    });

    const mutation = useMutation({
        mutationFn: async (data: ForgotForm) => {
            const res = await apiRequest("POST", "/api/auth/forgot-password", data);
            return res.json();
        },
        onSuccess: (data) => {
            if (data.userId) {
                toast({ title: "OTP Sent!", description: "Please check your email for the reset code." });
                setLocation(`/verify-otp?userId=${data.userId}&type=reset`);
            } else {
                setSubmitted(true);
            }
        },
        onError: (err: Error) => {
            // Handled by global toast in queryClient
        },
    });

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
                <Card className="w-full max-w-md shadow-lg border-2">
                    <CardContent className="pt-10 pb-10 flex flex-col items-center text-center">
                        <div className="p-3 rounded-full bg-primary/10 mb-5">
                            <MailCheck className="h-10 w-10 text-primary" />
                        </div>
                        <CardTitle className="text-2xl font-bold mb-2">Check your email</CardTitle>
                        <CardDescription className="text-sm">
                            We've sent a password reset link to <span className="font-semibold text-foreground">{form.getValues("email")}</span>.
                        </CardDescription>
                        <Button asChild variant="outline" className="mt-8 w-full">
                            <Link href="/auth">
                                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Login
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
            <Card className="w-full max-w-md shadow-lg border-2">
                <CardHeader className="space-y-1 pt-8">
                    <CardTitle className="text-2xl font-bold text-center">Forgot Password</CardTitle>
                    <CardDescription className="text-center text-sm">
                        Enter your email and we'll send you a link to reset your password.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pb-8">
                    <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="m@example.com"
                                {...form.register("email")}
                                data-testid="input-forgot-email"
                            />
                            {form.formState.errors.email && (
                                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                            )}
                        </div>
                        <Button type="submit" className="w-full" disabled={mutation.isPending} data-testid="button-forgot-submit">
                            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Reset Link"}
                        </Button>
                        <div className="text-center mt-4">
                            <Link href="/auth" className="text-sm text-primary hover:underline inline-flex items-center">
                                <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to Login
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
