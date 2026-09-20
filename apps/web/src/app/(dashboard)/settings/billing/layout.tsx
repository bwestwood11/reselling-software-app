import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Billing & Plans",
  description:
    "Manage your Omventa subscription, AI credits and billing details.",
};

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}): import("react").JSX.Element {
  return <>{children}</>;
}
