import Link from "next/link";
import Image from "next/image";

const marketplaceLogos = [
  {
    name: "eBay",
    logoSrc: "/logos/ebay.png",
    width: 140,
    height: 56,
    className: "text-[#e53238]",
  },
  {
    name: "Etsy",
    logoSrc: "/logos/Etsy.png",
    width: 56,
    height: 56,
    className: "text-[#f1641e]",
  },
  {
    name: "Poshmark",
    logoSrc: "/logos/Poshmark.png",
    width: 150,
    height: 48,
    className: "text-[#7d1c44]",
  },
  {
    name: "Facebook",
    logoSrc: "/logos/Facebook.png",
    width: 56,
    height: 56,
    className: "text-[#1877f2]",
  },
  {
    name: "Whatnot",
    logoSrc: "/logos/Whatnot.png",
    width: 150,
    height: 42,
    className: "text-[#111827]",
  },
  {
    name: "Mercari",
    logoSrc: "/logos/Mercari.png",
    width: 56,
    height: 56,
    className: "text-[#5162f6]",
  },
  { name: "Depop", className: "text-[#ff2300]" },
  { name: "Grailed", className: "text-[#0f172a]" },
];

const itemGallery = [
  {
    title: "Vintage Denim Jacket",
    subtitle: "Outerwear",
    src: "/vintage-jacket.svg",
  },
  { title: "Sneaker Flip", subtitle: "Footwear", src: "/sneaker-pair.svg" },
  { title: "Designer Bag", subtitle: "Accessories", src: "/designer-bag.svg" },
  { title: "Retro Watch", subtitle: "Collectibles", src: "/retro-watch.svg" },
];

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#f6f5f3] text-zinc-900">
      <div className="pointer-events-none absolute inset-0">
        <div className="hero-ribbon absolute -right-[18rem] -top-[18rem] h-[44rem] w-[58rem] opacity-95" />
        <div className="hero-left-shape absolute -left-[14rem] top-[10rem] h-[16rem] w-[16rem]" />
        <div className="hero-glow absolute -left-[9rem] top-[16rem] h-[18rem] w-[18rem] rounded-full" />
        <div className="absolute inset-x-0 top-[27rem] h-px bg-gradient-to-r from-transparent via-orange-200 to-transparent" />
      </div>

      <header className="sticky top-3 z-30 mx-auto mt-4 flex w-full max-w-7xl items-center justify-between rounded-2xl border border-white/80 bg-white/80 px-6 py-4 shadow-[0_16px_48px_-36px_rgba(24,24,27,0.45)] backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 text-sm font-bold text-white shadow-sm">
            R
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight">ResellerOS</p>
            <p className="text-[11px] text-zinc-500">Crosslist smarter</p>
          </div>
        </div>

        <nav className="hidden items-center gap-8 text-sm font-semibold text-zinc-600 md:flex">
          <a href="#features" className="transition-colors hover:text-zinc-900">
            Product
          </a>
          <a
            href="#marketplaces"
            className="transition-colors hover:text-zinc-900"
          >
            Marketplaces
          </a>
          <a
            href="#inventory"
            className="transition-colors hover:text-zinc-900"
          >
            Inventory
          </a>
          <a href="#pricing" className="transition-colors hover:text-zinc-900">
            Pricing
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-zinc-700 transition-colors hover:text-zinc-900"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-orange-500"
          >
            Start Free
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-20">
        <section className="grid items-center gap-12 pb-24 pt-12 md:grid-cols-[1.02fr_0.98fr] md:pt-16">
          <div className="fade-up space-y-8">
            <p className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-3 py-1 text-xs font-semibold text-orange-700 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
              Purpose-built for full-time and side-hustle resellers
            </p>

            <h1 className="max-w-2xl text-4xl font-semibold leading-[1.03] tracking-tight sm:text-5xl md:text-[64px]">
              List once.
              <br />
              Sync like a pro.
              <br />
              Sell on every
              <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                {" "}
                marketplace.
              </span>
            </h1>

            <p className="max-w-xl text-base leading-relaxed text-zinc-600 sm:text-lg">
              ResellerOS is built for modern resellers who juggle drops, thrift
              finds, and premium inventory. Connect channels, cross-post in a
              click, and keep stock accurate everywhere.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/register"
                className="rounded-xl bg-orange-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-orange-500"
              >
                Get Started Free
              </Link>
              <Link
                href="/dashboard/marketplaces"
                className="rounded-xl border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
              >
                Explore Integrations
              </Link>
            </div>

            <div className="grid max-w-xl grid-cols-3 gap-3">
              <Metric value="8+" label="Marketplace channels" />
              <Metric value="2m" label="Typical post time" />
              <Metric value="24/7" label="Inventory sync" />
            </div>
          </div>

          <div className="fade-up delay-1 relative md:pl-6 md:pt-16">
            <div className="absolute left-6 top-3 z-20 hidden rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-[0_20px_40px_-28px_rgba(24,24,27,0.5)] md:block">
              <p className="text-xs font-semibold text-zinc-500">
                Daily activity
              </p>
              <p className="mt-1 text-lg font-semibold text-zinc-900">
                +42 listings
              </p>
            </div>

            <div className="relative z-10 rounded-3xl border border-white/70 bg-white/90 p-4 shadow-[0_34px_90px_-42px_rgba(24,24,27,0.52)] backdrop-blur">
              <div className="rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-amber-50 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">
                    Live crosslisting queue
                  </p>
                  <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-700">
                    8 active
                  </span>
                </div>

                <div className="space-y-3">
                  <ListingCard
                    name="Vintage Denim Jacket"
                    channels="eBay + Poshmark + Depop"
                    status="Publishing"
                    imageSrc="/vintage-jacket.svg"
                  />
                  <ListingCard
                    name="Nike Dunk Low Panda"
                    channels="eBay + Facebook + Mercari"
                    status="Synced"
                    imageSrc="/sneaker-pair.svg"
                  />
                  <ListingCard
                    name="Coach Mini Backpack"
                    channels="Poshmark + Whatnot"
                    status="Needs review"
                    imageSrc="/designer-bag.svg"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="marketplaces"
          className="fade-up delay-2 rounded-3xl border border-zinc-200 bg-white/80 px-6 py-12 shadow-[0_18px_54px_-48px_rgba(24,24,27,0.45)]"
        >
          <h2 className="text-center text-3xl font-semibold tracking-tight">
            One dashboard. Multi-marketplace reach.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-zinc-600">
            Connect your channels and keep inventory aligned automatically
            across your storefronts.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {marketplaceLogos.map((market) => (
              <div
                key={market.name}
                className="group flex h-20 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 py-4 text-center shadow-[0_14px_28px_-24px_rgba(24,24,27,0.58)] transition-all hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-[0_18px_34px_-24px_rgba(249,115,22,0.35)]"
              >
                {market.logoSrc ? (
                  <Image
                    src={market.logoSrc}
                    alt={`${market.name} logo`}
                    width={market.width}
                    height={market.height}
                    className="max-h-10 w-auto object-contain saturate-110"
                  />
                ) : (
                  <p
                    className={`text-sm font-bold tracking-tight ${market.className}`}
                  >
                    {market.name}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        <section id="inventory" className="py-14">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">
                Built for what resellers actually sell
              </h2>
              <p className="mt-2 text-zinc-600">
                Vintage clothing, sneakers, bags, and collectibles all in one
                workflow.
              </p>
            </div>
            <Link
              href="/register"
              className="hidden rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 md:inline-flex"
            >
              Start listing
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {itemGallery.map((item) => (
              <article
                key={item.title}
                className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_20px_44px_-36px_rgba(24,24,27,0.5)]"
              >
                <Image
                  src={item.src}
                  alt={item.title}
                  width={800}
                  height={560}
                  className="h-44 w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
                <div className="px-4 py-3">
                  <p className="text-sm font-semibold text-zinc-900">
                    {item.title}
                  </p>
                  <p className="mt-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
                    {item.subtitle}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="features" className="grid gap-4 py-14 md:grid-cols-3">
          <FeatureCard
            title="Unified Inventory"
            body="Track quantity and pricing changes in one place, then push updates everywhere with confidence."
          />
          <FeatureCard
            title="Faster Cross-Posting"
            body="Use one listing form and map product details to each marketplace without duplicate work."
          />
          <FeatureCard
            title="Profit Visibility"
            body="See platform fees, margins, and trends so you know which channels drive real returns."
          />
        </section>

        <section
          id="pricing"
          className="rounded-3xl border border-orange-200 bg-gradient-to-r from-orange-600 to-amber-500 px-7 py-10 text-white shadow-[0_24px_60px_-36px_rgba(249,115,22,0.6)]"
        >
          <div className="flex flex-col items-start justify-between gap-5 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-semibold text-orange-100">
                Launch Offer
              </p>
              <h3 className="mt-2 text-3xl font-semibold tracking-tight">
                Start crosslisting in under 10 minutes.
              </h3>
              <p className="mt-2 text-sm text-orange-50/90">
                Connect your first marketplace now and grow from there.
              </p>
            </div>
            <Link
              href="/register"
              className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-orange-700 transition-all hover:-translate-y-0.5"
            >
              Create Account
            </Link>
          </div>
        </section>
      </main>

      <style>{`
        .hero-ribbon {
          background:
            radial-gradient(120% 120% at 20% 0%, #f97316 0%, #fb7185 40%, #f43f5e 65%, #f59e0b 100%);
          border-radius: 42% 0 0 52%;
          filter: blur(0.5px);
          transform: rotate(-24deg);
        }
        .hero-left-shape {
          background: #efe7dc;
          border-radius: 54% 46% 48% 52%;
          opacity: 0.92;
        }
        .hero-glow {
          background: radial-gradient(circle at center, rgba(251, 146, 60, 0.22), rgba(251, 146, 60, 0));
        }
        .fade-up {
          opacity: 0;
          transform: translateY(18px);
          animation: fade-up 0.65s ease forwards;
        }
        .delay-1 {
          animation-delay: 0.12s;
        }
        .delay-2 {
          animation-delay: 0.22s;
        }
        @keyframes fade-up {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

function ListingCard({
  name,
  channels,
  status,
  imageSrc,
}: {
  name: string;
  channels: string;
  status: string;
  imageSrc: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-[0_12px_30px_-24px_rgba(24,24,27,0.5)]">
      <div className="flex items-center gap-3">
        <Image
          src={imageSrc}
          alt={name}
          width={64}
          height={64}
          className="h-14 w-14 rounded-lg object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-900">{name}</p>
          <p className="mt-1 truncate text-xs text-zinc-500">{channels}</p>
          <p className="mt-2 inline-flex rounded-full bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-700">
            {status}
          </p>
        </div>
      </div>
    </div>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-3 py-3 shadow-[0_12px_24px_-24px_rgba(24,24,27,0.45)]">
      <p className="text-xl font-semibold tracking-tight text-zinc-900">
        {value}
      </p>
      <p className="mt-1 text-xs font-medium text-zinc-500">{label}</p>
    </div>
  );
}

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_20px_36px_-30px_rgba(24,24,27,0.5)] transition-all hover:-translate-y-0.5 hover:border-orange-200">
      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-zinc-600">{body}</p>
    </article>
  );
}

