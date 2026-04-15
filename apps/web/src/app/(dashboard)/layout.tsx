import { Sidebar } from "@/components/layout/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}): import("react").JSX.Element {
  return (
    <div className="flex h-screen overflow-hidden bg-[#f6f5f3]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto max-w-7xl p-8">{children}</div>
      </main>
    </div>
  );
}

