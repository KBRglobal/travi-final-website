/**
 * Help Center - Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the repository
vi.mock('./help-repository', () => ({
  categorySlugExists: vi.fn(),
  articleSlugExists: vi.fn(),
  getCategoryById: vi.fn(),
  getArticleById: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  createArticle: vi.fn(),
  updateArticle: vi.fn(),
}));

// Mock the feature flag
vi.mock('./types', () => ({
  isHelpCenterEnabled: () => true,
}));

import * as repo from './help-repository';
import * as service from './help-service';

describe('Help Center Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createCategory', () => {
    it('throws error when slug already exists', async () => {
      vi.mocked(repo.categorySlugExists).mockResolvedValue(true);

      await expect(
        service.createCategory({ slug: 'existing-slug', title: 'Test' })
      ).rejects.toThrow('Category with slug "existing-slug" already exists');
    });

    it('creates category when slug is unique', async () => {
      vi.mocked(repo.categorySlugExists).mockResolvedValue(false);
      vi.mocked(repo.createCategory).mockResolvedValue({
        id: 'cat-1',
        slug: 'new-category',
        title: 'New Category',
        description: null,
        icon: null,
        locale: 'en',
        order: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createCategory({
        slug: 'new-category',
        title: 'New Category',
      });

      expect(result.slug).toBe('new-category');
      expect(repo.createCategory).toHaveBeenCalled();
    });

    it('normalizes slug format', async () => {
      vi.mocked(repo.categorySlugExists).mockResolvedValue(false);
      vi.mocked(repo.createCategory).mockImplementation(async (input) => ({
        id: 'cat-1',
        slug: input.slug,
        title: input.title,
        description: input.description || null,
        icon: input.icon || null,
        locale: input.locale || 'en',
        order: input.order || 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      await service.createCategory({
        slug: 'Test Slug With Spaces',
        title: 'Test',
      });

      expect(repo.createCategory).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: 'test-slug-with-spaces',
        })
      );
    });
  });

  describe('createArticle', () => {
    it('throws error when category does not exist', async () => {
      vi.mocked(repo.getCategoryById).mockResolvedValue(null);

      await expect(
        service.createArticle({
          categoryId: 'non-existent',
          slug: 'test',
          title: 'Test',
        })
      ).rejects.toThrow('Category not found');
    });

    it('throws error when slug already exists for locale', async () => {
      vi.mocked(repo.getCategoryById).mockResolvedValue({
        id: 'cat-1',
        slug: 'category',
        title: 'Category',
        description: null,
        icon: null,
        locale: 'en',
        order: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(repo.articleSlugExists).mockResolvedValue(true);

      await expect(
        service.createArticle({
          categoryId: 'cat-1',
          slug: 'existing-slug',
          title: 'Test',
          locale: 'en',
        })
      ).rejects.toThrow('Article with slug "existing-slug" already exists for locale "en"');
    });

    it('creates article when inputs are valid', async () => {
      vi.mocked(repo.getCategoryById).mockResolvedValue({
        id: 'cat-1',
        slug: 'category',
        title: 'Category',
        description: null,
        icon: null,
        locale: 'en',
        order: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(repo.articleSlugExists).mockResolvedValue(false);
      vi.mocked(repo.createArticle).mockResolvedValue({
        id: 'art-1',
        categoryId: 'cat-1',
        slug: 'new-article',
        title: 'New Article',
        summary: null,
        blocks: [],
        metaTitle: null,
        metaDescription: null,
        locale: 'en',
        status: 'draft',
        order: 0,
        viewCount: 0,
        authorId: null,
        publishedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createArticle({
        categoryId: 'cat-1',
        slug: 'new-article',
        title: 'New Article',
      });

      expect(result.slug).toBe('new-article');
      expect(result.status).toBe('draft');
    });
  });

  describe('publishArticle / unpublishArticle', () => {
    it('publishes a draft article', async () => {
      vi.mocked(repo.getArticleById).mockResolvedValue({
        id: 'art-1',
        categoryId: 'cat-1',
        slug: 'article',
        title: 'Article',
        summary: null,
        blocks: [],
        metaTitle: null,
        metaDescription: null,
        locale: 'en',
        status: 'draft',
        order: 0,
        viewCount: 0,
        authorId: null,
        publishedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(repo.updateArticle).mockResolvedValue({
        id: 'art-1',
        categoryId: 'cat-1',
        slug: 'article',
        title: 'Article',
        summary: null,
        blocks: [],
        metaTitle: null,
        metaDescription: null,
        locale: 'en',
        status: 'published',
        order: 0,
        viewCount: 0,
        authorId: null,
        publishedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.publishArticle('art-1');

      expect(result.status).toBe('published');
      expect(repo.updateArticle).toHaveBeenCalledWith(
        'art-1',
        expect.objectContaining({ status: 'published' })
      );
    });

    it('unpublishes a published article', async () => {
      vi.mocked(repo.getArticleById).mockResolvedValue({
        id: 'art-1',
        categoryId: 'cat-1',
        slug: 'article',
        title: 'Article',
        summary: null,
        blocks: [],
        metaTitle: null,
        metaDescription: null,
        locale: 'en',
        status: 'published',
        order: 0,
        viewCount: 0,
        authorId: null,
        publishedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(repo.updateArticle).mockResolvedValue({
        id: 'art-1',
        categoryId: 'cat-1',
        slug: 'article',
        title: 'Article',
        summary: null,
        blocks: [],
        metaTitle: null,
        metaDescription: null,
        locale: 'en',
        status: 'draft',
        order: 0,
        viewCount: 0,
        authorId: null,
        publishedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.unpublishArticle('art-1');

      expect(result.status).toBe('draft');
      expect(repo.updateArticle).toHaveBeenCalledWith(
        'art-1',
        expect.objectContaining({ status: 'draft' })
      );
    });
  });

  describe('slug uniqueness during updates', () => {
    it('allows updating article with same slug', async () => {
      vi.mocked(repo.getArticleById).mockResolvedValue({
        id: 'art-1',
        categoryId: 'cat-1',
        slug: 'existing-slug',
        title: 'Article',
        summary: null,
        blocks: [],
        metaTitle: null,
        metaDescription: null,
        locale: 'en',
        status: 'draft',
        order: 0,
        viewCount: 0,
        authorId: null,
        publishedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(repo.updateArticle).mockResolvedValue({
        id: 'art-1',
        categoryId: 'cat-1',
        slug: 'existing-slug',
        title: 'Updated Title',
        summary: null,
        blocks: [],
        metaTitle: null,
        metaDescription: null,
        locale: 'en',
        status: 'draft',
        order: 0,
        viewCount: 0,
        authorId: null,
        publishedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Should not throw when keeping the same slug
      const result = await service.updateArticle('art-1', {
        title: 'Updated Title',
        slug: 'existing-slug', // Same slug
      });

      expect(result.title).toBe('Updated Title');
      // articleSlugExists should not be called when slug hasn't changed
      expect(repo.articleSlugExists).not.toHaveBeenCalled();
    });

    it('checks uniqueness when changing slug', async () => {
      vi.mocked(repo.getArticleById).mockResolvedValue({
        id: 'art-1',
        categoryId: 'cat-1',
        slug: 'old-slug',
        title: 'Article',
        summary: null,
        blocks: [],
        metaTitle: null,
        metaDescription: null,
        locale: 'en',
        status: 'draft',
        order: 0,
        viewCount: 0,
        authorId: null,
        publishedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(repo.articleSlugExists).mockResolvedValue(true);

      await expect(
        service.updateArticle('art-1', { slug: 'new-slug' })
      ).rejects.toThrow('Article with slug "new-slug" already exists');
    });
  });
});
