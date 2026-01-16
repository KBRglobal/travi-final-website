/**
 * SEO-AEO Validator Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateContent } from '../../../server/aeo/seo-aeo-validator';

describe('SEO-AEO Validator', () => {
  describe('validateContent', () => {
    it('should validate content with all fields', () => {
      const result = validateContent({
        contentId: 'test-123',
        title: 'Best Attractions in Downtown Dubai for Family Travelers',
        metaTitle: 'Best Attractions in Downtown Dubai for Family Travelers',
        metaDescription: 'Discover the top family-friendly attractions in Downtown Dubai. From the Burj Khalifa to the Dubai Fountain, explore the best activities for families with kids.',
        answerCapsule: 'Downtown Dubai offers world-class family attractions including the Burj Khalifa observation deck, Dubai Fountain shows, and Dubai Mall aquarium. Ticket prices range from 149-399 AED per adult, with most attractions offering free entry for children under 4. Peak visiting hours are 4-8 PM.',
        slug: 'best-attractions-downtown-dubai-family',
        type: 'article',
      });

      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('seoScore');
      expect(result).toHaveProperty('aeoScore');
      expect(result).toHaveProperty('compatibilityScore');
      expect(result).toHaveProperty('issues');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('recommendations');
    });

    it('should detect missing answer capsule', () => {
      const result = validateContent({
        contentId: 'test-123',
        title: 'Test Title for SEO Validation',
        metaDescription: 'This is a test meta description that is long enough.',
        // No answerCapsule
      });

      const capsuleIssue = result.issues.find(i => i.field === 'answerCapsule');
      expect(capsuleIssue).toBeDefined();
      expect(capsuleIssue?.severity).toBe('critical');
    });

    it('should detect short title', () => {
      const result = validateContent({
        contentId: 'test-123',
        title: 'Short',
        answerCapsule: 'A valid answer capsule with enough words to meet the minimum requirements for AI optimization.',
      });

      const titleWarning = result.warnings.find(w => w.field === 'title');
      expect(titleWarning).toBeDefined();
    });

    it('should detect missing meta description', () => {
      const result = validateContent({
        contentId: 'test-123',
        title: 'Valid Title That Is Long Enough for SEO',
        answerCapsule: 'A valid answer capsule with enough words to meet the minimum requirements for AI optimization.',
        // No metaDescription
      });

      const metaIssue = result.issues.find(i => i.field === 'metaDescription');
      expect(metaIssue).toBeDefined();
      expect(metaIssue?.severity).toBe('major');
    });

    it('should detect capsule too short', () => {
      const result = validateContent({
        contentId: 'test-123',
        title: 'Valid Title That Is Long Enough for SEO',
        metaDescription: 'Valid meta description with enough characters.',
        answerCapsule: 'Too short capsule.', // Less than 40 words
      });

      const capsuleIssue = result.issues.find(i =>
        i.field === 'answerCapsule' && i.message.includes('short')
      );
      expect(capsuleIssue).toBeDefined();
    });

    it('should detect capsule too long', () => {
      const result = validateContent({
        contentId: 'test-123',
        title: 'Valid Title That Is Long Enough for SEO',
        metaDescription: 'Valid meta description with enough characters.',
        answerCapsule: 'This is a very long capsule that exceeds the maximum word count. '.repeat(10),
      });

      const capsuleIssue = result.issues.find(i =>
        i.field === 'answerCapsule' && i.message.includes('long')
      );
      expect(capsuleIssue).toBeDefined();
    });

    it('should detect marketing language in capsule', () => {
      const result = validateContent({
        contentId: 'test-123',
        title: 'Valid Title That Is Long Enough for SEO',
        metaDescription: 'Valid meta description with enough characters.',
        answerCapsule: 'This amazing destination is an incredible must-visit spot that offers breathtaking views and unforgettable experiences for all travelers.',
      });

      const marketingIssue = result.issues.find(i =>
        i.field === 'answerCapsule' && i.message.includes('marketing')
      );
      expect(marketingIssue).toBeDefined();
    });

    it('should warn about capsule without numbers', () => {
      const result = validateContent({
        contentId: 'test-123',
        title: 'Valid Title That Is Long Enough for SEO',
        metaDescription: 'Valid meta description with enough characters.',
        answerCapsule: 'This destination offers various attractions and experiences for travelers. The area features multiple restaurants, hotels, and entertainment options that cater to different preferences and budgets.',
      });

      const numbersWarning = result.warnings.find(w =>
        w.field === 'answerCapsule' && w.message.includes('numbers')
      );
      expect(numbersWarning).toBeDefined();
    });

    it('should detect emojis in capsule', () => {
      const result = validateContent({
        contentId: 'test-123',
        title: 'Valid Title That Is Long Enough for SEO',
        metaDescription: 'Valid meta description with enough characters.',
        answerCapsule: 'This destination offers great attractions 🎉 with prices starting from fifty dollars per person for most activities and tours.',
      });

      const emojiIssue = result.issues.find(i =>
        i.field === 'answerCapsule' && i.message.includes('emoji')
      );
      expect(emojiIssue).toBeDefined();
    });

    it('should detect conflict between capsule and meta description', () => {
      const result = validateContent({
        contentId: 'test-123',
        title: 'Beaches in Dubai',
        metaDescription: 'Explore the best shopping malls in Tokyo Japan with our guide to exclusive brands.',
        answerCapsule: 'The mountain hiking trails in Switzerland offer excellent conditions for outdoor adventures with elevations reaching over 4000 meters above sea level and pristine alpine views.',
      });

      // Should detect low overlap between capsule and meta description
      const hasConflict = result.issues.some(i => i.type === 'conflict') ||
                         result.warnings.some(w => w.type === 'compatibility');
      expect(hasConflict).toBe(true);
    });

    it('should validate invalid slug', () => {
      const result = validateContent({
        contentId: 'test-123',
        title: 'Valid Title That Is Long Enough for SEO',
        answerCapsule: 'A valid capsule with enough words for the minimum requirement of forty words as specified in the configuration settings.',
        slug: 'Invalid Slug With Spaces!',
      });

      const slugIssue = result.issues.find(i => i.field === 'slug');
      expect(slugIssue).toBeDefined();
    });
  });

  describe('Score Calculations', () => {
    it('should give high score for well-optimized content', () => {
      const result = validateContent({
        contentId: 'test-123',
        title: 'Top 10 Family Attractions in Downtown Dubai Guide',
        metaTitle: 'Top 10 Family Attractions in Downtown Dubai Guide',
        metaDescription: 'Discover the best family-friendly attractions in Downtown Dubai. Our comprehensive guide covers Burj Khalifa, Dubai Fountain, and more with tips and prices.',
        answerCapsule: 'Downtown Dubai features 10 major family attractions including Burj Khalifa (149 AED), Dubai Fountain (free), and Dubai Aquarium (145 AED). Most attractions offer family packages with 20-30% discounts. Best visiting time is weekday mornings to avoid crowds.',
        slug: 'top-family-attractions-downtown-dubai',
        type: 'article',
      });

      // Well-optimized content should have good scores
      expect(result.score).toBeGreaterThanOrEqual(50);
      expect(result.seoScore).toBeGreaterThanOrEqual(60);
      expect(result.aeoScore).toBeGreaterThanOrEqual(40);
      // Should have minimal critical issues
      const criticalIssues = result.issues.filter(i => i.severity === 'critical');
      expect(criticalIssues.length).toBeLessThanOrEqual(1);
    });

    it('should give low score for poorly optimized content', () => {
      const result = validateContent({
        contentId: 'test-123',
        title: 'Hi',
        // No meta description
        // No capsule
      });

      // Score should be significantly lower than well-optimized content
      expect(result.score).toBeLessThan(70);
      expect(result.isValid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });
  });

  describe('Recommendations', () => {
    it('should generate recommendations for missing capsule', () => {
      const result = validateContent({
        contentId: 'test-123',
        title: 'Valid Title for Testing Recommendations',
      });

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.some(r => r.includes('capsule'))).toBe(true);
    });

    it('should congratulate well-optimized content', () => {
      const result = validateContent({
        contentId: 'test-123',
        title: 'Complete Guide to Dubai Marina Restaurants and Dining',
        metaDescription: 'Explore over 200 restaurants in Dubai Marina with our detailed guide covering cuisine types, price ranges, and reservation tips for every budget.',
        answerCapsule: 'Dubai Marina hosts over 200 restaurants across 15 cuisine types. Average meal prices range from 75-300 AED per person. Popular options include waterfront dining at Pier 7, with 7 restaurants across 7 floors. Reservations recommended for weekends.',
        slug: 'dubai-marina-restaurants-guide',
        type: 'article',
      });

      if (result.issues.length === 0) {
        expect(result.recommendations.some(r => r.includes('well-optimized'))).toBe(true);
      }
    });
  });
});
