import { useQuery } from "@tanstack/react-query";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export interface LocalizedContent {
  id: string;
  contentId: string;
  locale: string;
  title: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  blocks: any[];
  answerCapsule: string | null;
  isFallback?: boolean;
  requestedLocale?: string;
}

export function useLocalizedContent(contentId: string | undefined) {
  const { locale } = useLocale();

  return useQuery<LocalizedContent | null>({
    queryKey: ["/api/content", contentId, "localized", locale],
    enabled: !!contentId,
  });
}

export interface LocalizedAsset {
  id: string;
  entityType: string;
  entityId: string;
  locale: string;
  usage: string;
  src: string;
  filename: string | null;
  alt: string | null;
  title: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  mimeType: string | null;
  fileSize: number | null;
  isOgImage: boolean;
  sortOrder: number;
  isFallback?: boolean;
  requestedLocale?: string;
}

export function useLocalizedAsset(
  entityType: string | undefined,
  entityId: string | undefined,
  usage: string = "hero"
) {
  const { locale } = useLocale();

  return useQuery<LocalizedAsset | null>({
    queryKey: ["/api/localized-assets", entityType, entityId, locale, usage],
    enabled: !!entityType && !!entityId,
  });
}

export function useLocalizedAssets(
  entityType: string | undefined,
  entityId: string | undefined
) {
  const { locale } = useLocale();

  return useQuery<LocalizedAsset[]>({
    queryKey: ["/api/localized-assets", entityType, entityId],
    enabled: !!entityType && !!entityId,
    select: (data: LocalizedAsset[]) => {
      const localizedAssets = data.filter(a => a.locale === locale);
      const englishAssets = data.filter(a => a.locale === "en");
      
      const result: LocalizedAsset[] = [];
      const seenUsages = new Set<string>();

      for (const asset of localizedAssets) {
        result.push(asset);
        seenUsages.add(asset.usage);
      }

      for (const asset of englishAssets) {
        if (!seenUsages.has(asset.usage)) {
          result.push({ ...asset, isFallback: true, requestedLocale: locale });
          seenUsages.add(asset.usage);
        }
      }

      return result.sort((a, b) => a.sortOrder - b.sortOrder);
    },
  });
}

export function useLocalizedGallery(
  entityType: string | undefined,
  entityId: string | undefined
) {
  const { locale } = useLocale();

  return useQuery<LocalizedAsset[]>({
    queryKey: ["/api/localized-assets", entityType, entityId, { locale, usage: "gallery" }],
    enabled: !!entityType && !!entityId,
    select: (data: LocalizedAsset[]) => {
      const galleryAssets = data.filter(a => a.usage === "gallery");
      const localizedGallery = galleryAssets.filter(a => a.locale === locale);
      
      if (localizedGallery.length > 0) {
        return localizedGallery.sort((a, b) => a.sortOrder - b.sortOrder);
      }

      return galleryAssets
        .filter(a => a.locale === "en")
        .map(a => ({ ...a, isFallback: true, requestedLocale: locale }))
        .sort((a, b) => a.sortOrder - b.sortOrder);
    },
  });
}
