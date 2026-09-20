import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Import Inventory",
  description:
    "Import existing items from your marketplaces into Omventa.",
};

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}): import("react").JSX.Element {
  return <>{children}</>;
}
