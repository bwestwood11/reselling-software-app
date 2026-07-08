"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CreateListingForm } from "../_components/CreateListingForm";

export default function NewListingPage(): import("react").JSX.Element {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-[#f6f5f3]">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex items-center gap-4">
          <Link
            href="/listings"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-500 shadow-sm transition-colors hover:text-zinc-900"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-orange-600">Listings</p>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Create Listing</h1>
          </div>
        </div>
        <CreateListingForm onClose={() => router.push("/listings")} />
      </div>
    </div>
  );
}
