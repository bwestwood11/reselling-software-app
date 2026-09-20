import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile",
  description:
    "Update your name, email and password.",
};

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}): import("react").JSX.Element {
  return <>{children}</>;
}
