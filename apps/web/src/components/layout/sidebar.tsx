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
  RefreshCw,
} from "lucide-react";
import { cn } from "@repo/ui";
import { signOut } from "@repo/auth/client";
import { useRouter } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/inventory", label: "Inventory", Icon: Package },
  { href: "/listings", label: "Listings", Icon: Tag },
  { href: "/sync", label: "Sync", Icon: RefreshCw },
  { href: "/settings", label: "Settings", Icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  return (
    <aside className="flex h-screen w-60 flex-col border-r bg-white">
      {/* Brand */}
      <div className="flex h-16 items-center gap-2 border-b px-6 font-bold text-lg text-blue-600">
        <ShoppingBag className="h-6 w-6" />
        ReList
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              pathname.startsWith(href)
                ? "bg-blue-50 text-blue-700"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>

      {/* Sign out */}
      <div className="border-t p-4">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
