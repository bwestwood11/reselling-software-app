"use client";

import { useEffect, useState } from "react";
import { PanelLeftOpen } from "lucide-react";
import { Sidebar } from "./sidebar";
import { SubscriptionGate } from "@/components/subscription-gate";

/** Matches the naming convention of other per-viewer UI prefs (e.g. inventory's saved view). */
const SIDEBAR_COLLAPSED_KEY = "relist:sidebar-collapsed";

/**
 * Owns the hide/unhide state for the sidebar. Split out from layout.tsx (a Server Component,
 * so it can keep exporting `metadata`) since toggling needs client state shared between the
 * Sidebar itself and the "show sidebar" button that appears in the content area once it's hidden.
 */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  // Read the saved preference after mount (not in useState's initializer) so the server-rendered
  // and first client render agree — otherwise React would flag a hydration mismatch for anyone
  // who'd previously hidden the sidebar.
  useEffect(() => {
    try {
      if (localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1") setCollapsed(true);
    } catch {
      // localStorage unavailable (private mode, etc.) — just default to visible.
    }
  }, []);

  function toggleSidebar() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        // ignore — the in-memory state still toggles for this session
      }
      return next;
    });
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f6f5f3]">
      <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />
      <main className="relative flex-1 overflow-y-auto">
        {collapsed && (
          <button
            type="button"
            onClick={toggleSidebar}
            title="Show sidebar"
            aria-label="Show sidebar"
            className="fixed left-4 top-4 z-30 flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-500 shadow-sm transition-colors hover:text-zinc-900"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        )}
        <div className="container mx-auto max-w-7xl p-8">
          <SubscriptionGate>{children}</SubscriptionGate>
        </div>
      </main>
    </div>
  );
}
