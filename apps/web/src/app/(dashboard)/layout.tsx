import type { Metadata } from "next";
import { DashboardShell } from "@/components/layout/dashboard-shell";

// The authenticated app has nothing worth indexing.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}): import("react").JSX.Element {
  return <DashboardShell>{children}</DashboardShell>;
}

