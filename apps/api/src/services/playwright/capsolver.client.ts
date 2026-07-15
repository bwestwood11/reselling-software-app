// Thin REST client for CapSolver's task-based API (https://docs.capsolver.com) — used to solve
// Mercari's score-based, invisible reCAPTCHA Enterprise challenge during credential login. See
// `mercari-browserless.service.ts` for why this is needed: an automated Browserless session gets
// a low-trust score from Google's risk assessment, and Mercari's backend silently rejects the
// login (generic "Email address or password not valid", no visible CAPTCHA popup) rather than
// surfacing an interactive challenge we could detect and react to.

const BASE_URL = "https://api.capsolver.com";
const DEFAULT_TIMEOUT_MS = 120_000; // Enterprise solves are slower/more variable than standard v2.
const POLL_INTERVAL_MS = 2_000;

export class CapsolverError extends Error {
  constructor(
    message: string,
    public readonly errorCode?: string
  ) {
    super(message);
    this.name = "CapsolverError";
  }
}

function apiKey(): string {
  const key = process.env.CAPSOLVER_API_KEY;
  if (!key) throw new CapsolverError("CAPSOLVER_API_KEY is not set");
  return key;
}

/** Throws `CapsolverError` immediately if unconfigured — call before spending a Browserless session. */
export function assertCapsolverConfigured(): void {
  apiKey();
}

interface CapsolverTaskResponse {
  errorId: number;
  errorCode?: string;
  errorDescription?: string;
  taskId?: string;
}

interface CapsolverResultResponse {
  errorId: number;
  errorCode?: string;
  errorDescription?: string;
  status?: "processing" | "ready" | "failed";
  solution?: { gRecaptchaResponse: string };
}

export interface SolveRecaptchaEnterpriseV3Params {
  websiteURL: string;
  websiteKey: string;
  pageAction: string;
  /** Floor, not a fixed wait — polling stops as soon as the task is ready. Default 120s. */
  timeoutMs?: number;
}

/**
 * Solves a reCAPTCHA Enterprise v3-style (score-based, invisible — no checkbox) challenge and
 * returns the `g-recaptcha-response` token. Callers substitute this for the real
 * `grecaptcha.enterprise.execute()` call so the resulting token carries a legitimate high-trust
 * score instead of whatever score an automated browser session would earn on its own.
 */
export async function solveRecaptchaEnterpriseV3({
  websiteURL,
  websiteKey,
  pageAction,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: SolveRecaptchaEnterpriseV3Params): Promise<string> {
  const clientKey = apiKey();

  const createRes = await fetch(`${BASE_URL}/createTask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientKey,
      task: {
        type: "ReCaptchaV3EnterpriseTaskProxyLess",
        websiteURL,
        websiteKey,
        pageAction,
      },
    }),
    signal: AbortSignal.timeout(20_000),
  });
  const created = (await createRes.json()) as CapsolverTaskResponse;

  if (created.errorId !== 0 || !created.taskId) {
    throw new CapsolverError(
      `CapSolver createTask failed: ${created.errorDescription ?? "unknown error"}`,
      created.errorCode
    );
  }

  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

    const resultRes = await fetch(`${BASE_URL}/getTaskResult`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientKey, taskId: created.taskId }),
      signal: AbortSignal.timeout(20_000),
    });
    const result = (await resultRes.json()) as CapsolverResultResponse;

    if (result.errorId !== 0) {
      throw new CapsolverError(
        `CapSolver getTaskResult failed: ${result.errorDescription ?? "unknown error"}`,
        result.errorCode
      );
    }

    if (result.status === "failed") {
      throw new CapsolverError(
        `CapSolver task failed to solve: ${result.errorDescription ?? "unknown reason"}`,
        result.errorCode
      );
    }

    if (result.status === "ready" && result.solution) {
      return result.solution.gRecaptchaResponse;
    }
  }

  throw new CapsolverError(`CapSolver task timed out after ${timeoutMs}ms`);
}
