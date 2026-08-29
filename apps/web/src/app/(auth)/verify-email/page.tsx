"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ShoppingBag, Loader2, AlertCircle, CheckCircle2, MailCheck } from "lucide-react";
import { Button } from "@repo/ui";
import { emailOtp } from "@repo/auth/client";
import { AuthBrandPanel } from "@/components/auth/brand-panel";
import { OtpInput } from "@/components/auth/otp-input";

const RESEND_COOLDOWN_SECONDS = 30;

function VerifyEmailForm(): import("react").JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  // Guards against double-submitting once auto-submit and a manual click race.
  const verifyingRef = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function verify(code: string) {
    if (verifyingRef.current) return;
    verifyingRef.current = true;
    setError(null);
    setNotice(null);
    setIsVerifying(true);

    const result = await emailOtp.verifyEmail({ email, otp: code });

    setIsVerifying(false);
    verifyingRef.current = false;

    if (result.error) {
      setError(result.error.message ?? "That code didn't work — check it and try again.");
      return;
    }

    router.push("/dashboard");
  }

  // Auto-submit the moment all six digits are in — the button stays as a
  // manual fallback if that ever misfires.
  useEffect(() => {
    if (otp.length === 6) void verify(otp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  async function onResend() {
    setError(null);
    setNotice(null);
    setIsResending(true);

    const result = await emailOtp.sendVerificationOtp({ email, type: "email-verification" });

    setIsResending(false);

    if (result.error) {
      setError(result.error.message ?? "Couldn't resend the code — try again in a moment.");
      return;
    }

    setNotice("A new code is on its way.");
    setOtp("");
    setCooldown(RESEND_COOLDOWN_SECONDS);
  }

  return (
    <div className="min-h-screen bg-white lg:grid lg:grid-cols-2">
      <AuthBrandPanel
        eyebrow="Account security"
        headline="Check your inbox."
        subhead="We emailed a 6-digit code to confirm it's really you before your listings go live."
      />

      <div className="flex min-h-screen flex-col justify-center px-6 py-12 sm:px-10 lg:px-16 xl:px-20">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-[0_10px_20px_-12px_rgba(249,115,22,0.7)]">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold text-zinc-900">ReList</span>
          </div>

          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-50 text-orange-600">
            <MailCheck className="h-6 w-6" />
          </div>

          <h2 className="mt-5 text-2xl font-bold tracking-tight text-zinc-900">
            Enter your code
          </h2>
          <p className="mt-1.5 text-sm text-zinc-500">
            {email ? (
              <>
                Sent to <span className="font-medium text-zinc-700">{email}</span>. It expires in
                10 minutes.
              </>
            ) : (
              "Enter the 6-digit code we emailed you. It expires in 10 minutes."
            )}
          </p>

          <div className="mt-8">
            <OtpInput value={otp} onChange={setOtp} disabled={isVerifying} autoFocus />
          </div>

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {notice && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{notice}</span>
            </div>
          )}

          <Button
            type="button"
            onClick={() => void verify(otp)}
            disabled={isVerifying || otp.length !== 6}
            className="mt-6 h-11 w-full rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-sm font-semibold text-white shadow-[0_14px_24px_-12px_rgba(249,115,22,0.6)] transition-opacity hover:opacity-90"
          >
            {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verify email
          </Button>

          <div className="mt-5 text-center text-sm text-zinc-500">
            {cooldown > 0 ? (
              <span>
                Didn&apos;t get it? Resend in{" "}
                <span className="tabular-nums font-medium text-zinc-700">0:{String(cooldown).padStart(2, "0")}</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={onResend}
                disabled={isResending || !email}
                className="inline-flex items-center gap-1.5 font-medium text-orange-600 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isResending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Resend code
              </button>
            )}
          </div>

          <p className="mt-8 text-center text-sm text-zinc-500">
            Wrong email?{" "}
            <Link href="/register" className="font-medium text-orange-600 hover:text-orange-700">
              Start over
            </Link>
          </p>
        </div>
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
