/** Client-safe export helpers for blog markdown. */

export function toMarkdown(title: string, paragraphs: string[]): string {
  const body = paragraphs.join("\n\n").replace(/\*/g, "");
  return `# ${title}\n\n${body}`.trim();
}

export function toHtml(title: string, paragraphs: string[]): string {
  const escape = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const paras = paragraphs
    .map((p) => {
      const withBold = escape(p).replace(/\*(.*?)\*/g, "<strong>$1</strong>");
      return `<p>${withBold}</p>`;
    })
    .join("\n");

  return `<h1>${escape(title)}</h1>\n${paras}`;
}

/** Markdown optimized for pasting into Notion or Dev.to editors. */
export function toPasteFormat(title: string, paragraphs: string[]): string {
  return toMarkdown(title, paragraphs);
}

export function downloadMarkdown(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".md") ? filename : `${filename}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

export function slugifyTitle(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "blog-post"
  );
}
