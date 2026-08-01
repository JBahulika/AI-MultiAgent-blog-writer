/** Escape raw control characters inside JSON string literals (LLMs often emit them). */
function sanitizeJsonControlChars(input: string): string {
  let out = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i]!;
    const code = ch.charCodeAt(0);

    if (inString) {
      if (escaped) {
        out += ch;
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        out += ch;
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = false;
        out += ch;
        continue;
      }
      if (code < 0x20) {
        if (ch === "\n") out += "\\n";
        else if (ch === "\r") out += "\\r";
        else if (ch === "\t") out += "\\t";
        else out += `\\u${code.toString(16).padStart(4, "0")}`;
        continue;
      }
      out += ch;
      continue;
    }

    if (ch === '"') inString = true;
    out += ch;
  }

  return out;
}

/** Fix trailing commas before } or ] which models often emit. */
function stripTrailingCommas(input: string): string {
  return input.replace(/,\s*([}\]])/g, "$1");
}

function tryParse<T>(text: string): T {
  const candidates = [text, sanitizeJsonControlChars(text), stripTrailingCommas(text), stripTrailingCommas(sanitizeJsonControlChars(text))];
  let lastErr: unknown;
  for (const c of candidates) {
    try {
      return JSON.parse(c) as T;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("JSON parse failed");
}

/** Extract and parse JSON from an LLM response, repairing common wrappers/control chars. */
export function parseJsonLoose<T = unknown>(raw: string): T {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("Failed to parse JSON from model response");

  try {
    return tryParse<T>(trimmed);
  } catch {
    /* continue */
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    try {
      return tryParse<T>(fenced[1].trim());
    } catch {
      /* continue */
    }
  }

  // Balanced-brace extract (handles leading prose)
  const start = trimmed.indexOf("{");
  if (start >= 0) {
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = start; i < trimmed.length; i++) {
      const ch = trimmed[i]!;
      if (inString) {
        if (escaped) {
          escaped = false;
          continue;
        }
        if (ch === "\\") {
          escaped = true;
          continue;
        }
        if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') {
        inString = true;
        continue;
      }
      if (ch === "{") depth += 1;
      else if (ch === "}") {
        depth -= 1;
        if (depth === 0) {
          try {
            return tryParse<T>(trimmed.slice(start, i + 1));
          } catch {
            break;
          }
        }
      }
    }
  }

  throw new Error("Failed to parse JSON from model response");
}

/** If the model returned plain markdown instead of JSON, use it as a draft. */
export function markdownFallback(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Looks like prose/markdown, not JSON
  if (trimmed.startsWith("{")) return null;
  const withoutFence = trimmed
    .replace(/^```(?:markdown|md)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  if (withoutFence.length < 40) return null;
  return withoutFence;
}
