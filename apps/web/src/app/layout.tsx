import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import "./globals.css";
import { Providers } from "@/providers/providers";
import { Toaster } from "sonner";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "ReList — Cross-listing Platform for Resellers",
    template: "%s | ReList",
  },
  description:
    "Manage inventory and cross-post listings to eBay, Depop, Mercari, and more.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): import("react").JSX.Element {
  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans", geist.variable)}>
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  );
}

