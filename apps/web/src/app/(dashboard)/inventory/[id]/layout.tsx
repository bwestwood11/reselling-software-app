import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inventory Item",
  description:
    "View item details, photos and marketplace listings.",
};

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}): import("react").JSX.Element {
  return <>{children}</>;
}
