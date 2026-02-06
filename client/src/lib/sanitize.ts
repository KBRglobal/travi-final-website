import DOMPurify from "dompurify";

/**
 * DOMPurify configuration for HTML sanitization
 * Prevents XSS attacks while allowing safe HTML elements
 */
const defaultConfig = {
  ALLOWED_TAGS: [
    "p",
    "br",
    "strong",
    "em",
    "u",
    "s",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "ul",
    "ol",
    "li",
    "a",
    "img",
    "blockquote",
    "pre",
    "code",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "div",
    "span",
    "figure",
    "figcaption",
  ],
  ALLOWED_ATTR: [
    "href",
    "src",
    "alt",
    "title",
    "class",
    "id",
    "target",
    "rel",
    "width",
    "height",
    "style",
    "data-*",
    "loading",
  ],
  ALLOW_DATA_ATTR: true,
  ADD_ATTR: ["target"],
  FORBID_TAGS: ["script", "style", "form", "input", "button", "textarea", "select"],
  FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur"],
};

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHTML(dirty: string): string {
  if (!dirty) return "";
  return DOMPurify.sanitize(dirty, defaultConfig);
}

/**
 * Trusted embed domains for iframe allowlist
 */
const TRUSTED_EMBED_DOMAINS = [
  "www.youtube.com",
  "youtube.com",
  "www.youtube-nocookie.com",
  "player.vimeo.com",
  "www.google.com",
  "maps.google.com",
];

/**
 * Sanitize HTML content allowing iframes only from trusted embed domains.
 * Use this for content sections that legitimately need video/map embeds.
 */
export function sanitizeWithEmbeds(dirty: string): string {
  if (!dirty) return "";

  const clean = DOMPurify.sanitize(dirty, {
    ...defaultConfig,
    ALLOWED_TAGS: [...defaultConfig.ALLOWED_TAGS, "iframe"],
    ALLOWED_ATTR: [
      ...defaultConfig.ALLOWED_ATTR,
      "allow",
      "allowfullscreen",
      "frameborder",
      "scrolling",
    ],
  });

  const container = document.createElement("div");
  container.innerHTML = clean;
  container.querySelectorAll("iframe").forEach(iframe => {
    try {
      const url = new URL(iframe.src);
      if (!TRUSTED_EMBED_DOMAINS.includes(url.hostname)) {
        iframe.remove();
      }
    } catch {
      iframe.remove();
    }
  });

  return container.innerHTML;
}
