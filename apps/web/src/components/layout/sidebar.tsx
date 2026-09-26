"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Tag,
  Settings,
  ShoppingBag,
  LogOut,
  Store,
  Zap,
  CreditCard,
  PanelLeftClose,
} from "lucide-react";
import { cn } from "@repo/ui";
import { signOut, useSession } from "@repo/auth/client";
import { useRouter } from "next/navigation";
import { useSubscription } from "@/hooks/use-subscription";

// Inventory and Sources now live on one page (a view toggle switches between
// them, see InventoryWorkspace) — one nav entry covers both.
const navItems = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/inventory", label: "Inventory", Icon: Package },
  { href: "/listings", label: "Listings", Icon: Tag },
  { href: "/marketplaces", label: "Marketplaces", Icon: Store },
  { href: "/settings", label: "Settings", Icon: Settings },
];

const PLAN_LABELS: Record<string, string> = {
  FREE: "Free",
  SIDE_HUSTLE: "Side Hustle",
  FULL_TIME: "Full-Time",
  ENTERPRISE: "Enterprise",
};

function getInitials(name: string | null | undefined): string {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1] ?? "") : "";
  const initials = last ? first.charAt(0) + last.charAt(0) : first.slice(0, 2);
  return initials.toUpperCase();
}

function formatPlan(plan: string | null): string {
  if (!plan) return "Current";
  return (
    PLAN_LABELS[plan] ??
    plan
      .toLowerCase()
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  );
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: subData } = useSubscription();
  const { data: sessionData } = useSession();
  const user = sessionData?.user;
  const subscription = subData?.data;

  const isActive = subscription?.isActive ?? false;
  const totalCredits = subscription
    ? subscription.aiCredits + subscription.bonusAiCredits
    : 0;
  // The bar fills as the monthly allotment is used up (empty = nothing used).
  const creditPct =
    isActive && subscription?.monthlyAiCredits
      ? Math.max(
          0,
          Math.min(
            100,
            ((subscription.monthlyAiCredits - subscription.aiCredits) /
              subscription.monthlyAiCredits) *
              100
          )
        )
      : 0;

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  return (
    // width (not display) animates so the collapse/expand slides rather than snaps; overflow-hidden
    // clips the fixed-width inner content as it shrinks toward 0 instead of wrapping/reflowing it.
    <aside
      className={cn(
        "sticky top-0 h-screen shrink-0 overflow-hidden border-r border-zinc-200 bg-[#fbfaf8] transition-[width] duration-300 ease-in-out",
        collapsed ? "w-0 border-r-0" : "w-72"
      )}
    >
      <div className="flex h-full w-72 flex-col">
        {/* Brand */}
        <div className="border-b border-zinc-200 px-5 py-5">
          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center gap-3 rounded-2xl border border-orange-200/70 bg-gradient-to-r from-orange-500 to-amber-500 p-3 text-white shadow-[0_16px_30px_-24px_rgba(249,115,22,0.8)]">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/20 backdrop-blur">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-none">Omventa</p>
                <p className="mt-1 text-[11px] font-medium text-orange-100">Seller Workspace</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onToggle}
              title="Hide sidebar"
              aria-label="Hide sidebar"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white hover:text-zinc-900"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 py-5">
          <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Navigation
          </p>
          <div className="space-y-1.5">
            {navItems.map(({ href, label, Icon }) => {
              // Single source of truth for "active" — the row and its icon used to compute this
              // two different ways (one included the trailing-slash boundary check, one didn't),
              // which could disagree for any future route sharing a prefix.
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    active
                      ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-[0_14px_24px_-20px_rgba(249,115,22,0.85)]"
                      : "text-zinc-600 hover:bg-white hover:text-zinc-900"
                  )}
                >
                  <span
                    className={cn(
                      "grid h-7 w-7 place-items-center rounded-lg transition-colors",
                      active
                        ? "bg-white/20"
                        : "bg-zinc-100 text-zinc-500 group-hover:bg-orange-100 group-hover:text-orange-700"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  {label}
                </Link>
              );
            })}
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
                    {subscription.isTrialing ? "Free Trial" : `${formatPlan(subscription.plan)} Plan`}
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
                  {totalCredits.toLocaleString()}
                </span>
                <span className="text-xs text-zinc-400">
                  / {subscription.monthlyAiCredits.toLocaleString()} AI credits
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500"
                  style={{ width: `${creditPct}%` }}
                />
              </div>
              {totalCredits === 0 ? (
                <p className="mt-1.5 text-[10px] text-red-500">
                  No AI credits left —{" "}
                  <a href="/settings/billing" className="underline">
                    buy a top-up
                  </a>
                </p>
              ) : subscription.bonusAiCredits > 0 ? (
                <p className="mt-1.5 text-[10px] text-zinc-400">
                  includes {subscription.bonusAiCredits.toLocaleString()} top-up credits
                </p>
              ) : null}
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

        {/* Account — shows who's signed in instead of a bare "Sign out" row, so the sidebar
            doubles as a quick answer to "which account am I in". */}
        <div className="border-t border-zinc-200 p-3">
          <div className="flex items-center gap-2.5 rounded-xl px-1.5 py-1.5">
            {user?.image ? (
              <img
                src={user.image}
                alt=""
                className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-zinc-200"
              />
            ) : (
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-orange-500 to-amber-500 text-xs font-semibold text-white">
                {getInitials(user?.name)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-zinc-900">{user?.name ?? "Account"}</p>
              <p className="truncate text-xs text-zinc-400">{user?.email ?? "…"}</p>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign out"
              aria-label="Sign out"
              className="group grid h-8 w-8 shrink-0 place-items-center rounded-lg text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
