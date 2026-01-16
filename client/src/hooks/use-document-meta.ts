import { useEffect } from "react";

interface DocumentMetaOptions {
  title: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  canonicalUrl?: string;
}

export function useDocumentMeta(options: DocumentMetaOptions) {
  useEffect(() => {
    const { title, description, ogTitle, ogDescription, ogImage, ogType, canonicalUrl } = options;
    
    document.title = title;

    const updateMeta = (name: string, content: string | undefined, property = false) => {
      if (!content) return;
      const attr = property ? "property" : "name";
      let meta = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute(attr, name);
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    const updateLink = (rel: string, href: string | undefined) => {
      if (!href) return;
      let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;
      if (!link) {
        link = document.createElement("link");
        link.rel = rel;
        document.head.appendChild(link);
      }
      link.href = href;
    };

    updateMeta("description", description);
    updateMeta("og:title", ogTitle || title, true);
    updateMeta("og:description", ogDescription || description, true);
    updateMeta("og:type", ogType || "website", true);
    updateMeta("og:url", canonicalUrl, true);
    updateMeta("twitter:title", ogTitle || title, true);
    updateMeta("twitter:description", ogDescription || description, true);
    if (ogImage) {
      updateMeta("og:image", ogImage, true);
      updateMeta("twitter:image", ogImage, true);
    }
    updateLink("canonical", canonicalUrl);

    return () => {};
  }, [options.title, options.description, options.ogTitle, options.ogDescription, options.ogImage, options.ogType, options.canonicalUrl]);
}
