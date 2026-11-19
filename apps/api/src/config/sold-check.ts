// How often each user's listings are checked for sales — on every marketplace (eBay, Mercari,
// Poshmark), whoever does the check (server or extension). The server owns the schedule: every
// sweep starts with a claim on MarketplaceConnection.lastPolledAt, and a claim inside this
// interval answers "not due". So changing the value takes effect without touching the crons or
// the extension, which keep ticking and are simply told to wait.
//
//   SOLD_CHECK_INTERVAL_MINUTES   default 720 (twice a day). 60 = hourly. Minimum 15.
//
// Trade-off: a longer interval means less proxy traffic and fewer API calls, but a sale can stay
// undetected (and the item stay buyable elsewhere) for up to that long.

const DEFAULT_MINUTES = 720;
const MIN_MINUTES = 15;

/** Read on every call (not at import), so it always reflects the loaded env. */
export function soldCheckIntervalMinutes(): number {
  const raw = Number(process.env.SOLD_CHECK_INTERVAL_MINUTES ?? DEFAULT_MINUTES);
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_MINUTES;
  return Math.max(MIN_MINUTES, Math.round(raw));
}

export function soldCheckIntervalMs(): number {
  return soldCheckIntervalMinutes() * 60_000;
}

/**
 * An extension-mode user whose extension has missed its slot by this much gets a server sweep
 * instead. The extension's alarm fires hourly, so an hour of slack covers a normal late tick.
 */
export function extensionStaleMs(): number {
  return soldCheckIntervalMs() + 60 * 60_000;
}
