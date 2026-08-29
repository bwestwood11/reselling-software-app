"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ShoppingBag, Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Button, Input, Label } from "@repo/ui";
import { signUp } from "@repo/auth/client";
import { AuthBrandPanel } from "@/components/auth/brand-panel";

const schema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Enter a valid email address" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
});

type FormValues = z.infer<typeof schema>;

export default function RegisterPage(): import("react").JSX.Element {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const password = watch("password") ?? "";

  async function onSubmit(values: FormValues) {
    setError(null);
    const result = await signUp.email({
      name: values.name,
      email: values.email,
      password: values.password,
    });

    if (result.error) {
      setError(result.error.message ?? "Sign up failed");
      return;
    }

    if (!result.data?.token) {
      // Email verification required — a code was just emailed to them.
      router.push(`/verify-email?email=${encodeURIComponent(values.email)}`);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-white lg:grid lg:grid-cols-2">
      <AuthBrandPanel
        eyebrow="Get started free"
        headline="Start listing in minutes."
        subhead="Add an item once and cross-list it to eBay, Poshmark, Mercari, Depop, Etsy, and Facebook Marketplace — no separate accounts to juggle."
      />

      <div className="flex min-h-screen flex-col justify-center px-6 py-12 sm:px-10 lg:px-16 xl:px-20">
        <div className="mx-auto w-full max-w-sm">
          {/* Compact brand mark — only shown below the split-screen breakpoint */}
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-[0_10px_20px_-12px_rgba(249,115,22,0.7)]">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold text-zinc-900">ReList</span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Create your account</h2>
          <p className="mt-1.5 text-sm text-zinc-500">
            Free to start — no credit card required.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-zinc-700">
                Full name
              </Label>
              <Input
                id="name"
                autoComplete="name"
                placeholder="Jane Doe"
                className="h-11 rounded-xl border-zinc-200 focus-visible:border-orange-500 focus-visible:ring-orange-500/20"
                {...register("name")}
              />
              {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-zinc-700">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className="h-11 rounded-xl border-zinc-200 focus-visible:border-orange-500 focus-visible:ring-orange-500/20"
                {...register("email")}
              />
              {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-zinc-700">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
                  className="h-11 rounded-xl border-zinc-200 pr-10 focus-visible:border-orange-500 focus-visible:ring-orange-500/20"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-zinc-400 hover:text-zinc-600"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {password.length > 0 && <PasswordStrength password={password} />}
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-11 w-full rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-sm font-semibold text-white shadow-[0_14px_24px_-12px_rgba(249,115,22,0.6)] transition-opacity hover:opacity-90"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create account
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-zinc-500">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-orange-600 hover:text-orange-700">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function PasswordStrength({ password }: { password: string }): import("react").JSX.Element {
  const hasLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const score = [hasLength, hasNumber, hasSpecial].filter(Boolean).length;

  const barColor =
    score === 0 ? "bg-zinc-200" : score === 1 ? "bg-red-400" : score === 2 ? "bg-amber-400" : "bg-emerald-500";
  const label = score === 0 ? "" : score === 1 ? "Weak" : score === 2 ? "Fair" : "Strong";
  const labelColor = score === 1 ? "text-red-500" : score === 2 ? "text-amber-500" : "text-emerald-600";

  return (
    <div className="flex items-center gap-2 pt-1">
      <div className="flex flex-1 gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${i < score ? barColor : "bg-zinc-200"}`}
          />
        ))}
      </div>
      {label && <span className={`text-[11px] font-medium ${labelColor}`}>{label}</span>}
    </div>
  );
}
