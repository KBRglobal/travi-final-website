/**
 * Writer Persona System - Prompt Builder Tests
 */

import { describe, it, expect } from 'vitest';
import { PERSONAS, getPersona, personaExists } from './personas';
import { PersonaName } from './types';

describe('Writer Persona System', () => {
  describe('Persona Registry', () => {
    it('has all required personas', () => {
      const requiredPersonas: PersonaName[] = [
        'journalist',
        'seo_expert',
        'travel_guide',
        'conversational',
        'authority',
        'default',
      ];

      for (const name of requiredPersonas) {
        expect(personaExists(name)).toBe(true);
      }
    });

    it('returns correct persona by name', () => {
      const journalist = getPersona('journalist');
      expect(journalist.name).toBe('journalist');
      expect(journalist.displayName).toBe('Journalist');
    });

    it('returns default for unknown persona', () => {
      const unknown = getPersona('unknown' as PersonaName);
      expect(unknown.name).toBe('default');
    });
  });

  describe('Persona Properties', () => {
    it('journalist has news article structure', () => {
      const journalist = getPersona('journalist');
      expect(journalist.structure).toBe('news_article');
      expect(journalist.tone).toBe('professional');
    });

    it('travel_guide has enthusiastic tone', () => {
      const travelGuide = getPersona('travel_guide');
      expect(travelGuide.tone).toBe('enthusiastic');
      expect(travelGuide.depth).toBe('deep');
    });

    it('conversational has friendly tone', () => {
      const conversational = getPersona('conversational');
      expect(conversational.tone).toBe('friendly');
      expect(conversational.citationBehavior).toBe('none');
    });

    it('authority has deep depth', () => {
      const authority = getPersona('authority');
      expect(authority.depth).toBe('deep');
      expect(authority.citationBehavior).toBe('end_references');
    });

    it('seo_expert has minimal citations', () => {
      const seoExpert = getPersona('seo_expert');
      expect(seoExpert.citationBehavior).toBe('minimal');
    });
  });

  describe('Style Guidelines', () => {
    it('each persona has style guidelines', () => {
      for (const persona of Object.values(PERSONAS)) {
        expect(persona.styleGuidelines.length).toBeGreaterThan(0);
      }
    });

    it('journalist has attribution guideline', () => {
      const journalist = getPersona('journalist');
      expect(
        journalist.styleGuidelines.some(g => g.toLowerCase().includes('attribute'))
      ).toBe(true);
    });
  });

  describe('Deterministic Selection', () => {
    it('same input always returns same persona', () => {
      const persona1 = getPersona('travel_guide');
      const persona2 = getPersona('travel_guide');

      expect(persona1.name).toBe(persona2.name);
      expect(persona1.tone).toBe(persona2.tone);
      expect(persona1.structure).toBe(persona2.structure);
    });
  });
});
