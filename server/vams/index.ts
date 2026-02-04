// Stub - VAMS (Visual Asset Management System) disabled
import { Router } from "express";

export default Router();
export const vamsRoutes = Router();

// Provider stubs
export class UnsplashProvider {}
export const unsplashProvider = new UnsplashProvider();
export class PexelsProvider {}
export const pexelsProvider = new PexelsProvider();
export class PixabayProvider {}
export const pixabayProvider = new PixabayProvider();
export const getAvailableProviders = () => [];
export const getProvider = () => null;
export const getProviderStatus = () => ({ enabled: false });

// Service stubs
export class VamsSearchService {}
export const vamsSearchService = new VamsSearchService();
export class VamsIngestionService {}
export const vamsIngestionService = new VamsIngestionService();
export class VamsGenerationService {}
export const vamsGenerationService = new VamsGenerationService();

// Hook stubs
export const enrichContentWithImages = async () => null;
export const getContentHeroImage = async () => null;
export const getContentCardImage = async () => null;
export const getContentGalleryImages = async () => [];
export const postGenerationImageHook = async () => null;
export const contentNeedsImages = () => false;
export const getContentImages = async () => [];

export type ContentImageOptions = Record<string, unknown>;
export type ContentImageResult = { url?: string };
