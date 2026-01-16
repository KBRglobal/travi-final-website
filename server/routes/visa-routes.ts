/**
 * Visa Requirements API Routes
 * Public endpoint for querying visa requirements by passport and destination
 */

import { Router } from 'express';
import { db } from '../db';
import { visaRequirements } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

export const visaRoutes = Router();

const COMMON_PASSPORT_ORIGINS = ['US', 'GB', 'DE', 'FR', 'CA', 'AU', 'JP', 'IN', 'CN', 'BR'];

visaRoutes.get('/visa-requirements', async (req, res) => {
  try {
    const destination = (req.query.destination as string)?.toUpperCase();
    const passport = (req.query.passport as string)?.toUpperCase();

    if (!destination || destination.length !== 2) {
      return res.status(400).json({
        success: false,
        error: 'destination query parameter is required and must be a 2-letter ISO country code',
      });
    }

    if (passport && passport.length === 2) {
      const result = await db
        .select()
        .from(visaRequirements)
        .where(
          and(
            eq(visaRequirements.destinationCountryCode, destination),
            eq(visaRequirements.passportCountryCode, passport)
          )
        )
        .limit(1);

      if (result.length === 0) {
        return res.json({
          success: true,
          data: null,
          message: 'No visa requirement data found for this passport-destination combination',
        });
      }

      return res.json({
        success: true,
        data: formatVisaRequirement(result[0]),
      });
    }

    const results = await db
      .select()
      .from(visaRequirements)
      .where(eq(visaRequirements.destinationCountryCode, destination));

    const filtered = results.filter(r => 
      COMMON_PASSPORT_ORIGINS.includes(r.passportCountryCode)
    );

    return res.json({
      success: true,
      data: (filtered.length > 0 ? filtered : results.slice(0, 10)).map(formatVisaRequirement),
      total: results.length,
    });
  } catch (error) {
    console.error('[Visa Routes] Error fetching visa requirements:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch visa requirements',
    });
  }
});

function formatVisaRequirement(row: typeof visaRequirements.$inferSelect) {
  const categoryLabels: Record<string, string> = {
    'VF': 'Visa Free',
    'VOA': 'Visa on Arrival',
    'VR': 'Visa Required',
    'eVisa': 'eVisa',
    'ETA': 'Electronic Travel Authorization',
  };

  return {
    id: row.id,
    passportCountryCode: row.passportCountryCode,
    destinationCountryCode: row.destinationCountryCode,
    visaCategory: row.visaCategory,
    visaCategoryLabel: categoryLabels[row.visaCategory] || row.visaCategory,
    stayDuration: row.stayDuration,
    stayDurationLabel: row.stayDuration ? `${row.stayDuration} days` : null,
    notes: row.notes,
    sourceUrl: row.sourceUrl,
    lastUpdated: row.lastUpdated,
  };
}
