"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription";

/**
 * Routes reachable even without an active subscription/trial — the user needs
 * somewhere to actually pick a plan. Keep this list narrow: everything else
 * under (dashboard) is gated until the account is ACTIVE or TRIALING.
 */
const ALLOWED_WITHOUT_SUBSCRIPTION = new Set(["/settings/billing"]);

/**
 * Wraps every (dashboard) route. A brand-new account starts with an INACTIVE
 * placeholder subscription (see the Better Auth `user.create.after` hook) and
 * has no access until it starts the 7-day trial or subscribes — this mirrors
 * that server-side gate (enforced per-route by `requireActiveSubscription`)
 * on the client so unentitled users land on the plan picker instead of a
 * dashboard full of failed requests.
 */
export function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data, isLoading, isError } = useSubscription();

  const subscription = data?.data;
  const isEntitled = subscription?.isActive ?? false;
  const exempt = ALLOWED_WITHOUT_SUBSCRIPTION.has(pathname);

  useEffect(() => {
    if (!isLoading && !isError && !isEntitled && !exempt) {
      router.replace("/settings/billing");
    }
  }, [isLoading, isError, isEntitled, exempt, router]);

  if (exempt) return <>{children}</>;

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
      </div>
    );
  }

  // Fail open on a network hiccup rather than bouncing the user — the API
  // still enforces the real gate (402) on every request regardless.
  if (isError) return <>{children}</>;

  if (!isEntitled) {
    // Redirect is in-flight — render nothing to avoid a flash of gated content.
    return null;
  }

  return <>{children}</>;
}
