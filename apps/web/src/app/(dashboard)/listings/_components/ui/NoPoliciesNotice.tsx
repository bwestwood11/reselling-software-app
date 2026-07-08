export function NoPoliciesNotice({ type }: { type: "fulfillment" | "payment" | "return" }) {
  return (
    <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-medium text-amber-700">
      No {type} policies found.{" "}
      <a
        href="https://www.ebay.com/sbk/buynselldashboard?context=SBK_SELLSET"
        target="_blank"
        rel="noopener noreferrer"
        className="underline"
      >
        Create one in eBay Business Policies
      </a>{" "}
      and refresh.
    </p>
  );
}
