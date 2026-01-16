/**
 * Octopus Engine - Fact-Checking Validation Agent
 * 
 * Extracts factual claims from generated content and validates them
 * against known data sources. Uses mock validation for testing.
 * 
 * Claim types detected:
 * - Height/dimensions: "Baiyoke Tower 340m"
 * - Population: "11 million residents"
 * - Laws/regulations: "alcohol sale ban hours"
 * - Distances: "Sukhumvit Road 11km"
 * - Dates: "established in 1999"
 * - Statistics: "over 200 restaurants"
 */

import { log } from '../lib/logger';

const factCheckerLogger = {
  info: (msg: string, data?: Record<string, unknown>) => log.info(`[FactChecker] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) => log.error(`[FactChecker] ${msg}`, undefined, data),
  warn: (msg: string, data?: Record<string, unknown>) => log.warn(`[FactChecker] ${msg}`, data),
};

// ============================================================================
// Types
// ============================================================================

export type ClaimType = 
  | 'height'
  | 'distance'
  | 'population'
  | 'date'
  | 'statistic'
  | 'price'
  | 'regulation'
  | 'rating'
  | 'area'
  | 'capacity'
  | 'duration'
  | 'percentage'
  | 'quantity';

export interface FactualClaim {
  id: string;
  type: ClaimType;
  claim: string;
  extractedValue: string;
  unit?: string;
  context: string;
  position: {
    start: number;
    end: number;
  };
}

export interface ValidationResult {
  claim: string;
  source: string;
  isValid: boolean;
  correction: string | null;
  confidence: number;
}

export interface FactCheckReport {
  contentId: string;
  totalClaims: number;
  validClaims: number;
  invalidClaims: number;
  uncertainClaims: number;
  overallConfidence: number;
  results: ValidationResult[];
  extractedClaims: FactualClaim[];
  processingTime: number;
  timestamp: Date;
}

export interface FactCheckOptions {
  minConfidence?: number;
  claimTypes?: ClaimType[];
  maxClaims?: number;
  includeContext?: boolean;
  strictMode?: boolean;
  contentId?: string;
}

// ============================================================================
// Extraction Patterns
// ============================================================================

const CLAIM_PATTERNS: Record<ClaimType, RegExp[]> = {
  height: [
    /(\d+(?:\.\d+)?)\s*(?:m|meters?|metres?)\s+(?:tall|high|height)/gi,
    /(?:height|tall|high)\s+(?:of\s+)?(\d+(?:\.\d+)?)\s*(?:m|meters?|metres?)/gi,
    /(\d+(?:\.\d+)?)\s*(?:m|meters?)\s+(?:above|tower|building|structure)/gi,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(\d+)\s*(?:m|meters?)/gi,
  ],
  distance: [
    /(\d+(?:\.\d+)?)\s*(?:km|kilometers?|kilometres?)\s+(?:from|to|away|long)/gi,
    /(?:distance|located)\s+(?:of\s+)?(\d+(?:\.\d+)?)\s*(?:km|kilometers?)/gi,
    /(\d+(?:\.\d+)?)\s*(?:km|kilometers?)\s+(?:road|stretch|route)/gi,
    /(\d+(?:\.\d+)?)\s*(?:miles?)\s+(?:from|to|away)/gi,
  ],
  population: [
    /(\d+(?:\.\d+)?)\s*(?:million|billion)?\s*(?:people|residents|inhabitants|population)/gi,
    /(?:population|home to)\s+(?:of\s+)?(\d+(?:\.\d+)?)\s*(?:million|billion)?/gi,
    /(?:over|approximately|about|nearly)\s+(\d+(?:\.\d+)?)\s*(?:million|billion)?\s*(?:people|residents)/gi,
  ],
  date: [
    /(?:established|built|opened|founded|completed)\s+(?:in\s+)?(\d{4})/gi,
    /(?:since|from)\s+(\d{4})/gi,
    /(\d{4})\s+(?:opening|construction|establishment)/gi,
    /(?:dating back to|dates? from)\s+(\d{4})/gi,
  ],
  statistic: [
    /(?:over|more than|approximately|about|nearly)\s+(\d+(?:,\d{3})*)\s+(?:restaurants?|hotels?|shops?|stores?|rooms?|floors?|attractions?)/gi,
    /(\d+(?:,\d{3})*)\s+(?:restaurants?|hotels?|shops?|stores?|rooms?|floors?|attractions?)/gi,
    /(?:features?|contains?|has|have|boasts?)\s+(\d+(?:,\d{3})*)\s+(?:restaurants?|hotels?|shops?|rooms?)/gi,
  ],
  price: [
    /(?:costs?|priced? at|starting from|from)\s*(?:USD|THB|AED|EUR|GBP|\$|฿|€|£)?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/gi,
    /(?:USD|THB|AED|EUR|GBP|\$|฿|€|£)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/gi,
    /(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:USD|THB|AED|EUR|GBP|baht|dirhams?|dollars?)/gi,
  ],
  regulation: [
    /(?:alcohol|liquor)\s+(?:sales?|sold)\s+(?:banned?|prohibited?|not allowed?)\s+(?:between|from)\s+(\d{1,2}[:\d]*\s*(?:am|pm)?)\s*(?:to|until|and)\s*(\d{1,2}[:\d]*\s*(?:am|pm)?)/gi,
    /(?:open|closed)\s+(?:from|between)\s+(\d{1,2}[:\d]*\s*(?:am|pm)?)\s*(?:to|until)\s*(\d{1,2}[:\d]*\s*(?:am|pm)?)/gi,
    /(?:visa|permit)\s+(?:required|valid)\s+(?:for)\s+(\d+)\s*(?:days?|months?|years?)/gi,
  ],
  rating: [
    /(\d+(?:\.\d+)?)\s*(?:out of|\/)\s*(\d+)\s*(?:stars?|rating)/gi,
    /(\d+)-star\s+(?:hotel|resort|restaurant)/gi,
    /(?:rated|rating of)\s+(\d+(?:\.\d+)?)/gi,
  ],
  area: [
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:sq\.?\s*(?:m|meters?|km|kilometers?)|square\s+(?:meters?|kilometers?))/gi,
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:hectares?|acres?)/gi,
    /(?:area|size)\s+(?:of\s+)?(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:sq|square)/gi,
  ],
  capacity: [
    /(?:capacity|seats?|holds?|accommodates?)\s+(?:up to\s+)?(\d+(?:,\d{3})*)\s*(?:people|guests?|visitors?|passengers?)?/gi,
    /(\d+(?:,\d{3})*)\s*(?:seat|person|guest)\s+(?:capacity|venue)/gi,
  ],
  duration: [
    /(?:takes?|lasts?|duration of)\s+(?:about\s+)?(\d+(?:\.\d+)?)\s*(?:hours?|minutes?|days?)/gi,
    /(\d+(?:\.\d+)?)\s*(?:hours?|minutes?|days?)\s+(?:journey|trip|flight|drive)/gi,
  ],
  percentage: [
    /(\d+(?:\.\d+)?)\s*(?:%|percent)/gi,
    /(?:increase|decrease|growth|decline)\s+(?:of\s+)?(\d+(?:\.\d+)?)\s*(?:%|percent)/gi,
  ],
  quantity: [
    /(\d+(?:,\d{3})*)\s+(?:islands?|beaches?|temples?|mosques?|churches?|museums?)/gi,
    /(?:over|more than|approximately)\s+(\d+(?:,\d{3})*)\s+(?:islands?|beaches?|temples?)/gi,
  ],
};

// ============================================================================
// Mock Validation Database (for testing without real API calls)
// ============================================================================

interface MockFactData {
  pattern: RegExp;
  correctValue: string;
  source: string;
  unit?: string;
}

const MOCK_VALIDATION_DATA: Record<string, MockFactData[]> = {
  bangkok: [
    { pattern: /baiyoke\s+tower/i, correctValue: '309', source: 'Official Baiyoke Tower website', unit: 'm' },
    { pattern: /sukhumvit\s+road/i, correctValue: '11', source: 'Bangkok Metropolitan Administration', unit: 'km' },
    { pattern: /bangkok\s+population/i, correctValue: '10.5', source: 'National Statistical Office Thailand 2024', unit: 'million' },
    { pattern: /alcohol\s+sale.*ban/i, correctValue: '2pm-5pm, 12am-11am', source: 'Thai Alcoholic Beverage Control Act', unit: 'hours' },
    { pattern: /grand\s+palace/i, correctValue: '1782', source: 'Tourism Authority of Thailand', unit: 'year' },
    { pattern: /chatuchak\s+market/i, correctValue: '15000', source: 'Chatuchak Market Office', unit: 'stalls' },
    { pattern: /wat\s+arun.*height/i, correctValue: '70', source: 'Fine Arts Department Thailand', unit: 'm' },
    { pattern: /bts\s+skytrain/i, correctValue: '62', source: 'BTS Group Holdings', unit: 'stations' },
    { pattern: /suvarnabhumi.*runway/i, correctValue: '4000', source: 'Airports of Thailand', unit: 'm' },
  ],
  dubai: [
    { pattern: /burj\s+khalifa/i, correctValue: '828', source: 'Emaar Properties Official', unit: 'm' },
    { pattern: /palm\s+jumeirah.*area/i, correctValue: '560', source: 'Nakheel Properties', unit: 'hectares' },
    { pattern: /dubai\s+mall.*shops/i, correctValue: '1200', source: 'Emaar Malls Official', unit: 'stores' },
    { pattern: /dubai\s+population/i, correctValue: '3.5', source: 'Dubai Statistics Center 2024', unit: 'million' },
    { pattern: /dubai\s+metro.*stations/i, correctValue: '53', source: 'Roads and Transport Authority', unit: 'stations' },
    { pattern: /dubai\s+frame.*height/i, correctValue: '150', source: 'Dubai Municipality', unit: 'm' },
    { pattern: /burj\s+al\s+arab.*height/i, correctValue: '321', source: 'Jumeirah Group', unit: 'm' },
    { pattern: /dubai\s+marina.*towers/i, correctValue: '200', source: 'Dubai Marina LLC', unit: 'towers' },
  ],
  singapore: [
    { pattern: /marina\s+bay\s+sands.*height/i, correctValue: '200', source: 'Marina Bay Sands Official', unit: 'm' },
    { pattern: /singapore\s+population/i, correctValue: '5.9', source: 'Singapore Department of Statistics 2024', unit: 'million' },
    { pattern: /changi\s+airport.*terminals/i, correctValue: '4', source: 'Changi Airport Group', unit: 'terminals' },
    { pattern: /sentosa.*area/i, correctValue: '500', source: 'Sentosa Development Corporation', unit: 'hectares' },
    { pattern: /gardens\s+by\s+the\s+bay.*area/i, correctValue: '101', source: 'Gardens by the Bay Official', unit: 'hectares' },
    { pattern: /singapore\s+flyer.*height/i, correctValue: '165', source: 'Singapore Flyer Official', unit: 'm' },
  ],
  london: [
    { pattern: /big\s+ben.*height/i, correctValue: '96', source: 'UK Parliament Official', unit: 'm' },
    { pattern: /london\s+eye.*height/i, correctValue: '135', source: 'Merlin Entertainments', unit: 'm' },
    { pattern: /london\s+population/i, correctValue: '8.8', source: 'Office for National Statistics 2024', unit: 'million' },
    { pattern: /thames.*length/i, correctValue: '346', source: 'Environment Agency UK', unit: 'km' },
    { pattern: /tower\s+of\s+london.*built/i, correctValue: '1078', source: 'Historic Royal Palaces', unit: 'year' },
    { pattern: /heathrow.*terminals/i, correctValue: '5', source: 'Heathrow Airport Holdings', unit: 'terminals' },
  ],
  istanbul: [
    { pattern: /hagia\s+sophia.*built/i, correctValue: '537', source: 'Turkish Ministry of Culture', unit: 'year' },
    { pattern: /istanbul\s+population/i, correctValue: '15.8', source: 'Turkish Statistical Institute 2024', unit: 'million' },
    { pattern: /bosphorus.*length/i, correctValue: '31', source: 'Turkish Straits Authority', unit: 'km' },
    { pattern: /grand\s+bazaar.*shops/i, correctValue: '4000', source: 'Istanbul Chamber of Commerce', unit: 'shops' },
    { pattern: /galata\s+tower.*height/i, correctValue: '67', source: 'Istanbul Municipality', unit: 'm' },
  ],
};

// ============================================================================
// Claim Extraction
// ============================================================================

/**
 * Extract factual claims from content text
 */
export function extractClaims(content: string, options: FactCheckOptions = {}): FactualClaim[] {
  const {
    claimTypes = Object.keys(CLAIM_PATTERNS) as ClaimType[],
    maxClaims = 100,
    includeContext = true,
  } = options;

  const claims: FactualClaim[] = [];
  const seenClaims = new Set<string>();

  for (const claimType of claimTypes) {
    const patterns = CLAIM_PATTERNS[claimType];
    if (!patterns) continue;

    for (const pattern of patterns) {
      const regex = new RegExp(pattern.source, pattern.flags);
      let match;

      while ((match = regex.exec(content)) !== null) {
        const claim = match[0];
        const claimKey = `${claimType}:${claim.toLowerCase().trim()}`;
        
        if (seenClaims.has(claimKey)) continue;
        seenClaims.add(claimKey);

        const extractedValue = match[1] || match[2] || '';
        const contextStart = Math.max(0, match.index - 50);
        const contextEnd = Math.min(content.length, match.index + claim.length + 50);
        
        claims.push({
          id: `claim_${claims.length}_${Date.now()}`,
          type: claimType,
          claim: claim.trim(),
          extractedValue: extractedValue.replace(/,/g, ''),
          unit: extractUnit(claim, claimType),
          context: includeContext ? content.slice(contextStart, contextEnd).trim() : '',
          position: {
            start: match.index,
            end: match.index + claim.length,
          },
        });

        if (claims.length >= maxClaims) break;
      }

      if (claims.length >= maxClaims) break;
    }

    if (claims.length >= maxClaims) break;
  }

  factCheckerLogger.info('Extracted factual claims', {
    totalClaims: claims.length,
    byType: groupClaimsByType(claims),
  });

  return claims;
}

/**
 * Extract unit from claim text
 */
function extractUnit(claim: string, claimType: ClaimType): string | undefined {
  const unitPatterns: Record<string, RegExp> = {
    height: /\b(m|meters?|metres?|ft|feet)\b/i,
    distance: /\b(km|kilometers?|kilometres?|miles?|m|meters?)\b/i,
    population: /\b(million|billion|thousand)\b/i,
    area: /\b(sq\.?\s*(?:m|km)|hectares?|acres?|square\s+(?:meters?|kilometers?))\b/i,
    price: /\b(USD|THB|AED|EUR|GBP|baht|dirhams?|dollars?|pounds?|euros?)\b/i,
    duration: /\b(hours?|minutes?|days?|weeks?|months?|years?)\b/i,
  };

  const pattern = unitPatterns[claimType];
  if (!pattern) return undefined;

  const match = claim.match(pattern);
  return match ? match[1].toLowerCase() : undefined;
}

/**
 * Group claims by type for summary
 */
function groupClaimsByType(claims: FactualClaim[]): Record<ClaimType, number> {
  const groups: Partial<Record<ClaimType, number>> = {};
  for (const claim of claims) {
    groups[claim.type] = (groups[claim.type] || 0) + 1;
  }
  return groups as Record<ClaimType, number>;
}

// ============================================================================
// Validation Logic
// ============================================================================

/**
 * Validate a single claim against mock database
 */
function validateClaim(claim: FactualClaim, destination?: string): ValidationResult {
  const destLower = destination?.toLowerCase() || '';
  const mockData = MOCK_VALIDATION_DATA[destLower] || [];
  
  for (const data of mockData) {
    if (data.pattern.test(claim.claim) || data.pattern.test(claim.context)) {
      const claimedValue = parseFloat(claim.extractedValue);
      const correctValue = parseFloat(data.correctValue.replace(/,/g, ''));
      
      const tolerance = 0.15;
      const isWithinTolerance = !isNaN(claimedValue) && !isNaN(correctValue) &&
        Math.abs(claimedValue - correctValue) / correctValue <= tolerance;
      
      const isExactMatch = claim.extractedValue === data.correctValue.replace(/,/g, '');
      
      return {
        claim: claim.claim,
        source: data.source,
        isValid: isExactMatch || isWithinTolerance,
        correction: isExactMatch || isWithinTolerance ? null : `${data.correctValue}${data.unit ? ` ${data.unit}` : ''}`,
        confidence: isExactMatch ? 0.95 : (isWithinTolerance ? 0.85 : 0.70),
      };
    }
  }

  if (destLower && Object.keys(MOCK_VALIDATION_DATA).some(d => destLower.includes(d))) {
    return {
      claim: claim.claim,
      source: 'No matching reference found',
      isValid: true,
      correction: null,
      confidence: 0.50,
    };
  }

  return {
    claim: claim.claim,
    source: 'Unable to verify - no reference data available',
    isValid: true,
    correction: null,
    confidence: 0.30,
  };
}

// ============================================================================
// Main Export Function
// ============================================================================

/**
 * Validate facts in generated content
 * 
 * @param content - The content text to validate
 * @param destination - Optional destination name for context-aware validation
 * @param options - Validation options
 * @returns Fact check report with validation results
 */
export async function validateFacts(
  content: string,
  destination?: string,
  options: FactCheckOptions = {}
): Promise<FactCheckReport> {
  const startTime = Date.now();
  const contentId = options.contentId || `fc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  factCheckerLogger.info('Starting fact validation', {
    contentLength: content.length,
    destination,
    options,
  });

  const extractedClaims = extractClaims(content, options);

  const minConfidence = options.minConfidence ?? 0.3;
  const results: ValidationResult[] = [];
  
  for (const claim of extractedClaims) {
    const validationResult = validateClaim(claim, destination);
    
    if (validationResult.confidence >= minConfidence) {
      results.push(validationResult);
    }
  }

  const validClaims = results.filter(r => r.isValid && r.confidence >= 0.7).length;
  const invalidClaims = results.filter(r => !r.isValid && r.confidence >= 0.7).length;
  const uncertainClaims = results.filter(r => r.confidence < 0.7).length;
  
  const overallConfidence = results.length > 0
    ? results.reduce((sum, r) => sum + r.confidence, 0) / results.length
    : 0;

  const report: FactCheckReport = {
    contentId,
    totalClaims: extractedClaims.length,
    validClaims,
    invalidClaims,
    uncertainClaims,
    overallConfidence,
    results,
    extractedClaims,
    processingTime: Date.now() - startTime,
    timestamp: new Date(),
  };

  factCheckerLogger.info('Fact validation complete', {
    contentId,
    totalClaims: extractedClaims.length,
    validClaims,
    invalidClaims,
    uncertainClaims,
    overallConfidence: overallConfidence.toFixed(2),
    processingTime: report.processingTime,
  });

  return report;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get a summary of the fact check report for display
 */
export function getFactCheckSummary(report: FactCheckReport): {
  status: 'pass' | 'warn' | 'fail';
  message: string;
  details: string[];
} {
  const { totalClaims, validClaims, invalidClaims, uncertainClaims, overallConfidence } = report;
  
  if (totalClaims === 0) {
    return {
      status: 'pass',
      message: 'No factual claims detected',
      details: ['Content does not contain verifiable numerical or statistical claims'],
    };
  }

  const invalidRatio = invalidClaims / totalClaims;
  const details: string[] = [];

  details.push(`${totalClaims} factual claims extracted`);
  details.push(`${validClaims} verified as accurate`);
  
  if (invalidClaims > 0) {
    details.push(`${invalidClaims} potentially inaccurate - review recommended`);
  }
  
  if (uncertainClaims > 0) {
    details.push(`${uncertainClaims} could not be verified`);
  }

  details.push(`Overall confidence: ${(overallConfidence * 100).toFixed(0)}%`);

  if (invalidRatio > 0.3) {
    return {
      status: 'fail',
      message: 'Multiple factual inaccuracies detected',
      details,
    };
  }

  if (invalidRatio > 0.1 || overallConfidence < 0.6) {
    return {
      status: 'warn',
      message: 'Some claims require verification',
      details,
    };
  }

  return {
    status: 'pass',
    message: 'Factual claims verified',
    details,
  };
}

/**
 * Format validation results for UI display
 */
export function formatValidationResults(results: ValidationResult[]): {
  valid: ValidationResult[];
  invalid: ValidationResult[];
  uncertain: ValidationResult[];
} {
  return {
    valid: results.filter(r => r.isValid && r.confidence >= 0.7),
    invalid: results.filter(r => !r.isValid && r.confidence >= 0.7),
    uncertain: results.filter(r => r.confidence < 0.7),
  };
}

/**
 * Get correction suggestions for invalid claims
 */
export function getCorrectionSuggestions(report: FactCheckReport): Array<{
  original: string;
  correction: string;
  source: string;
  confidence: number;
}> {
  return report.results
    .filter(r => !r.isValid && r.correction !== null)
    .map(r => ({
      original: r.claim,
      correction: r.correction!,
      source: r.source,
      confidence: r.confidence,
    }));
}
