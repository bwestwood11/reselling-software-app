import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inventory",
  description:
    "Manage your inventory and sourcing in one place.",
};

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}): import("react").JSX.Element {
  return <>{children}</>;
}
