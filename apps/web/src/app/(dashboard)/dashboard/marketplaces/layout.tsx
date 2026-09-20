import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Marketplace Catalog",
  description:
    "Browse the marketplaces Omventa supports and see which integrations are available.",
};

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}): import("react").JSX.Element {
  return <>{children}</>;
}
