import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Listings",
  description:
    "Track and manage your listings across every connected marketplace.",
};

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}): import("react").JSX.Element {
  return <>{children}</>;
}
