/**
 * Map internal / provider errors to safe, user-facing copy.
 * Always log the original error server-side; never forward raw provider text to clients.
 */

const SAFE_GENERIC =
  "Something went wrong while generating your blog. Please try again in a moment.";

const SAFE_QUOTA =
  "The writing service is temporarily unavailable (quota exceeded). Please try again later.";

const SAFE_AUTH =
  "The writing service isn’t configured correctly. Please try again later.";

const SAFE_RATE =
  "Too many requests. Please wait a minute and try again.";

const SAFE_TIMEOUT =
  "Generation took too long and was stopped. Try a shorter PRD or try again.";

export function toPublicErrorMessage(err: unknown): string {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : typeof err === "object" &&
            err !== null &&
            "message" in err &&
            typeof (err as { message: unknown }).message === "string"
          ? (err as { message: string }).message
          : "";

  const lower = raw.toLowerCase();

  if (
    /insufficient.?quota|no credits remaining|billing|payment.?required|exceeded.?your.?current.?quota|credit balance|llm_quota/i.test(
      lower
    )
  ) {
    return SAFE_QUOTA;
  }

  if (
    /llm_auth|incorrect api key|invalid api key|invalid_api_key|authentication|unauthorized|401/.test(
      lower
    )
  ) {
    return SAFE_AUTH;
  }

  if (/429|rate limit|too many requests/.test(lower)) {
    return SAFE_RATE;
  }

  if (/timeout|timed out|deadline|maxduration|econnreset|function.?invocation.?timeout/i.test(lower)) {
    return SAFE_TIMEOUT;
  }

  if (/llm_model|model.?not.?found|decommissioned/.test(lower)) {
    return "The writing model is temporarily unavailable. Please try again later.";
  }

  if (/failed to parse json|researcher returned no bullets|writer returned empty|polisher returned empty|reviser returned empty/i.test(lower)) {
    return "The AI returned an unexpected response. Please try generating again.";
  }

  if (/tavily/.test(lower)) {
    return "Web research failed temporarily. Please try again in a moment.";
  }

  if (/missing groq_api_key|missing openai|missing.*api.?key/.test(lower)) {
    return SAFE_AUTH;
  }

  if (/llm_error/.test(lower)) {
    return "The writing service had a temporary problem. Please try again in a moment.";
  }

  // Already-safe app messages we intentionally return to clients
  if (
    /prd is too (short|long)|please provide|too many requests|forbidden|unauthorized|invalid json|could not read|no text found|file is too large|unsupported file|pdf has \d+ pages/i.test(
      raw
    )
  ) {
    return raw;
  }

  return SAFE_GENERIC;
}

export const PUBLIC_PIPELINE_FAILED = SAFE_GENERIC;
