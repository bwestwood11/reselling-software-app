import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create your account",
  description:
    "Start your free trial of Omventa and crosslist your inventory to every major resale marketplace in minutes.",
};

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}): import("react").JSX.Element {
  return <>{children}</>;
}
