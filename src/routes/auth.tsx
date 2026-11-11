import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/app/Logo";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { mode?: "login" | "register" } =>
    s["mode"] === "register" ? { mode: "register" } : {},
  head: () => ({
    meta: [
      { title: "Sign in — Stock Management System" },
      { name: "description", content: "Sign in or create an account to manage your inventory." },
      { property: "og:title", content: "Sign in — Stock Management System" },
      { property: "og:description", content: "Sign in or create an account to manage your inventory." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const passwordRule = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password needs an uppercase letter")
  .regex(/[a-z]/, "Password needs a lowercase letter")
  .regex(/[0-9]/, "Password needs a number");

const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name").max(100),
    email: z.string().trim().email("Enter a valid email").max(255),
    password: passwordRule,
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { message: "Passwords do not match", path: ["confirm"] });

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">(search.mode ?? "login");
  const [form, setForm] = useState({ fullName: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    setNotice(null);
    const parsed = (mode === "login" ? loginSchema : registerSchema).safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => (errs[String(i.path[0])] ??= i.message));
      setErrors(errs);
      return;
    }
    setLoading(true);
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password });
      setLoading(false);
      if (error) { toast.error(error.message === "Invalid login credentials" ? "Incorrect email or password" : error.message); return; }
      toast.success("Welcome back!");
      navigate({ to: "/dashboard" });
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: { emailRedirectTo: `${window.location.origin}/dashboard`, data: { full_name: form.fullName.trim() } },
      });
      setLoading(false);
      if (error) { toast.error(error.message); return; }
      if (data.session) {
        toast.success("Account created!");
        navigate({ to: "/dashboard" });
      } else {
        setNotice(`Account created. Check ${form.email} for a confirmation link, then sign in.`);
        toast.success("Registration successful — please confirm your email");
        setMode("login");
      }
    }
  }

  const field = (k: keyof typeof form, label: string, type = "text", ph = "") => (
    <div className="space-y-1.5">
      <Label htmlFor={k}>{label}</Label>
      <Input id={k} type={type} placeholder={ph} value={form[k]} onChange={set(k)} aria-invalid={!!errors[k]} />
      {errors[k] && <p className="text-xs font-medium text-destructive">{errors[k]}</p>}
    </div>
  );

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-gradient-hero p-12 text-primary-foreground lg:flex">
        <Logo light />
        <div>
          <h2 className="text-4xl font-bold leading-tight">Every item, every movement, accounted for.</h2>
          <p className="mt-4 max-w-md text-primary-foreground/75">Stock-in, stock-out and orders update your quantities automatically.</p>
        </div>
        <p className="text-xs text-primary-foreground/60">© {new Date().getFullYear()} Stock Management System</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <Logo className="mb-8 lg:hidden" />
          <h1 className="text-2xl font-bold">{mode === "login" ? "Sign in" : "Create your account"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "login" ? "Enter your details to open your dashboard." : "Start managing your inventory in minutes."}
          </p>
          {notice && <div className="mt-4 rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-success">{notice}</div>}
          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            {mode === "register" && field("fullName", "Full name", "text", "Jane Doe")}
            {field("email", "Email", "email", "you@example.com")}
            {field("password", "Password", "password", "••••••••")}
            {mode === "register" && (
              <>
                {field("confirm", "Confirm password", "password", "••••••••")}
                <p className="text-xs text-muted-foreground">At least 8 characters with uppercase, lowercase and a number.</p>
              </>
            )}
            <Button type="submit" variant="hero" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "login" ? "Sign in" : "Create account"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "login" ? "New here?" : "Already have an account?"}{" "}
            <button type="button" className="font-semibold text-primary hover:underline" onClick={() => { setMode(mode === "login" ? "register" : "login"); setErrors({}); }}>
              {mode === "login" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
