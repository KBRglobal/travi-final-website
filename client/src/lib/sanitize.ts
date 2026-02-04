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
    "iframe",
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
    "allow",
    "allowfullscreen",
    "frameborder",
    "scrolling",
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
