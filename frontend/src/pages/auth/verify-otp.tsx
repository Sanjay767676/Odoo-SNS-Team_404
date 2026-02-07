import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Loader2, ShieldCheck } from "lucide-react";

export default function VerifyOTP() {
    const { verifyOtp } = useAuth();
    const [, setLocation] = useLocation();
    const search = useSearch();
    const { toast } = useToast();
    const [otp, setOtp] = useState("");
    const [isVerifying, setIsVerifying] = useState(false);

    const userId = new URLSearchParams(search).get("userId");
    const type = new URLSearchParams(search).get("type"); // signup or reset

    if (!userId) {
        setLocation("/auth");
        return null;
    }

    const handleVerify = async () => {
        if (otp.length !== 6) return;
        setIsVerifying(true);
        try {
            await verifyOtp(userId, otp);
            toast({ title: "Email verified!", description: "Successfully verified." });

            if (type === "reset") {
                setLocation(`/reset-password?userId=${userId}&otp=${otp}`);
            } else {
                setLocation("/");
            }
        } catch (err: any) {
            // Handled by global toast in queryClient
        } finally {
            setIsVerifying(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
            <Card className="w-full max-w-md shadow-lg border-2">
                <CardHeader className="space-y-1 pt-8 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 rounded-full bg-primary/10">
                            <ShieldCheck className="h-10 w-10 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold">Verify Your Email</CardTitle>
                    <CardDescription>
                        Enter the 6-digit code sent to your email address.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pb-10 flex flex-col items-center">
                    <div className="space-y-6 w-full flex flex-col items-center">
                        <InputOTP
                            maxLength={6}
                            value={otp}
                            onChange={(value) => setOtp(value)}
                            onComplete={handleVerify}
                        >
                            <InputOTPGroup>
                                <InputOTPSlot index={0} />
                                <InputOTPSlot index={1} />
                                <InputOTPSlot index={2} />
                            </InputOTPGroup>
                            <InputOTPGroup>
                                <InputOTPSlot index={3} />
                                <InputOTPSlot index={4} />
                                <InputOTPSlot index={5} />
                            </InputOTPGroup>
                        </InputOTP>

                        <Button
                            className="w-full"
                            disabled={otp.length !== 6 || isVerifying}
                            onClick={handleVerify}
                        >
                            {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify OTP"}
                        </Button>

                        <p className="text-sm text-center text-muted-foreground">
                            Didn't receive a code?{" "}
                            <button
                                className="text-primary hover:underline font-medium"
                                onClick={() => toast({ title: "Coming soon", description: "Resend OTP feature coming soon." })}
                            >
                                Resend
                            </button>
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
