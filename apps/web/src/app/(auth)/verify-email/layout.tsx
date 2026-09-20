import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verify your email",
  description:
    "Enter the 6-digit code we sent to finish setting up your Omventa account.",
  robots: { index: false, follow: false },
};

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}): import("react").JSX.Element {
  return <>{children}</>;
}
