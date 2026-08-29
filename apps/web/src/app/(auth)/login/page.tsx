"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ShoppingBag, Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Button, Input, Label } from "@repo/ui";
import { signIn } from "@repo/auth/client";
import { AuthBrandPanel } from "@/components/auth/brand-panel";

const schema = z.object({
  email: z.string().email({ message: "Enter a valid email address" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage(): import("react").JSX.Element {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setError(null);
    const result = await signIn.email({
      email: values.email,
      password: values.password,
    });

    if (result.error) {
      if (result.error.code === "EMAIL_NOT_VERIFIED") {
        // A fresh code was just emailed (emailVerification.sendOnSignIn).
        router.push(`/verify-email?email=${encodeURIComponent(values.email)}`);
        return;
      }
      setError(result.error.message ?? "That email and password don't match.");
      return;
    }

    router.push("/dashboard");
  }

  async function onGoogleSignIn() {
    setError(null);

    const webOrigin =
      typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

    const result = await signIn.social({
      provider: "google",
      callbackURL: `${webOrigin}/dashboard`,
      errorCallbackURL: `${webOrigin}/login`,
    });

    if (result.error) {
      setError(result.error.message ?? "Google sign in failed");
    }
  }

  return (
    <div className="min-h-screen bg-white lg:grid lg:grid-cols-2">
      <AuthBrandPanel
        eyebrow="Seller workspace"
        headline="List once. Sell everywhere."
        subhead="Sign in to manage inventory and keep every listing in sync across marketplaces — automatically."
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

          <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Welcome back</h2>
          <p className="mt-1.5 text-sm text-zinc-500">
            Sign in to your seller workspace to keep listing.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
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
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-zinc-700">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
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
              Sign in
            </Button>

            <div className="relative flex items-center py-1">
              <div className="h-px flex-1 bg-zinc-200" />
              <span className="px-3 text-xs font-medium text-zinc-400">or</span>
              <div className="h-px flex-1 bg-zinc-200" />
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={onGoogleSignIn}
              disabled={isSubmitting}
              className="h-11 w-full rounded-xl border-zinc-200 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              <GoogleIcon />
              Continue with Google
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-zinc-500">
            New to ReList?{" "}
            <Link href="/register" className="font-medium text-orange-600 hover:text-orange-700">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon(): import("react").JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.26v3.11A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.61H1.26A12 12 0 0 0 0 12c0 1.94.46 3.77 1.26 5.39l4.01-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.26 6.61l4.01 3.11C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}
