import { describe, it, expect } from "vitest";
import { toHtml, toMarkdown, slugifyTitle } from "@/lib/export";
import { parseJsonLoose, markdownFallback } from "@/lib/json";

describe("export helpers", () => {
  it("builds markdown and HTML", () => {
    const md = toMarkdown("Hello", ["Para *bold* one.", "Para two."]);
    expect(md.startsWith("# Hello")).toBe(true);
    expect(md).not.toContain("*");

    const html = toHtml("Hello", ["Para *bold* one."]);
    expect(html).toContain("<h1>Hello</h1>");
    expect(html).toContain("<strong>bold</strong>");
  });

  it("slugifies titles", () => {
    expect(slugifyTitle("One Dashboard for MRR!")).toBe("one-dashboard-for-mrr");
  });
});

describe("parseJsonLoose", () => {
  it("repairs trailing commas and prose wrappers", () => {
    const raw = `Sure!\n{"markdown": "Hello world",}\n`;
    expect(parseJsonLoose<{ markdown: string }>(raw).markdown).toBe("Hello world");
  });

  it("falls back for plain markdown", () => {
    expect(markdownFallback("# Title\n\nA longer paragraph about the product.")).toContain(
      "# Title"
    );
  });
});
