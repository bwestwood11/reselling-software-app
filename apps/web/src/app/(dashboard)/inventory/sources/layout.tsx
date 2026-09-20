import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sources",
  description:
    "Track where your inventory comes from.",
};

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}): import("react").JSX.Element {
  return <>{children}</>;
}
