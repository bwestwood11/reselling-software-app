import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Edit Inventory Item",
  description:
    "Edit item details and photos.",
};

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}): import("react").JSX.Element {
  return <>{children}</>;
}
