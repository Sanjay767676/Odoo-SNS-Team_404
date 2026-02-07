import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Layers, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[a-z]/, "Must contain a lowercase letter")
    .regex(/[^A-Za-z0-9]/, "Must contain a special character"),
  role: z.enum(["admin", "user"]),
});

type LoginForm = z.infer<typeof loginSchema>;
type SignupForm = z.infer<typeof signupSchema>;

export default function LoginPage() {
  const [isSignup, setIsSignup] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, signup } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const signupForm = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "", role: "user" },
  });

  const onLogin = async (data: LoginForm) => {
    setIsSubmitting(true);
    try {
      await login(data.email, data.password);
      toast({ title: "Welcome back!", description: "You've been logged in successfully." });
    } catch (err: any) {
      toast({
        title: "Login failed",
        description: err.message || "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSignup = async (data: SignupForm) => {
    setIsSubmitting(true);
    try {
      await signup(data.name, data.email, data.password, data.role);
      toast({ title: "Account created!", description: "Welcome to SubsManager." });
    } catch (err: any) {
      toast({
        title: "Signup failed",
        description: err.message || "Could not create account",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary">
                <Layers className="h-7 w-7 text-primary-foreground" />
              </div>
            </div>
            <h1 className="text-2xl font-bold" data-testid="text-title">SubsManager</h1>
            <p className="text-sm text-muted-foreground">
              Multi-tenant subscription marketplace
            </p>
          </div>

          <Card>
            <CardHeader className="pb-4">
              <div className="flex gap-1 rounded-md bg-muted p-1">
                <button
                  type="button"
                  onClick={() => setIsSignup(false)}
                  className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${!isSignup ? "bg-background shadow-sm" : "text-muted-foreground"
                    }`}
                  data-testid="button-login-tab"
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => setIsSignup(true)}
                  className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${isSignup ? "bg-background shadow-sm" : "text-muted-foreground"
                    }`}
                  data-testid="button-signup-tab"
                >
                  Sign Up
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {!isSignup ? (
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com"
                      {...loginForm.register("email")}
                      data-testid="input-login-email"
                    />
                    {loginForm.formState.errors.email && (
                      <p className="text-xs text-destructive">{loginForm.formState.errors.email.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter password"
                        {...loginForm.register("password")}
                        data-testid="input-login-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        data-testid="button-toggle-password"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {loginForm.formState.errors.password && (
                      <p className="text-xs text-destructive">{loginForm.formState.errors.password.message}</p>
                    )}
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting} data-testid="button-login-submit">
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Login <ArrowRight className="ml-2 h-4 w-4" /></>}
                  </Button>
                </form>
              ) : (
                <form onSubmit={signupForm.handleSubmit(onSignup)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      placeholder="John Doe"
                      {...signupForm.register("name")}
                      data-testid="input-signup-name"
                    />
                    {signupForm.formState.errors.name && (
                      <p className="text-xs text-destructive">{signupForm.formState.errors.name.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      {...signupForm.register("email")}
                      data-testid="input-signup-email"
                    />
                    {signupForm.formState.errors.email && (
                      <p className="text-xs text-destructive">{signupForm.formState.errors.email.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Min 8 chars, uppercase, special"
                        {...signupForm.register("password")}
                        data-testid="input-signup-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {signupForm.formState.errors.password && (
                      <p className="text-xs text-destructive">{signupForm.formState.errors.password.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-role">Role</Label>
                    <Select
                      defaultValue="user"
                      onValueChange={(val) => signupForm.setValue("role", val as any)}
                    >
                      <SelectTrigger data-testid="select-signup-role">
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Company Admin (Creates new company)</SelectItem>
                        <SelectItem value="user">Individual User / Subscriber</SelectItem>
                      </SelectContent>
                    </Select>
                    {signupForm.formState.errors.role && (
                      <p className="text-xs text-destructive">{signupForm.formState.errors.role.message}</p>
                    )}
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting} data-testid="button-signup-submit">
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Create Account <ArrowRight className="ml-2 h-4 w-4" /></>}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground">
            {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              type="button"
              className="text-primary font-medium"
              onClick={() => setIsSignup(!isSignup)}
              data-testid="button-toggle-auth"
            >
              {isSignup ? "Login" : "Sign up"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
