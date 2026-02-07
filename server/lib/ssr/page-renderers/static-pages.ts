/**
 * Static Pages Renderer (about, contact, privacy)
 */

import { generateMetaTags, generateStructuredData, getCanonicalUrl } from "../../meta-tags";
import { SITE_NAME } from "../constants";
import type { SSRRenderOptions, SSRRenderResult } from "../types";
import { wrapInHtml, renderFooter } from "../html-builder";
import { render404 } from "./error-pages";

/**
 * Render static pages (about, contact, privacy)
 */
export async function renderStaticPage(
  page: string,
  options: SSRRenderOptions
): Promise<SSRRenderResult> {
  const { locale = "en" } = options;

  const pages: Record<string, { title: string; description: string; content: string }> = {
    about: {
      title: "About TRAVI",
      description:
        "Learn about TRAVI, your trusted source for expert travel guides, honest reviews, and insider tips for destinations worldwide.",
      content: `
        <h1>About TRAVI</h1>
        <p>TRAVI is your trusted companion for travel discovery. Our team of travel experts and local insiders provides comprehensive guides to help you explore destinations worldwide.</p>
        <h2>Our Mission</h2>
        <p>We believe travel should be accessible, informed, and authentic. Our mission is to provide accurate, up-to-date information that helps travelers make confident decisions.</p>
        <h2>What We Offer</h2>
        <ul>
          <li>Expert hotel reviews with honest assessments</li>
          <li>Comprehensive attraction guides with visitor tips</li>
          <li>Restaurant recommendations from local food experts</li>
          <li>Transportation guides for navigating new cities</li>
          <li>Cultural insights and travel tips</li>
        </ul>
        <h2>Contact Us</h2>
        <p>Have questions or suggestions? We'd love to hear from you. Visit our <a href="${getCanonicalUrl("/contact", locale)}">contact page</a>.</p>
      `,
    },
    contact: {
      title: "Contact TRAVI",
      description:
        "Get in touch with the TRAVI team. We welcome your questions, feedback, and partnership inquiries.",
      content: `
        <h1>Contact Us</h1>
        <p>We're here to help! Whether you have questions about our content, partnership opportunities, or feedback to share, we'd love to hear from you.</p>
        <h2>General Inquiries</h2>
        <p>For general questions about TRAVI, our content, or travel recommendations, please email us at hello@travi.world.</p>
        <h2>Partnerships</h2>
        <p>Interested in partnering with TRAVI? Hotels, attractions, and tourism boards can reach our partnerships team at partners@travi.world.</p>
        <h2>Press</h2>
        <p>Media inquiries can be directed to press@travi.world.</p>
      `,
    },
    privacy: {
      title: "Privacy Policy",
      description:
        "Read TRAVI's privacy policy to understand how we collect, use, and protect your personal information.",
      content: `
        <h1>Privacy Policy</h1>
        <p>Last updated: December 2025</p>
        <p>At TRAVI, we are committed to protecting your privacy. This policy explains how we collect, use, and safeguard your information.</p>
        <h2>Information We Collect</h2>
        <p>We collect information you provide directly, such as when you subscribe to our newsletter or contact us. We also collect usage data through cookies and analytics.</p>
        <h2>How We Use Your Information</h2>
        <ul>
          <li>To provide and improve our services</li>
          <li>To send newsletters and updates (with your consent)</li>
          <li>To analyze usage patterns and improve our content</li>
          <li>To respond to your inquiries</li>
        </ul>
        <h2>Your Rights</h2>
        <p>You have the right to access, correct, or delete your personal data. Contact us at privacy@travi.world for any privacy-related requests.</p>
      `,
    },
  };

  const pageData = pages[page];
  if (!pageData) {
    return render404(options);
  }

  const metaTags = generateMetaTags({
    title: `${pageData.title} | ${SITE_NAME}`,
    description: pageData.description,
    url: getCanonicalUrl(`/${page}`, locale),
    type: "website",
    locale,
  });

  const structuredData = generateStructuredData({
    type: "BreadcrumbList",
    breadcrumbs: [
      { name: "Home", url: getCanonicalUrl("/", locale) },
      { name: pageData.title, url: getCanonicalUrl(`/${page}`, locale) },
    ],
  });

  const html = wrapInHtml({
    metaTags,
    structuredData,
    locale,
    content: `
      <header>
        <nav aria-label="Main navigation">
          <a href="${getCanonicalUrl("/", locale)}">${SITE_NAME}</a>
        </nav>
        <nav aria-label="Breadcrumb">
          <ol>
            <li><a href="${getCanonicalUrl("/", locale)}">Home</a></li>
            <li aria-current="page">${pageData.title}</li>
          </ol>
        </nav>
      </header>

      <main>
        <article>
          ${pageData.content}
        </article>
      </main>

      ${renderFooter(locale)}
    `,
  });

  return { html, status: 200 };
}
