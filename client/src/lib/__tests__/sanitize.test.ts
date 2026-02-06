/**
 * Tests for HTML Sanitization (XSS Prevention)
 *
 * Tests sanitizeHTML() and sanitizeWithEmbeds() to ensure
 * XSS vectors are stripped while safe content is preserved.
 */

import { describe, it, expect } from "vitest";
import { sanitizeHTML, sanitizeWithEmbeds } from "../sanitize";

describe("sanitizeHTML", () => {
  describe("allows safe HTML tags", () => {
    it("preserves paragraph tags", () => {
      const input = "<p>Hello World</p>";
      expect(sanitizeHTML(input)).toBe("<p>Hello World</p>");
    });

    it("preserves formatting tags (strong, em, u, s)", () => {
      const input = "<strong>bold</strong> <em>italic</em> <u>underline</u> <s>strike</s>";
      const result = sanitizeHTML(input);
      expect(result).toContain("<strong>bold</strong>");
      expect(result).toContain("<em>italic</em>");
      expect(result).toContain("<u>underline</u>");
      expect(result).toContain("<s>strike</s>");
    });

    it("preserves heading tags (h1-h6)", () => {
      const input = "<h1>Title</h1><h2>Subtitle</h2><h3>Section</h3>";
      const result = sanitizeHTML(input);
      expect(result).toContain("<h1>Title</h1>");
      expect(result).toContain("<h2>Subtitle</h2>");
      expect(result).toContain("<h3>Section</h3>");
    });

    it("preserves list tags (ul, ol, li)", () => {
      const input = "<ul><li>Item 1</li><li>Item 2</li></ul>";
      expect(sanitizeHTML(input)).toContain("<ul><li>Item 1</li>");
    });

    it("preserves anchor tags with href", () => {
      const input = '<a href="https://example.com" target="_blank">Link</a>';
      const result = sanitizeHTML(input);
      expect(result).toContain("href=");
      expect(result).toContain("Link</a>");
    });

    it("preserves img tags with src and alt", () => {
      const input = '<img src="https://example.com/img.jpg" alt="Description">';
      const result = sanitizeHTML(input);
      expect(result).toContain("src=");
      expect(result).toContain("alt=");
    });

    it("preserves table tags", () => {
      const input =
        "<table><thead><tr><th>Header</th></tr></thead><tbody><tr><td>Cell</td></tr></tbody></table>";
      const result = sanitizeHTML(input);
      expect(result).toContain("<table>");
      expect(result).toContain("<th>Header</th>");
      expect(result).toContain("<td>Cell</td>");
    });
  });

  describe("strips XSS vectors", () => {
    it("removes script tags", () => {
      const input = '<script>alert("xss")</script><p>Safe</p>';
      const result = sanitizeHTML(input);
      expect(result).not.toContain("<script");
      expect(result).not.toContain("alert");
      expect(result).toContain("<p>Safe</p>");
    });

    it("removes onclick event handlers", () => {
      const input = '<p onclick="alert(1)">Click me</p>';
      const result = sanitizeHTML(input);
      expect(result).not.toContain("onclick");
      expect(result).toContain("<p>Click me</p>");
    });

    it("removes onerror event handlers", () => {
      const input = '<img src="x" onerror="alert(1)">';
      const result = sanitizeHTML(input);
      expect(result).not.toContain("onerror");
    });

    it("removes onload event handlers", () => {
      const input = '<img src="x" onload="alert(1)">';
      const result = sanitizeHTML(input);
      expect(result).not.toContain("onload");
    });

    it("removes onmouseover event handlers", () => {
      const input = '<div onmouseover="alert(1)">Hover</div>';
      const result = sanitizeHTML(input);
      expect(result).not.toContain("onmouseover");
    });

    it("removes javascript: URIs from href", () => {
      const input = '<a href="javascript:alert(1)">Click</a>';
      const result = sanitizeHTML(input);
      expect(result).not.toContain("javascript:");
    });

    it("removes style tags", () => {
      const input = "<style>body { background: red; }</style><p>Content</p>";
      const result = sanitizeHTML(input);
      expect(result).not.toContain("<style");
      expect(result).toContain("<p>Content</p>");
    });

    it("removes form tags", () => {
      const input = '<form action="/steal"><p>Content</p></form>';
      const result = sanitizeHTML(input);
      expect(result).not.toContain("<form");
      // Content inside may be preserved, but form wrapper is stripped
    });

    it("removes iframe tags (in basic sanitize)", () => {
      const input = '<iframe src="https://evil.com"></iframe>';
      const result = sanitizeHTML(input);
      expect(result).not.toContain("<iframe");
    });
  });

  describe("edge cases", () => {
    it("returns empty string for empty input", () => {
      expect(sanitizeHTML("")).toBe("");
    });

    it("returns empty string for null-like input", () => {
      expect(sanitizeHTML(null as any)).toBe("");
      expect(sanitizeHTML(undefined as any)).toBe("");
    });

    it("handles plain text without tags", () => {
      expect(sanitizeHTML("Hello World")).toBe("Hello World");
    });

    it("handles nested malicious content", () => {
      const input = '<div><p><script>alert("deep")</script>Safe text</p></div>';
      const result = sanitizeHTML(input);
      expect(result).not.toContain("<script");
      expect(result).toContain("Safe text");
    });
  });
});

describe("sanitizeWithEmbeds", () => {
  it("returns empty string for empty input", () => {
    expect(sanitizeWithEmbeds("")).toBe("");
  });

  it("allows YouTube iframes", () => {
    const input = '<iframe src="https://www.youtube.com/embed/abc123"></iframe>';
    const result = sanitizeWithEmbeds(input);
    expect(result).toContain("<iframe");
    expect(result).toContain("youtube.com");
  });

  it("allows YouTube nocookie iframes", () => {
    const input = '<iframe src="https://www.youtube-nocookie.com/embed/abc123"></iframe>';
    const result = sanitizeWithEmbeds(input);
    expect(result).toContain("<iframe");
  });

  it("allows Vimeo iframes", () => {
    const input = '<iframe src="https://player.vimeo.com/video/123456"></iframe>';
    const result = sanitizeWithEmbeds(input);
    expect(result).toContain("<iframe");
    expect(result).toContain("vimeo.com");
  });

  it("allows Google Maps iframes", () => {
    const input = '<iframe src="https://maps.google.com/maps?q=dubai"></iframe>';
    const result = sanitizeWithEmbeds(input);
    expect(result).toContain("<iframe");
    expect(result).toContain("maps.google.com");
  });

  it("removes iframes from untrusted domains", () => {
    const input = '<iframe src="https://evil.com/payload"></iframe>';
    const result = sanitizeWithEmbeds(input);
    expect(result).not.toContain("<iframe");
    expect(result).not.toContain("evil.com");
  });

  it("removes iframes with invalid URLs", () => {
    const input = '<iframe src="not-a-valid-url"></iframe>';
    const result = sanitizeWithEmbeds(input);
    expect(result).not.toContain("<iframe");
  });

  it("still strips script tags even with embeds mode", () => {
    const input =
      '<script>alert("xss")</script><iframe src="https://www.youtube.com/embed/abc"></iframe>';
    const result = sanitizeWithEmbeds(input);
    expect(result).not.toContain("<script");
    expect(result).toContain("<iframe");
  });

  it("preserves safe HTML alongside embeds", () => {
    const input = '<p>Watch this:</p><iframe src="https://www.youtube.com/embed/abc"></iframe>';
    const result = sanitizeWithEmbeds(input);
    expect(result).toContain("<p>Watch this:</p>");
    expect(result).toContain("<iframe");
  });
});
