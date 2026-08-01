import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type Bucket = { count: number; resetAt: number };

const memoryBuckets = new Map<string, Bucket>();

type LimitResult = { ok: true } | { ok: false; retryAfterSec: number };

let generateLimiter: Ratelimit | null = null;
let pdfLimiter: Ratelimit | null = null;
let upstashTried = false;

function getUpstashLimiters(): { generate: Ratelimit; pdf: Ratelimit } | null {
  if (upstashTried) {
    return generateLimiter && pdfLimiter
      ? { generate: generateLimiter, pdf: pdfLimiter }
      : null;
  }
  upstashTried = true;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const redis = new Redis({ url, token });
    generateLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "60 s"),
      prefix: "blog-generate",
    });
    pdfLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "60 s"),
      prefix: "blog-pdf",
    });
    return { generate: generateLimiter, pdf: pdfLimiter };
  } catch (err) {
    console.error("Upstash rate limit init failed:", err);
    return null;
  }
}

function memoryLimit(
  key: string,
  max: number,
  windowMs = 60_000
): LimitResult {
  const now = Date.now();
  const bucket = memoryBuckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (bucket.count >= max) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return { ok: true };
}

/**
 * Rate limit by key. Uses Upstash Redis when configured; otherwise in-memory
 * (best-effort per serverless instance — fine for local/dev).
 */
export async function checkRateLimit(
  key: string,
  kind: "generate" | "pdf" = "generate"
): Promise<LimitResult> {
  const limiters = getUpstashLimiters();
  if (limiters) {
    const limiter = kind === "pdf" ? limiters.pdf : limiters.generate;
    const result = await limiter.limit(key);
    if (result.success) return { ok: true };
    const retryAfterSec = Math.max(
      1,
      Math.ceil((result.reset - Date.now()) / 1000)
    );
    return { ok: false, retryAfterSec };
  }

  const max = kind === "pdf" ? 10 : 5;
  return memoryLimit(`${kind}:${key}`, max);
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip") || "unknown";
}
