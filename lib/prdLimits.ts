/** Shared PRD size limits for client + API. */
export const MIN_PRD_LENGTH = 20;
/** ~1.5–2k words — enough for a solid brief, not a 50-page dump. */
export const MAX_PRD_LENGTH = 8_000;
export const MAX_PDF_PAGES = 10;
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export function truncatePrd(text: string): {
  text: string;
  truncated: boolean;
  originalLength: number;
} {
  const originalLength = text.length;
  if (originalLength <= MAX_PRD_LENGTH) {
    return { text, truncated: false, originalLength };
  }
  return {
    text: text.slice(0, MAX_PRD_LENGTH),
    truncated: true,
    originalLength,
  };
}
