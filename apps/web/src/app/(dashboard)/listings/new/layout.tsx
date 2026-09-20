import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Listing",
  description:
    "Crosslist an item to multiple marketplaces at once.",
};

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}): import("react").JSX.Element {
  return <>{children}</>;
}
