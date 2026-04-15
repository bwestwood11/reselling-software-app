"use client";

import { useQuery } from "@tanstack/react-query";
import { subscriptionApi } from "@/lib/api";
import type { SubscriptionInfo } from "@repo/types";

export function useSubscription() {
  return useQuery<{ data: SubscriptionInfo }>({
    queryKey: ["subscription"],
    queryFn: () => subscriptionApi.getCurrent(),
    staleTime: 5 * 60 * 1000, // treat as fresh for 5 min
  });
}
