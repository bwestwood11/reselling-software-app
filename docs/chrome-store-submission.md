# Chrome Web Store submission — Omventa Crosslister

Build the upload package with `pnpm ext:build` → `extension/dist/omventa-crosslister-<version>.zip`
(only the runtime files are included). For local development against the local API use
`pnpm ext:dev` and load `extension/dist/dev` unpacked — it re-adds `http://localhost:3001` and
points the extension at it; the store build never contains either.

## Single purpose

Publish and delist a user's Omventa inventory on Mercari and Poshmark from their own browser,
and report back when those listings sell.

## Permission justifications (paste into the dashboard)

| Permission | Justification |
|---|---|
| `storage` | Stores the user's Omventa sign-in token locally so they stay signed in to the extension. |
| `scripting` | Runs small functions inside the user's logged-in mercari.com / poshmark.com tabs so listing requests are made with the user's own session, exactly as if they had used the site. |
| `cookies` | Reads the user's Mercari/Poshmark session cookies when they click "Connect" so Omventa can post on their behalf, and restores them to a background tab used for publishing. Limited to mercari.com and poshmark.com. |
| `alarms` | Wakes the background worker once a minute to check for queued publish/delist jobs and hourly to check whether listings have sold. MV3 service workers are otherwise suspended. |
| `notifications` | Shows a notification when one of the user's listings is detected as sold. |
| `https://www.mercari.com/*`, `https://poshmark.com/*` | The two marketplaces the extension publishes to and reads listing status from. |
| `https://api.omventa.com/*` | The Omventa API: sign-in, fetching queued jobs, saving connections, reporting results. |

No remote code is loaded or evaluated; all logic ships in the package.

## Data disclosures (Privacy practices tab)

- **Authentication information:** yes — Omventa email/password (sent only to `api.omventa.com`
  to sign in; only the returned token is stored) and marketplace session cookies/tokens.
- **Personally identifiable / website content:** listing details (titles, prices, photos) the user
  chose to crosslist; marketplace account name and ID.
- Not sold, not used for advertising or creditworthiness, not transferred to third parties
  except as needed to provide the feature. Certify all three "limited use" statements.

## Privacy policy — required content

A public privacy-policy URL is mandatory (the listing is rejected without one). Use `https://<web-domain>/privacy` (page: `apps/web/src/app/privacy/page.tsx`). It states:

1. The extension reads Mercari and Poshmark session cookies/tokens, only after the user clicks
   Connect, and sends them to Omventa's servers over HTTPS to publish, delist and check the
   status of the user's own listings.
2. Which data is stored (connection tokens, listing status), how long, and how a user deletes
   it (disconnecting a marketplace / deleting the account).
3. Data is not sold or shared with third parties beyond infrastructure providers.
4. Contact email for privacy requests.

## Remaining store-dashboard items

- Store listing icon 128×128 (`extension/icons/icon128.png`), at least one 1280×800 or 640×400
  screenshot, and a short + detailed description.
- Category: Shopping (or Productivity). Set the privacy-policy URL and support email.
- Replace the placeholder icon with final brand artwork if desired (same filenames/sizes).
