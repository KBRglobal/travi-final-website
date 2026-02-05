/**
 * Error Pages Renderer
 */

import { generateMetaTags, getCanonicalUrl } from "../../meta-tags";
import { SITE_NAME } from "../constants";
import type { SSRRenderOptions, SSRRenderResult } from "../types";
import { wrapInHtml, renderFooter } from "../html-builder";

/**
 * Render 404 page
 */
export async function render404(options: SSRRenderOptions): Promise<SSRRenderResult> {
  const { locale = "en" } = options;

  const metaTags = generateMetaTags({
    title: "Page Not Found | TRAVI",
    description:
      "The page you're looking for could not be found. Explore our travel guides and recommendations.",
    url: getCanonicalUrl("/404", locale),
    type: "website",
    locale,
  });

  const html = wrapInHtml({
    metaTags,
    structuredData: "",
    locale,
    content: `
      <header>
        <nav aria-label="Main navigation">
          <a href="${getCanonicalUrl("/", locale)}">${SITE_NAME}</a>
        </nav>
      </header>

      <main>
        <section>
          <h1>Page Not Found</h1>
          <p>Sorry, the page you're looking for doesn't exist or has been moved.</p>
          <p><a href="${getCanonicalUrl("/", locale)}">Return to homepage</a></p>
        </section>
      </main>

      ${renderFooter(locale)}
    `,
  });

  return { html, status: 404 };
}
