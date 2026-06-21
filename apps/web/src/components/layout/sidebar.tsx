"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Tag,
  Settings,
  ShoppingBag,
  LogOut,
  RefreshCw,
  Store,
  Zap,
  CreditCard,
  MapPin,
} from "lucide-react";
import { cn } from "@repo/ui";
import { signOut, useSession } from "@repo/auth/client";
import { useRouter } from "next/navigation";
import { useSubscription } from "@/hooks/use-subscription";

const navItems = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/inventory", label: "Inventory", Icon: Package },
  { href: "/inventory/sources", label: "Sources", Icon: MapPin },
  { href: "/listings", label: "Listings", Icon: Tag },
  { href: "/marketplaces", label: "Marketplaces", Icon: Store },
  { href: "/dashboard/sync", label: "Sync", Icon: RefreshCw },
  { href: "/settings", label: "Settings", Icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: subData } = useSubscription();
  const { data: sessionData } = useSession();

  useEffect(() => {
    if (sessionData?.user) {
      console.log("Current user:", sessionData.user);
    }
  }, [sessionData?.user]);
  const subscription = subData?.data;

  const isActive =
    subscription?.status === "ACTIVE" || subscription?.status === "TRIALING";
  const creditPct =
    isActive && subscription?.monthlyCredits
      ? Math.max(0, Math.min(100, (subscription.credits / subscription.monthlyCredits) * 100))
      : 0;

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-zinc-200 bg-[#fbfaf8]">
      {/* Brand */}
      <div className="border-b border-zinc-200 px-5 py-5">
        <div className="flex items-center gap-3 rounded-2xl border border-orange-200/70 bg-gradient-to-r from-orange-500 to-amber-500 p-3 text-white shadow-[0_16px_30px_-24px_rgba(249,115,22,0.8)]">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/20 backdrop-blur">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">ReList</p>
            <p className="mt-1 text-[11px] font-medium text-orange-100">Seller Workspace</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-5">
        <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
          Navigation
        </p>
        <div className="space-y-1.5">
          {navItems.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                (href === "/inventory"
                  ? pathname === "/inventory" || (pathname.startsWith("/inventory/") && !pathname.startsWith("/inventory/sources"))
                  : pathname.startsWith(href))
                  ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-[0_14px_24px_-20px_rgba(249,115,22,0.85)]"
                  : "text-zinc-600 hover:bg-white hover:text-zinc-900"
              )}
            >
              <span
                className={cn(
                  "grid h-7 w-7 place-items-center rounded-lg transition-colors",
                  pathname.startsWith(href)
                    ? "bg-white/20"
                    : "bg-zinc-100 text-zinc-500 group-hover:bg-orange-100 group-hover:text-orange-700"
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              {label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Credits widget */}
      <div className="border-t border-zinc-200 px-4 py-4">
        {isActive && subscription ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Zap className="h-3 w-3 text-orange-500" />
                <span className="text-xs font-semibold text-zinc-700">
                  {subscription.plan} Plan
                </span>
              </div>
              <Link
                href="/settings/billing"
                className="text-[10px] font-medium text-orange-600 hover:text-orange-700"
              >
                Manage
              </Link>
            </div>
            <div className="mb-1.5 flex items-baseline gap-1">
              <span className="text-lg font-bold tabular-nums text-zinc-900">
                {subscription.credits}
              </span>
              <span className="text-xs text-zinc-400">
                / {subscription.monthlyCredits} credits
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500"
                style={{ width: `${creditPct}%` }}
              />
            </div>
            {subscription.credits === 0 && subscription.plan === "FREE" && (
              <p className="mt-1.5 text-[10px] text-red-500">
                No credits left —{" "}
                <a href="/settings/billing" className="underline">
                  upgrade to get more
                </a>
              </p>
            )}
            {subscription.credits === 0 && subscription.plan !== "FREE" && (
              <p className="mt-1.5 text-[10px] text-red-500">
                No credits left — renews next cycle
              </p>
            )}
            {subscription.plan === "FREE" && subscription.credits > 0 && (
              <p className="mt-1.5 text-[10px] text-zinc-400">
                Free credits don&apos;t refresh monthly
              </p>
            )}
          </div>
        ) : (
          <Link
            href="/settings/billing"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-3 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            <CreditCard className="h-4 w-4" />
            Subscribe to crosspost
          </Link>
        )}
      </div>

      {/* Sign out */}
      <div className="border-t border-zinc-200 p-4">
        <button
          onClick={handleSignOut}
          className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-600 transition-all hover:bg-white hover:text-zinc-900"
        >
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-zinc-100 text-zinc-500 transition-colors group-hover:bg-red-100 group-hover:text-red-600">
            <LogOut className="h-4 w-4" />
          </span>
          Sign out
        </button>
      </div>
    </aside>
  );
}
