/// <reference lib="dom" />
// Login is driven via Browserless's `/unblock` REST API (see `runBrowserlessUnblock` in
// `./browserless.client.ts`), not `/function`. Verified 2026-07-12 against a live Browserless
// Free-plan account: `/unblock` clears Mercari's Cloudflare "Just a moment..." interstitial that
// `/function` (even with `stealth: true` + a residential proxy) does not, and — unlike the
// `Browserless.solveCaptcha` CDP command, which is gated to the Scale/Enterprise plan — works on
// Free.
//
// startLogin/submitOtp are two separate HTTP requests (a human has to read an emailed/texted code
// in between), so the live Puppeteer connection has to survive across them. We tried reconnecting
// via Browserless's own session-resume mechanism (store `/unblock`'s `browserWSEndpoint`, then
// `puppeteer.connect()` to it again from `submitOtp`) and confirmed live 2026-07-12 that this
// cannot work: Browserless's actual reconnect handshake requires issuing the `Browserless.reconnect`
// CDP command on the live connection *before* disconnecting to register the session — `/unblock`'s
// `browserWSEndpoint`+`ttl` params don't do that on their own, so the "reconnect" URL it returns
// 404s ("Couldn't locate browser/session") even while the original connection is still open. Worse,
// Browserless's documented reconnect-window cap on the Free plan is 10 seconds regardless — nowhere
// near enough time for a human to read and type a code. So instead we hold the live `Browser`/`Page`
// open in this process's memory (`pendingLogins` below) between the two calls and never touch
// Browserless's reconnect endpoint at all. This only works within a single Node process/instance —
// fine at this app's current scale, but won't survive a server restart or horizontal scaling.
//
// Mercari's login form loads `recaptcha/enterprise.js?render=<sitekey>` and calls
// `grecaptcha.enterprise.execute(sitekey, {action})` on submit — score-based, invisible reCAPTCHA
// Enterprise (no checkbox/popup). Confirmed 2026-07-12 via live testing: an automated Browserless
// session earns a low trust score, and Mercari's backend silently rejects the login (generic
// "Email address or password not valid", no visible CAPTCHA popup) rather than surfacing an
// interactive challenge — so reactively checking for a challenge iframe never catches this. To fix
// it, `startLogin` hooks `grecaptcha.enterprise.execute` before Mercari's own code calls it (via
// `page.exposeFunction` bridging to `./capsolver.client.ts`) and substitutes a CapSolver-solved,
// legitimately high-trust token. The reactive challenge check (`CaptchaChallengeError`) stays as a
// defense-in-depth fallback for the rare case a visible challenge appears anyway.

import puppeteer from "puppeteer-core";
import type { Browser, Page } from "puppeteer-core";
import type { PrismaClient } from "@repo/db";
import { runBrowserlessUnblock, BrowserlessError } from "./browserless.client";
import { solveRecaptchaEnterpriseV3, assertCapsolverConfigured } from "./capsolver.client";

const MERCARI_BASE = "https://www.mercari.com";

// How long we hold a paused login's browser session open in memory waiting for submitOtp.
// Bump if users report the window closing before they can find the code.
const OTP_RECONNECT_WINDOW_MS = 5 * 60 * 1000;

interface PendingMercariSession {
  browser: Browser;
  page: Page;
  expiresAt: number;
  timer: ReturnType<typeof setTimeout>;
  // TEMP DIAGNOSTIC — see the elapsed-time log in submitOtp. Lets us check whether Mercari
  // rejects the OTP because of a short-lived server-side nonce vs. some other cause.
  otpRequestedAt: number;
  // The `relistSolveRecaptcha` exposeFunction binding installed in startLogin stays live on this
  // same page for submitOtp too — Mercari's OTP "Verify" step likely fires its own
  // grecaptcha.enterprise.execute call, same as the password step. A ref (not a plain variable)
  // because the closure that writes to it lives inside startLogin, which has already returned by
  // the time submitOtp needs to read it.
  captchaErrorRef: { current: unknown };
}

// Module-level, not a class field: `MercariBrowserlessService` is instantiated fresh per HTTP
// request (see routes/mercari.ts), but the live session has to survive from the startLogin request
// to the later submitOtp request within the same Node process.
const pendingLogins = new Map<string, PendingMercariSession>();

function clearPendingLogin(userId: string): void {
  const pending = pendingLogins.get(userId);
  if (!pending) return;
  clearTimeout(pending.timer);
  pendingLogins.delete(userId);
  pending.browser.disconnect();
}

export class CaptchaChallengeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CaptchaChallengeError";
  }
}

export class MercariLoginFailedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MercariLoginFailedError";
  }
}

/**
 * CapSolver failed (or timed out) solving Mercari's reCAPTCHA Enterprise challenge. Distinct from
 * `MercariLoginFailedError` on purpose — without this, a CapSolver outage/balance exhaustion looks
 * identical to a wrong password, since Mercari's own error message doesn't distinguish the two.
 */
export class CaptchaSolveFailedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CaptchaSolveFailedError";
  }
}

/**
 * Drives Mercari's real login form via a Browserless `/unblock`-cleared session (residential
 * proxy) instead of a self-hosted browser, so the session presents a much better trust signal to
 * Mercari's Cloudflare gate. Login is two-phase because Mercari's own device verification (an
 * emailed/texted one-time code) requires a human in the loop between submitting the password and
 * completing login:
 *
 *   1. `startLogin(userId, email, password)` — submits credentials. Resolves to
 *      `{ status: "success" }` if that's all Mercari asked for, or `{ status: "otp_required" }`
 *      if Mercari wants a code — the caller should prompt the user for it and call `submitOtp`.
 *   2. `submitOtp(userId, code)` — resumes the SAME in-memory browser session (see
 *      `pendingLogins` above) and finishes login.
 *
 * Solves Mercari's score-based reCAPTCHA Enterprise challenge proactively via CapSolver (see
 * `./capsolver.client.ts`) before submitting credentials. Throws `CaptchaSolveFailedError` if
 * CapSolver itself fails/times out, or `CaptchaChallengeError` if Mercari still shows a visible
 * challenge despite a solved token — surface both to the user rather than retrying blindly.
 */
export class MercariBrowserlessService {
  private readonly baseUrl = MERCARI_BASE;
  private readonly marketplace = "MERCARI" as const;

  constructor(private readonly db: PrismaClient) {}

  async startLogin(
    userId: string,
    email: string,
    password: string
  ): Promise<{ status: "success" | "otp_required" }> {
    // Fail fast — no point spending a Browserless session if we can't solve the CAPTCHA after.
    assertCapsolverConfigured();

    // `ttl` also sets the client-side abort timeout in `runBrowserlessUnblock`
    // (`ttl + 20_000`) — it does NOT get us a reconnectable session for `submitOtp` later (see
    // the file-level comment above); that's what `pendingLogins` is for. Measured live
    // 2026-07-14: a real /unblock call against Mercari's login page with a residential proxy
    // took ~55s, longer than the 50s abort the unset (30s) default gives — which was firing a
    // spurious client-side timeout on a request Browserless was about to complete successfully.
    // 60s leaves real headroom above that.
    const unblocked = await runBrowserlessUnblock(
      {
        url: `${this.baseUrl}/login/`,
        cookies: true,
        browserWSEndpoint: true,
        ttl: 60_000,
      },
      { proxy: { residential: true, sticky: true, country: "us" } }
    );

    if (!unblocked.browserWSEndpoint) {
      throw new MercariLoginFailedError(
        "Browserless /unblock did not return a reconnectable session — Mercari's Cloudflare " +
          "challenge may not have cleared."
      );
    }

    const browser = await puppeteer.connect({ browserWSEndpoint: unblocked.browserWSEndpoint });
    let disconnected = false;
    // Set true on the otp_required path — we hand the live `browser`/`page` off to `pendingLogins`
    // for `submitOtp` to reuse directly, so the finally block below must not disconnect it.
    let keepAlive = false;

    try {
      const pages = await browser.pages();
      const page = pages[pages.length - 1];
      if (!page) {
        throw new MercariLoginFailedError("Lost the Browserless session right after /unblock.");
      }

      // Hook grecaptcha.enterprise.execute BEFORE Mercari's own code calls it (on submit, and
      // possibly earlier as a prefetch) so we substitute a CapSolver-solved token instead of
      // letting this automated session earn its own (likely low-trust) score. Bridges into Node
      // via exposeFunction since the actual CapSolver HTTP call has to happen server-side.
      const captchaErrorRef: { current: unknown } = { current: undefined };
      await page.exposeFunction(
        "relistSolveRecaptcha",
        async (siteKey: string, action: string): Promise<string> => {
          try {
            return await solveRecaptchaEnterpriseV3({
              websiteURL: page.url(),
              websiteKey: siteKey,
              pageAction: action,
            });
          } catch (err) {
            captchaErrorRef.current = err;
            throw err;
          }
        }
      );

      // Passed as a raw source string, not a function reference: tsx/esbuild instruments
      // compiled functions with a `__name(...)` helper call for name-preservation, and
      // Puppeteer's function-reference `page.evaluate` ships that helper call along as literal
      // text via `.toString()` — but `__name` only exists in our Node process, not the browser,
      // so the hook would throw `ReferenceError: __name is not defined` on install. A string is
      // `eval`'d directly in the page with no Node-side compilation step to carry that along.
      await page.evaluate(`
        (function () {
          function install() {
            var g = window.grecaptcha;
            if (!g || !g.enterprise || !g.enterprise.execute || g.enterprise.execute.__relistHooked) return;
            function hooked(siteKey, opts) {
              return window.relistSolveRecaptcha(siteKey, (opts && opts.action) || "");
            }
            hooked.__relistHooked = true;
            // Simple assignment silently no-ops here — reCAPTCHA Enterprise defines "execute" as
            // non-writable. Confirmed via isolated testing 2026-07-12: defineProperty is required
            // to actually force the override; without it, Mercari's own code keeps calling
            // Google's real execute() and this hook never fires.
            Object.defineProperty(g.enterprise, "execute", {
              value: hooked,
              writable: true,
              configurable: true,
            });
          }
          if (window.grecaptcha && window.grecaptcha.enterprise && window.grecaptcha.enterprise.execute) {
            install();
          } else {
            var interval = setInterval(function () {
              if (window.grecaptcha && window.grecaptcha.enterprise && window.grecaptcha.enterprise.execute) {
                install();
                clearInterval(interval);
              }
            }, 50);
          }
        })();
      `);

      await page.waitForSelector('input[name="email"], input[type="email"]', { timeout: 15_000 });
      await page.type('input[name="email"], input[type="email"]', email, { delay: 60 });
      await page.type('input[name="password"], input[type="password"]', password, { delay: 60 });

      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll("button"));
        const submit = buttons.find(
          (b) =>
            (b.getAttribute("type") === "submit" && !b.hasAttribute("disabled")) ||
            /log ?in/i.test(b.textContent ?? "")
        );
        submit?.click();
      });

      await page.waitForNetworkIdle({ idleTime: 1000, timeout: 30_000 }).catch(() => undefined);

      // Check this before anything else — a failed CapSolver call surfaces to Mercari's own JS as
      // just a rejected promise, which its UI likely turns into a generic error indistinguishable
      // from wrong credentials. Without this check that would silently masquerade as
      // MercariLoginFailedError below.
      if (captchaErrorRef.current) {
        throw new CaptchaSolveFailedError(
          `CapSolver failed to solve Mercari's reCAPTCHA Enterprise challenge: ${
            captchaErrorRef.current instanceof Error
              ? captchaErrorRef.current.message
              : String(captchaErrorRef.current)
          }`
        );
      }

      // Mercari's login is multi-phase under the hood — submitting credentials triggers an
      // /v1/authorize call, then (if MFA is enabled on the account) an /v1/login call that 403s
      // with MFARequiredException before the OTP form gets injected into the DOM. Confirmed via
      // network logging 2026-07-12: checking any of these states immediately after
      // waitForNetworkIdle reads a stale page — the OTP form, "logged in" state, or an interactive
      // CAPTCHA challenge can all appear a couple seconds after network activity first goes quiet.
      // Poll for all three instead of checking each once. Confirmed live 2026-07-14 via
      // START_LOGIN_NONE_DIAG: an 8-attempt/~6s window isn't always enough — a run's diag
      // snapshot, taken immediately after the loop gave up, showed the OTP section ("Verify your
      // login", the code input, "Verify" button) already present in the DOM. Widened to 20
      // attempts/~15s so slower proxy/network conditions don't get misread as a login failure.
      let outcome: "captcha" | "otp" | "loggedin" | "none" = "none";
      for (let attempt = 0; attempt < 20 && outcome === "none"; attempt++) {
        outcome = await page.evaluate(() => {
          if (
            document.querySelector(
              'iframe[src*="recaptcha"][src*="bframe"], iframe[title*="challenge" i], .cf-turnstile, [data-hcaptcha-widget-id]'
            )
          ) {
            return "captcha";
          }
          if (
            document.querySelector(
              'input[name="code"], input[autocomplete="one-time-code"], input[name="verificationCode"]'
            )
          ) {
            return "otp";
          }
          if (
            document.querySelector('[data-testid="user-menu"], [href="/mypage/"], .UserName') ||
            !location.pathname.startsWith("/login")
          ) {
            return "loggedin";
          }
          return "none";
        });
        if (outcome === "none") await new Promise((resolve) => setTimeout(resolve, 750));
      }

      if (outcome === "captcha") {
        throw new CaptchaChallengeError(
          "Mercari still presented an interactive challenge even after an automated solve " +
            "attempt. Try again, or connect the account via the browser-extension login flow " +
            "instead."
        );
      }

      if (outcome === "otp") {
        const cookies = await page.browserContext().cookies();
        await this.upsertConnection(userId, {
          isActive: false,
          sessionCookies: JSON.stringify(cookies),
        });

        // Replace, don't leak, any earlier abandoned attempt for this user.
        clearPendingLogin(userId);
        const expiresAt = Date.now() + OTP_RECONNECT_WINDOW_MS;
        const timer = setTimeout(() => clearPendingLogin(userId), OTP_RECONNECT_WINDOW_MS);
        pendingLogins.set(userId, {
          browser,
          page,
          expiresAt,
          timer,
          otpRequestedAt: Date.now(),
          captchaErrorRef,
        });

        keepAlive = true;
        return { status: "otp_required" };
      }

      if (outcome === "none") {
        // TEMP DIAGNOSTIC — investigating a live failure where startLogin never reaches
        // captcha/otp/loggedin within the polling window. Captures what's actually on the page
        // (e.g. an inline "invalid email or password" error, vs. a genuinely different DOM
        // shape) so the next failed run tells us which.
        const noneDiag = await page.evaluate(() => ({
          url: location.href,
          title: document.title,
          bodyText: document.body?.innerText?.slice(0, 800) ?? "",
        }));
        console.error("START_LOGIN_NONE_DIAG:", JSON.stringify(noneDiag));

        throw new MercariLoginFailedError(
          "Mercari login did not complete — check the credentials or for selector drift on Mercari's login page."
        );
      }

      const cookies = await page.browserContext().cookies();
      const profile = await page.evaluate(async () => {
        const res = await fetch("/v1/users/me", { credentials: "include" });
        return res.ok ? ((await res.json()) as { data?: { id?: string | number; name?: string } }) : null;
      });

      await this.upsertConnection(userId, {
        isActive: true,
        sessionCookies: JSON.stringify(cookies),
        accountId: profile?.data?.id != null ? String(profile.data.id) : undefined,
        accountName: profile?.data?.name ?? undefined,
      });

      return { status: "success" };
    } catch (err) {
      // Nothing left to hold onto on a hard failure — release the session immediately.
      browser.disconnect();
      disconnected = true;
      throw err;
    } finally {
      // success falls through here without having disconnected yet — safe to release now.
      // otp_required already set keepAlive and handed the connection to pendingLogins, so skip.
      if (!disconnected && !keepAlive) browser.disconnect();
    }
  }

  async submitOtp(userId: string, code: string): Promise<void> {
    const pending = pendingLogins.get(userId);
    if (!pending) {
      throw new MercariLoginFailedError("No pending Mercari login found — call startLogin first.");
    }
    if (pending.expiresAt < Date.now()) {
      clearPendingLogin(userId);
      throw new MercariLoginFailedError(
        "The Mercari verification window expired — call startLogin again to get a new code."
      );
    }

    const { page } = pending;
    const codeSelector =
      'input[name="code"], input[autocomplete="one-time-code"], input[name="verificationCode"]';

    // TEMP DIAGNOSTIC — checking whether Mercari's OTP nonce is short-lived and expiring during
    // the human-in-the-loop delay (read email, type code, hit submit) between startLogin and
    // this call.
    console.error(
      "SUBMIT_OTP_ELAPSED_MS_SINCE_REQUESTED:",
      Date.now() - pending.otpRequestedAt
    );

    // TEMP DIAGNOSTIC — captures Mercari's actual verify response instead of inferring the
    // rejection reason from DOM state after the page resets. DOM diagnostics alone can't tell
    // "wrong code" apart from "expired nonce" apart from some other validation error.
    //
    // Widened from a `/v1/`-only filter after that filter came back empty on a live rejected-code
    // run (2026-07-14) despite the page still fully resetting to a blank login form — meaning
    // either the verify request isn't a `/v1/` XHR (e.g. a plain form POST/redirect, or a
    // different path/host) or no request fired at all (e.g. a client-side JS error before the
    // request). Logging every non-static mercari.com response — including full-page
    // navigations/redirects — to tell those apart.
    const apiDiag: Array<{ method: string; url: string; status: number; body: string }> = [];
    const onResponse = async (response: import("puppeteer-core").HTTPResponse): Promise<void> => {
      const url = response.url();
      if (!/mercari\.com/i.test(url)) return;
      if (/\.(css|js|mjs|png|jpe?g|svg|gif|woff2?|ico|webp)(\?|$)/i.test(url)) return;
      let body = "";
      try {
        body = (await response.text()).slice(0, 500);
      } catch {
        body = "<unreadable>";
      }
      apiDiag.push({ method: response.request().method(), url, status: response.status(), body });
    };
    page.on("response", onResponse);

    // TEMP DIAGNOSTIC — tests whether Mercari's OTP "Verify" step triggers its own
    // grecaptcha.enterprise.execute call and, if so, whether our startLogin-installed hook (see
    // the file-level comment) is still in place to intercept it. If Mercari reassigns
    // grecaptcha.enterprise.execute for the OTP page state, our hook's writable:true property
    // would get silently overwritten and the OTP submit would earn its own low-trust score
    // instead of a CapSolver-solved token.
    const hookDiag = await page.evaluate(() => {
      const exec = (window as any).grecaptcha?.enterprise?.execute;
      return { hasGrecaptcha: !!(window as any).grecaptcha, stillHooked: !!exec?.__relistHooked };
    });
    console.error("SUBMIT_OTP_HOOK_DIAG:", JSON.stringify(hookDiag));

    await page.waitForSelector(codeSelector, { timeout: 15_000 });

    // TEMP DIAGNOSTIC — investigating a live failure where a manually-typed, correct code still
    // gets rejected. Checks whether Mercari's OTP form is actually a single field (our assumption)
    // or several per-digit boxes, which page.type() into the first matching selector alone
    // wouldn't fill correctly.
    const preTypeDiag = await page.evaluate((sel) => {
      const els = Array.from(document.querySelectorAll(sel)) as HTMLInputElement[];
      return {
        matchCount: els.length,
        elements: els.map((el) => ({
          name: el.name,
          maxLength: el.maxLength,
          value: el.value,
        })),
      };
    }, codeSelector);
    console.error("SUBMIT_OTP_PRE_TYPE_DIAG:", JSON.stringify(preTypeDiag));

    await page.type(codeSelector, code, { delay: 60 });

    const postTypeDiag = await page.evaluate((sel) => {
      const els = Array.from(document.querySelectorAll(sel)) as HTMLInputElement[];
      return els.map((el) => el.value);
    }, codeSelector);
    console.error("SUBMIT_OTP_POST_TYPE_DIAG:", JSON.stringify(postTypeDiag));

    // A successful click can trigger an immediate full-page redirect (confirmed live 2026-07-14:
    // "Execution context was destroyed, most likely because of a navigation" surfaced from here
    // once the click actually went through) — Puppeteer throws if the navigation destroys the JS
    // context before this evaluate() can serialize its return value. That's a sign of progress,
    // not a real failure, so swallow it rather than letting it crash the whole submitOtp call.
    let clickDiag: unknown = null;
    try {
      clickDiag = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll("button"));
        // Must require type="submit" AND text matching "verify" specifically — not the broader
        // continue|submit alternation. Confirmed live 2026-07-14: the OTP page still has the
        // login form's "Continue with Facebook"/"Continue with Apple" OAuth buttons and its "Log in"
        // submit button in the DOM alongside "Verify", so a looser match (either wrong type, or
        // text matching "continue") clicks one of those decoys instead — the code gets typed
        // correctly but never actually submitted.
        const submit = buttons.find(
          (b) =>
            b.getAttribute("type") === "submit" &&
            !b.hasAttribute("disabled") &&
            /verify/i.test(b.textContent ?? "")
        );
        const diag = {
          allButtons: buttons.map((b) => ({
            text: b.textContent?.trim().slice(0, 40),
            type: b.getAttribute("type"),
            disabled: b.hasAttribute("disabled"),
          })),
          clicked: submit?.textContent?.trim().slice(0, 40) ?? null,
        };
        submit?.click();
        return diag;
      });
    } catch (err) {
      if (!(err instanceof Error) || !/Execution context was destroyed/.test(err.message)) throw err;
      clickDiag = "<navigation started during click — context destroyed before diag could return>";
    }
    console.error("SUBMIT_OTP_CLICK_DIAG:", JSON.stringify(clickDiag));

    await page.waitForNetworkIdle({ idleTime: 1000, timeout: 30_000 }).catch(() => undefined);

    // Mercari's OTP "Verify" step fires its own grecaptcha.enterprise.execute call (see
    // SUBMIT_OTP_HOOK_DIAG above, confirmed our hook is still live for it), which bridges to a
    // CapSolver HTTP call on OUR server — traffic `waitForNetworkIdle` above can't see at all,
    // since it only watches requests the page itself makes. Confirmed live 2026-07-14: two runs
    // with a correctly-typed code and a correctly-clicked "Verify" button both came back with
    // apiDiag completely empty and the DOM totally unchanged — consistent with checking state
    // before Mercari's own client code had even gotten a token back to make its real verify call,
    // not with an actual rejection. Poll instead of checking once, and surface a CapSolver failure
    // distinctly from "wrong code" for the same reason startLogin does.
    let loggedIn = false;
    for (let attempt = 0; attempt < 40 && !loggedIn && !pending.captchaErrorRef.current; attempt++) {
      try {
        loggedIn = await page.evaluate(
          () =>
            document.querySelector('[data-testid="user-menu"], [href="/mypage/"], .UserName') !== null
        );
      } catch (err) {
        // Same navigation race as the click diag above — a redirect mid-flight destroys the
        // context this evaluate() was about to run in. Treat as "still settling" and retry next
        // iteration once the new document has loaded, instead of crashing the whole call.
        if (!(err instanceof Error) || !/Execution context was destroyed/.test(err.message)) throw err;
      }
      if (!loggedIn) await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    page.off("response", onResponse);
    console.error("SUBMIT_OTP_API_DIAG:", JSON.stringify(apiDiag));

    if (pending.captchaErrorRef.current) {
      const err = pending.captchaErrorRef.current;
      throw new CaptchaSolveFailedError(
        `CapSolver failed to solve Mercari's OTP-step reCAPTCHA Enterprise challenge: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }

    if (!loggedIn) {
      // TEMP DIAGNOSTIC — see the matching block above.
      const postSubmitDiag = await page.evaluate(() => ({
        url: location.href,
        title: document.title,
        bodyText: document.body?.innerText?.slice(0, 500) ?? "",
      }));
      console.error("SUBMIT_OTP_POST_SUBMIT_DIAG:", JSON.stringify(postSubmitDiag));

      // Leave the session in pendingLogins — Mercari's form allows retyping and the window
      // hasn't expired, so let the caller retry with a corrected code rather than forcing a
      // full restart via startLogin. The setTimeout in startLogin still reaps it eventually.
      throw new MercariLoginFailedError("Mercari rejected the verification code.");
    }

    const cookies = await page.browserContext().cookies();
    const profile = await page.evaluate(async () => {
      const res = await fetch("/v1/users/me", { credentials: "include" });
      return res.ok ? ((await res.json()) as { data?: { id?: string | number; name?: string } }) : null;
    });

    await this.upsertConnection(userId, {
      isActive: true,
      sessionCookies: JSON.stringify(cookies),
      accountId: profile?.data?.id != null ? String(profile.data.id) : undefined,
      accountName: profile?.data?.name ?? undefined,
    });

    clearPendingLogin(userId);
  }

  private async upsertConnection(
    userId: string,
    fields: {
      isActive?: boolean;
      sessionCookies?: string;
      accountId?: string;
      accountName?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<void> {
    await this.db.marketplaceConnection.upsert({
      where: { userId_marketplace: { userId, marketplace: this.marketplace } },
      // Prisma's generated Json input types don't structurally accept a plain
      // Record — same pattern as the existing metadata merge in routes/mercari.ts.
      update: fields as any,
      create: {
        userId,
        marketplace: this.marketplace,
        accessToken: "browserless-session", // auth lives in cookies, not a bearer token
        ...fields,
      } as any,
    });
  }
}

export { BrowserlessError };
