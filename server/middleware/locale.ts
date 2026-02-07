import type { Request, Response, NextFunction } from "express";
import { SUPPORTED_LOCALES, RTL_LOCALES, type Locale } from "@shared/schema";

const LOCALE_CODES = SUPPORTED_LOCALES.map(l => l.code);

declare global {
  namespace Express {
    interface Request {
      locale: Locale;
      isRTL: boolean;
    }
  }
}

export function extractLocaleFromPath(path: string): { locale: Locale; pathWithoutLocale: string } {
  const segments = path.split("/").filter(Boolean);
  const firstSegment = segments[0]?.toLowerCase();

  if (firstSegment && LOCALE_CODES.includes(firstSegment as Locale)) {
    return {
      locale: firstSegment as Locale,
      pathWithoutLocale: "/" + segments.slice(1).join("/") || "/",
    };
  }

  return { locale: "en", pathWithoutLocale: path };
}

export function isValidLocale(code: string): code is Locale {
  return LOCALE_CODES.includes(code as Locale);
}

export function localeMiddleware(req: Request, res: Response, next: NextFunction) {
  const { locale } = extractLocaleFromPath(req.path);

  req.locale = locale;
  req.isRTL = RTL_LOCALES.includes(locale);

  res.setHeader("Content-Language", locale);
  res.setHeader("Vary", "Accept-Language");

  next();
}

export function getLocaleFromQuery(req: Request): Locale {
  const queryLocale = req.query.locale as string | undefined;
  if (queryLocale && isValidLocale(queryLocale)) {
    return queryLocale;
  }
  return req.locale || "en";
}

export function requireValidLocale(req: Request, res: Response, next: NextFunction) {
  const firstSegment = req.path
    .split("/")
    .find(s => s.length > 0)
    ?.toLowerCase();

  if (firstSegment?.length === 2 && !isValidLocale(firstSegment)) {
    return res.status(404).json({
      error: "Invalid locale",
      message: `Locale '${firstSegment}' is not supported`,
      supportedLocales: LOCALE_CODES,
    });
  }

  next();
}

export { LOCALE_CODES };
