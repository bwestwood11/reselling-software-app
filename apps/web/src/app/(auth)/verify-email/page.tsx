"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ShoppingBag, Loader2 } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription, Input, Label } from "@repo/ui";
import { emailOtp } from "@repo/auth/client";

function VerifyEmailForm(): import("react").JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setIsSubmitting(true);

    const result = await emailOtp.verifyEmail({ email, otp });

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error.message ?? "Verification failed");
      return;
    }

    router.push("/dashboard");
  }

  async function onResend() {
    setError(null);
    setNotice(null);
    setIsResending(true);

    const result = await emailOtp.sendVerificationOtp({ email, type: "email-verification" });

    setIsResending(false);

    if (result.error) {
      setError(result.error.message ?? "Could not resend code");
      return;
    }

    setNotice("A new code has been sent to your email.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-2 flex items-center gap-2 text-2xl font-bold text-blue-600">
            <ShoppingBag className="h-7 w-7" />
            ReList
          </div>
          <p className="text-sm text-gray-500">Verify your email</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Enter your code</CardTitle>
            <CardDescription>
              We sent a 6-digit code to{" "}
              {email ? <span className="font-medium text-foreground">{email}</span> : "your email"}
              . It expires in 10 minutes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Verification code</Label>
                <Input
                  id="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  className="text-center text-lg tracking-[0.5em]"
                />
              </div>

              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              {notice && (
                <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-700">{notice}</div>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting || otp.length !== 6}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify email
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={onResend}
                disabled={isResending || !email}
              >
                {isResending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Resend code
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-gray-500">
              Wrong email?{" "}
              <Link href="/register" className="text-blue-600 hover:underline">
                Start over
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function VerifyEmailPage(): import("react").JSX.Element {
  return (
    <Suspense fallback={null}>
      <VerifyEmailForm />
    </Suspense>
  );
}
