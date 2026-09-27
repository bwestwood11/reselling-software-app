import { CalendarClock, CreditCard, XCircle } from "lucide-react";
import { cn } from "@repo/ui";

const POINTS = [
  {
    Icon: CalendarClock,
    text: "You must start a 7-day free trial to use Omventa.",
  },
  {
    Icon: CreditCard,
    text: "A card is required to be on file to start the trial.",
  },
  {
    Icon: XCircle,
    text: "Cancel anytime before the trial ends and you won't be charged at all.",
  },
];

/**
 * Explains the trial terms up front: there's no free tier, so every new account
 * has to start a card-required 7-day trial from the billing page before it can
 * use the app.
 */
export function TrialNotice({ className }: { className?: string }): import("react").JSX.Element {
  return (
    <div className={cn("rounded-xl border border-orange-200 bg-orange-50/70 p-4", className)}>
      <p className="text-sm font-semibold text-zinc-900">How your free trial works</p>
      <ul className="mt-2.5 space-y-2">
        {POINTS.map(({ Icon, text }) => (
          <li key={text} className="flex items-start gap-2.5 text-sm text-zinc-700">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
            <span>{text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
