import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Marketplace Connections",
  description:
    "Connect and manage your marketplace accounts.",
};

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}): import("react").JSX.Element {
  return <>{children}</>;
}
