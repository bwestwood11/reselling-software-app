import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Add Inventory Item",
  description:
    "Add a new item to your Omventa inventory.",
};

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}): import("react").JSX.Element {
  return <>{children}</>;
}
