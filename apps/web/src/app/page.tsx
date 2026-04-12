import Link from "next/link";
import { Button } from "@repo/ui";
import {
  Package,
  Tag,
  RefreshCw,
  BarChart3,
  ShoppingBag,
  ArrowRight,
} from "lucide-react";

export default function LandingPage(): import("react").JSX.Element {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50">
      {/* Nav */}
      <header className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2 font-bold text-xl text-blue-600">
          <ShoppingBag className="h-6 w-6" />
          ReList
        </div>
        <nav className="flex items-center gap-4">
          <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">
            Sign in
          </Link>
          <Button asChild size="sm">
            <Link href="/register">Get started free</Link>
          </Button>
        </nav>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-4">
        <section className="flex flex-col items-center py-24 text-center">
          <div className="mb-4 inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm text-blue-700">
            Cross-list to multiple marketplaces instantly
          </div>
          <h1 className="mb-6 max-w-3xl text-5xl font-extrabold tracking-tight text-gray-900 md:text-6xl">
            One inventory.{" "}
            <span className="text-blue-600">Every marketplace.</span>
          </h1>
          <p className="mb-10 max-w-xl text-lg text-gray-500">
            Manage your reselling business from a single dashboard. Create
            listings once and publish to eBay, Depop, Mercari, and more. Sync
            sold status automatically.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild size="lg">
              <Link href="/register">
                Start for free <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/dashboard">View demo</Link>
            </Button>
          </div>
        </section>

        {/* Features */}
        <section className="grid grid-cols-1 gap-8 pb-24 md:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border bg-white p-6 shadow-sm"
            >
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                <f.Icon className="h-5 w-5" />
              </div>
              <h3 className="mb-2 font-semibold text-gray-900">{f.title}</h3>
              <p className="text-sm text-gray-500">{f.description}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

const features = [
  {
    Icon: Package,
    title: "Inventory Hub",
    description:
      "Add items once with photos, condition, and pricing. Your single source of truth.",
  },
  {
    Icon: Tag,
    title: "Cross-listing",
    description:
      "Publish listings to eBay, Depop, Mercari and more with one click.",
  },
  {
    Icon: RefreshCw,
    title: "Auto-sync",
    description:
      "Sold on one platform? We automatically update all other listings.",
  },
  {
    Icon: BarChart3,
    title: "Analytics",
    description:
      "Track revenue, best-performing platforms, and inventory turnover.",
  },
];

