/**
 * Event Ingester
 * Ingests events from Wikidata SPARQL endpoint for destination cities
 * Focus on festivals, recurring events, concerts, and major happenings
 */

import { BaseIngester } from '../base-ingester';
import type { DataSource, IngestionResult } from '../types';
import { db } from '../../db';
import { destinationEvents, destinations } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';

// Wikidata result interface
interface WikidataEvent {
  event: { value: string };
  eventLabel: { value: string };
  description?: { value: string };
  startDate?: { value: string };
  endDate?: { value: string };
  locationLabel?: { value: string };
  countryLabel?: { value: string };
  eventTypeLabel?: { value: string };
  image?: { value: string };
  website?: { value: string };
}

interface WikidataResponse {
  results: {
    bindings: WikidataEvent[];
  };
}

// City to Wikidata Q-ID mapping for our whitelisted cities
const CITY_WIKIDATA_IDS: Record<string, { qId: string; country: string }> = {
  "abu-dhabi": { qId: "Q613", country: "AE" },
  "amsterdam": { qId: "Q727", country: "NL" },
  "bangkok": { qId: "Q1861", country: "TH" },
  "barcelona": { qId: "Q1492", country: "ES" },
  "dubai": { qId: "Q612", country: "AE" },
  "hong-kong": { qId: "Q8646", country: "HK" },
  "istanbul": { qId: "Q406", country: "TR" },
  "las-vegas": { qId: "Q23768", country: "US" },
  "london": { qId: "Q84", country: "GB" },
  "los-angeles": { qId: "Q65", country: "US" },
  "miami": { qId: "Q8652", country: "US" },
  "new-york": { qId: "Q60", country: "US" },
  "paris": { qId: "Q90", country: "FR" },
  "rome": { qId: "Q220", country: "IT" },
  "singapore": { qId: "Q334", country: "SG" },
  "tokyo": { qId: "Q1490", country: "JP" },
};

// Map Wikidata event types to our enum (festival, sports, conference, concert, exhibition, cultural, holiday)
const EVENT_TYPE_MAP: Record<string, "festival" | "sports" | "conference" | "concert" | "exhibition" | "holiday" | "cultural"> = {
  "festival": "festival",
  "music festival": "festival",
  "film festival": "festival",
  "art festival": "festival",
  "food festival": "festival",
  "cultural festival": "festival",
  "sports event": "sports",
  "sporting event": "sports",
  "marathon": "sports",
  "tennis tournament": "sports",
  "golf tournament": "sports",
  "concert": "concert",
  "music concert": "concert",
  "conference": "conference",
  "summit": "conference",
  "exhibition": "exhibition",
  "art exhibition": "exhibition",
  "trade fair": "exhibition",
  "world's fair": "exhibition",
  "public holiday": "holiday",
  "national holiday": "holiday",
  "religious holiday": "holiday",
  "parade": "cultural",
  "ceremony": "cultural",
};

interface TransformedEvent {
  wikidataId: string;
  name: string;
  description: string | null;
  eventType: "festival" | "sports" | "conference" | "concert" | "exhibition" | "holiday" | "cultural";
  venue: string | null;
  startDate: Date;
  endDate: Date | null;
  ticketUrl: string | null;
  imageUrl: string | null;
  citySlug: string;
  countryCode: string;
}

// Curated seed events for major recurring festivals/events (guaranteed data)
const SEED_EVENTS: Record<string, Array<{name: string; description: string; eventType: TransformedEvent['eventType']; monthStart: number; dayStart: number; duration: number; venue?: string}>> = {
  "dubai": [
    { name: "Dubai Shopping Festival", description: "Annual shopping festival with sales, entertainment and fireworks across Dubai", eventType: "festival", monthStart: 12, dayStart: 15, duration: 45, venue: "Citywide" },
    { name: "Dubai Food Festival", description: "Citywide celebration of culinary excellence featuring restaurants and street food", eventType: "festival", monthStart: 2, dayStart: 21, duration: 17, venue: "Citywide" },
    { name: "Dubai World Cup", description: "World's richest horse racing event at Meydan Racecourse", eventType: "sports", monthStart: 3, dayStart: 30, duration: 1, venue: "Meydan Racecourse" },
    { name: "Dubai Jazz Festival", description: "Annual jazz music festival featuring international artists", eventType: "concert", monthStart: 2, dayStart: 15, duration: 3, venue: "Media City Amphitheatre" },
    { name: "Expo City Dubai Events", description: "Year-round exhibitions and cultural events at the former Expo 2020 site", eventType: "exhibition", monthStart: 1, dayStart: 1, duration: 365, venue: "Expo City Dubai" },
  ],
  "abu-dhabi": [
    { name: "Abu Dhabi Grand Prix", description: "Formula 1 season finale at Yas Marina Circuit", eventType: "sports", monthStart: 11, dayStart: 23, duration: 3, venue: "Yas Marina Circuit" },
    { name: "Mother of the Nation Festival", description: "Cultural festival celebrating Emirati heritage", eventType: "cultural", monthStart: 3, dayStart: 10, duration: 20, venue: "Corniche" },
  ],
  "london": [
    { name: "Notting Hill Carnival", description: "Europe's largest street carnival celebrating Caribbean culture", eventType: "festival", monthStart: 8, dayStart: 25, duration: 2, venue: "Notting Hill" },
    { name: "Wimbledon Championships", description: "World's oldest and most prestigious tennis tournament", eventType: "sports", monthStart: 7, dayStart: 1, duration: 14, venue: "All England Club" },
    { name: "London Fashion Week", description: "Major fashion event showcasing British and international designers", eventType: "exhibition", monthStart: 2, dayStart: 17, duration: 5, venue: "Various Venues" },
  ],
  "paris": [
    { name: "Tour de France Finale", description: "Final stage of the world's most famous cycling race on Champs-Élysées", eventType: "sports", monthStart: 7, dayStart: 21, duration: 1, venue: "Champs-Élysées" },
    { name: "Paris Fashion Week", description: "Premier fashion event featuring haute couture collections", eventType: "exhibition", monthStart: 9, dayStart: 25, duration: 9, venue: "Various Venues" },
    { name: "Fête de la Musique", description: "Annual citywide music festival with free concerts everywhere", eventType: "concert", monthStart: 6, dayStart: 21, duration: 1, venue: "Citywide" },
  ],
  "tokyo": [
    { name: "Sumidagawa Fireworks Festival", description: "Japan's oldest and most famous fireworks festival", eventType: "festival", monthStart: 7, dayStart: 27, duration: 1, venue: "Sumida River" },
    { name: "Tokyo Game Show", description: "World's largest video game expo and convention", eventType: "exhibition", monthStart: 9, dayStart: 21, duration: 4, venue: "Makuhari Messe" },
    { name: "Cherry Blossom Season", description: "Annual celebration of sakura blooming across Tokyo parks", eventType: "cultural", monthStart: 3, dayStart: 25, duration: 14, venue: "Ueno Park, Shinjuku Gyoen" },
  ],
  "new-york": [
    { name: "New Year's Eve Times Square", description: "World-famous New Year's countdown and ball drop", eventType: "festival", monthStart: 12, dayStart: 31, duration: 1, venue: "Times Square" },
    { name: "Macy's Thanksgiving Day Parade", description: "Iconic annual parade with floats and performances", eventType: "cultural", monthStart: 11, dayStart: 28, duration: 1, venue: "Manhattan" },
    { name: "New York Fashion Week", description: "Premier fashion event showcasing American designers", eventType: "exhibition", monthStart: 9, dayStart: 6, duration: 7, venue: "Various Venues" },
    { name: "US Open Tennis", description: "Final Grand Slam tennis tournament of the year", eventType: "sports", monthStart: 8, dayStart: 26, duration: 14, venue: "USTA Billie Jean King National Tennis Center" },
  ],
  "singapore": [
    { name: "Singapore Grand Prix", description: "World's first F1 night race through Marina Bay", eventType: "sports", monthStart: 9, dayStart: 20, duration: 3, venue: "Marina Bay Street Circuit" },
    { name: "Chinese New Year Celebrations", description: "Festive celebrations in Chinatown with parades and performances", eventType: "cultural", monthStart: 1, dayStart: 22, duration: 15, venue: "Chinatown" },
    { name: "Singapore Food Festival", description: "Annual celebration of Singapore's diverse culinary heritage", eventType: "festival", monthStart: 7, dayStart: 14, duration: 17, venue: "Citywide" },
  ],
  "barcelona": [
    { name: "La Mercè Festival", description: "Barcelona's biggest annual festival honoring patron saint", eventType: "festival", monthStart: 9, dayStart: 24, duration: 5, venue: "Citywide" },
    { name: "Mobile World Congress", description: "World's largest mobile technology conference", eventType: "conference", monthStart: 2, dayStart: 26, duration: 4, venue: "Fira Gran Via" },
    { name: "Primavera Sound", description: "Major international music festival featuring diverse genres", eventType: "concert", monthStart: 5, dayStart: 29, duration: 6, venue: "Parc del Fòrum" },
  ],
  "amsterdam": [
    { name: "King's Day", description: "National holiday celebrating King's birthday with citywide street parties", eventType: "festival", monthStart: 4, dayStart: 27, duration: 1, venue: "Citywide" },
    { name: "Amsterdam Dance Event", description: "World's largest electronic music conference and festival", eventType: "concert", monthStart: 10, dayStart: 16, duration: 5, venue: "Various Venues" },
    { name: "Amsterdam Light Festival", description: "Annual light art installations across canals and streets", eventType: "exhibition", monthStart: 11, dayStart: 30, duration: 53, venue: "Canal Ring" },
  ],
  "bangkok": [
    { name: "Songkran Festival", description: "Thai New Year water festival celebration", eventType: "festival", monthStart: 4, dayStart: 13, duration: 3, venue: "Citywide" },
    { name: "Loy Krathong", description: "Festival of lights with floating lanterns and krathongs", eventType: "cultural", monthStart: 11, dayStart: 15, duration: 1, venue: "Chao Phraya River" },
  ],
  "hong-kong": [
    { name: "Hong Kong Sevens", description: "Premier rugby sevens tournament and sporting party", eventType: "sports", monthStart: 3, dayStart: 28, duration: 3, venue: "Hong Kong Stadium" },
    { name: "Mid-Autumn Festival", description: "Traditional lantern festival celebrating the harvest moon", eventType: "cultural", monthStart: 9, dayStart: 29, duration: 3, venue: "Victoria Park" },
  ],
  "rome": [
    { name: "Rome Marathon", description: "Historic marathon through Rome's ancient monuments", eventType: "sports", monthStart: 3, dayStart: 17, duration: 1, venue: "City Center" },
    { name: "Estate Romana", description: "Summer festival with outdoor concerts, cinema and performances", eventType: "festival", monthStart: 6, dayStart: 1, duration: 92, venue: "Various Venues" },
  ],
  "las-vegas": [
    { name: "Las Vegas Grand Prix", description: "Formula 1 night race on the Las Vegas Strip", eventType: "sports", monthStart: 11, dayStart: 21, duration: 3, venue: "Las Vegas Strip" },
    { name: "CES", description: "World's most influential technology trade show", eventType: "conference", monthStart: 1, dayStart: 7, duration: 4, venue: "Las Vegas Convention Center" },
    { name: "Electric Daisy Carnival", description: "Massive electronic dance music festival", eventType: "concert", monthStart: 5, dayStart: 17, duration: 3, venue: "Las Vegas Motor Speedway" },
  ],
  "los-angeles": [
    { name: "Academy Awards", description: "Annual celebration of film excellence (the Oscars)", eventType: "cultural", monthStart: 3, dayStart: 2, duration: 1, venue: "Dolby Theatre" },
    { name: "LA Pride", description: "Annual LGBTQ+ pride parade and festival", eventType: "festival", monthStart: 6, dayStart: 7, duration: 3, venue: "West Hollywood" },
    { name: "Coachella", description: "World-famous annual music and arts festival", eventType: "concert", monthStart: 4, dayStart: 11, duration: 6, venue: "Empire Polo Club, Indio" },
  ],
  "miami": [
    { name: "Art Basel Miami Beach", description: "Premier contemporary art fair and cultural week", eventType: "exhibition", monthStart: 12, dayStart: 6, duration: 4, venue: "Miami Beach Convention Center" },
    { name: "Ultra Music Festival", description: "Major electronic dance music festival", eventType: "concert", monthStart: 3, dayStart: 28, duration: 3, venue: "Bayfront Park" },
    { name: "Miami Open Tennis", description: "Premier tennis tournament featuring top players", eventType: "sports", monthStart: 3, dayStart: 18, duration: 14, venue: "Hard Rock Stadium" },
  ],
  "istanbul": [
    { name: "Istanbul Biennial", description: "Major contemporary art exhibition held every two years", eventType: "exhibition", monthStart: 9, dayStart: 14, duration: 120, venue: "Various Museums" },
    { name: "Istanbul Music Festival", description: "Classical music festival featuring international orchestras", eventType: "concert", monthStart: 6, dayStart: 1, duration: 30, venue: "Various Venues" },
  ],
};

export class EventIngester extends BaseIngester {
  source: DataSource = {
    id: 'events',
    name: 'Events Database',
    displayName: 'Events',
    description: 'Festivals, recurring events, and major happenings from curated database and Wikidata',
    type: 'api',
    baseUrl: 'https://query.wikidata.org/sparql',
    config: {
      enabled: true,
      cronSchedule: '0 */12 * * *', // Every 12 hours
      batchSize: 100,
      retryAttempts: 3,
    },
  };

  async ingest(): Promise<IngestionResult> {
    const startTime = Date.now();
    this.log('Starting events ingestion');

    const errors: { message: string; recordId?: string }[] = [];
    let totalProcessed = 0;
    let totalCreated = 0;
    let totalUpdated = 0;

    try {
      // Phase 1: Load curated seed events (reliable, always works)
      this.log('Loading curated seed events...');
      for (const [citySlug, cityInfo] of Object.entries(CITY_WIKIDATA_IDS)) {
        const seedEvents = SEED_EVENTS[citySlug] || [];
        if (seedEvents.length > 0) {
          const transformedSeeds = seedEvents.map(seed => this.transformSeedEvent(seed, citySlug, cityInfo.country));
          const saveResult = await this.saveToDatabase(transformedSeeds, citySlug);
          
          totalProcessed += seedEvents.length;
          totalCreated += saveResult.created;
          totalUpdated += saveResult.updated;
          
          this.log(`Loaded ${seedEvents.length} seed events for ${citySlug}`);
        }
      }

      // Phase 2: Try Wikidata for additional events (optional, may timeout)
      this.log('Attempting Wikidata enrichment...');
      for (const [citySlug, cityInfo] of Object.entries(CITY_WIKIDATA_IDS)) {
        try {
          const rawData = await this.fetchEventsForCity(citySlug, cityInfo.qId);
          if (rawData.length > 0) {
            this.log(`Fetched ${rawData.length} Wikidata events for ${citySlug}`);
            const validRecords = rawData.filter(item => this.validate(item));
            const transformedRecords = validRecords.map(item => 
              this.transform(item, citySlug, cityInfo.country)
            );
            const saveResult = await this.saveToDatabase(transformedRecords, citySlug);
            
            totalProcessed += rawData.length;
            totalCreated += saveResult.created;
            totalUpdated += saveResult.updated;
          }
        } catch (error) {
          // Wikidata errors are non-fatal - we have seed data
          const message = error instanceof Error ? error.message : String(error);
          this.log(`Wikidata unavailable for ${citySlug}: ${message}`);
        }

        // Rate limit: 2 second delay between cities for Wikidata
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      const result = this.createResult({
        recordsProcessed: totalProcessed,
        recordsCreated: totalCreated,
        recordsUpdated: totalUpdated,
        durationMs: Date.now() - startTime,
        errors,
      });

      this.log('Events ingestion completed', result);
      return result;
    } catch (error) {
      this.logError('Events ingestion failed', error);
      
      return this.createResult({
        durationMs: Date.now() - startTime,
        errors: [{
          message: error instanceof Error ? error.message : String(error),
        }],
      });
    }
  }

  /**
   * Transform a seed event into the standard format
   */
  private transformSeedEvent(
    seed: { name: string; description: string; eventType: TransformedEvent['eventType']; monthStart: number; dayStart: number; duration: number; venue?: string },
    citySlug: string,
    countryCode: string
  ): TransformedEvent {
    // Calculate start date for next occurrence
    const now = new Date();
    const currentYear = now.getFullYear();
    let startDate = new Date(currentYear, seed.monthStart - 1, seed.dayStart);
    
    // If the date has passed this year, use next year
    if (startDate < now) {
      startDate = new Date(currentYear + 1, seed.monthStart - 1, seed.dayStart);
    }
    
    // Calculate end date
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + seed.duration - 1);
    
    return {
      wikidataId: `seed-${citySlug}-${seed.name.toLowerCase().replace(/\s+/g, '-')}`,
      name: seed.name,
      description: seed.description,
      eventType: seed.eventType,
      venue: seed.venue || null,
      startDate,
      endDate: seed.duration > 1 ? endDate : null,
      ticketUrl: null,
      imageUrl: null,
      citySlug,
      countryCode,
    };
  }

  validate(data: unknown): boolean {
    if (!data || typeof data !== 'object') return false;
    
    const record = data as WikidataEvent;
    // Must have an event ID and label
    return Boolean(record.event?.value && record.eventLabel?.value);
  }

  transform(data: unknown, citySlug: string, countryCode: string): TransformedEvent {
    const record = data as WikidataEvent;
    
    // Extract Wikidata Q ID
    const wikidataId = record.event.value.split('/').pop() || '';
    
    // Determine event type
    const eventTypeLabel = (record.eventTypeLabel?.value || '').toLowerCase();
    let eventType: TransformedEvent['eventType'] = 'cultural'; // Default to cultural for misc events
    
    for (const [keyword, type] of Object.entries(EVENT_TYPE_MAP)) {
      if (eventTypeLabel.includes(keyword)) {
        eventType = type;
        break;
      }
    }
    
    // Parse dates - use current year for recurring events without specific dates
    let startDate = new Date();
    let endDate: Date | null = null;
    
    if (record.startDate?.value) {
      startDate = new Date(record.startDate.value);
    }
    if (record.endDate?.value) {
      endDate = new Date(record.endDate.value);
    }
    
    // For recurring annual events, project to next occurrence
    const now = new Date();
    if (startDate < now && !endDate) {
      // Move to next year if the date has passed
      startDate.setFullYear(now.getFullYear());
      if (startDate < now) {
        startDate.setFullYear(now.getFullYear() + 1);
      }
    }
    
    return {
      wikidataId,
      name: record.eventLabel.value,
      description: record.description?.value || null,
      eventType,
      venue: record.locationLabel?.value || null,
      startDate,
      endDate,
      ticketUrl: record.website?.value || null,
      imageUrl: record.image?.value || null,
      citySlug,
      countryCode,
    };
  }

  /**
   * Fetch events for a specific city from Wikidata SPARQL
   */
  private async fetchEventsForCity(citySlug: string, qId: string): Promise<WikidataEvent[]> {
    // Simplified SPARQL query - focus on festivals directly in/near this city
    // Using P276 (location) and P131 (located in) with limited depth for speed
    const sparqlQuery = `
      SELECT DISTINCT ?event ?eventLabel ?description ?startDate ?endDate ?locationLabel ?eventTypeLabel ?image ?website
      WHERE {
        # Get festivals/events that mention this city as their location
        ?event wdt:P276 wd:${qId} .
        
        # Must be an instance of festival or recurring event
        ?event wdt:P31 ?instanceOf .
        ?instanceOf rdfs:label ?eventTypeLabel .
        FILTER (lang(?eventTypeLabel) = "en")
        
        # Event type constraints - festivals, film festivals, music festivals, sporting events
        VALUES ?instanceOf { wd:Q132241 wd:Q220505 wd:Q753111 wd:Q16510064 wd:Q27968055 }
        
        OPTIONAL { ?event schema:description ?description . FILTER (lang(?description) = "en") }
        OPTIONAL { ?event wdt:P580 ?startDate }
        OPTIONAL { ?event wdt:P582 ?endDate }
        OPTIONAL { ?event wdt:P276 ?loc . ?loc rdfs:label ?locationLabel . FILTER (lang(?locationLabel) = "en") }
        OPTIONAL { ?event wdt:P18 ?image }
        OPTIONAL { ?event wdt:P856 ?website }
        
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
      }
      LIMIT 25
    `;

    const url = `${this.source.baseUrl}?format=json&query=${encodeURIComponent(sparqlQuery)}`;
    
    this.log(`Fetching events for ${citySlug} (${qId})`);
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/sparql-results+json',
        'User-Agent': 'Travi-CMS/1.0 (Travel Events Service; contact@travi.travel)',
      },
      signal: AbortSignal.timeout(15000), // 15 second timeout
    });

    if (!response.ok) {
      throw new Error(`Wikidata API returned status ${response.status}: ${response.statusText}`);
    }

    const data: WikidataResponse = await response.json();
    
    if (!data.results?.bindings) {
      return [];
    }

    return data.results.bindings;
  }

  private async saveToDatabase(records: TransformedEvent[], citySlug: string): Promise<{ created: number; updated: number }> {
    this.log(`Saving ${records.length} event records for ${citySlug}`);
    
    let created = 0;
    let updated = 0;

    // Find destination ID for this city (ID IS the city slug in our database)
    const dest = await db
      .select({ id: destinations.id })
      .from(destinations)
      .where(eq(destinations.id, citySlug))
      .limit(1);

    if (dest.length === 0) {
      this.log(`No destination found for city: ${citySlug}, skipping`);
      return { created: 0, updated: 0 };
    }

    const destinationId = dest[0].id;

    for (const record of records) {
      try {
        // Check if event already exists by source (wikidataId in name match)
        const existingEvent = await db
          .select({ id: destinationEvents.id })
          .from(destinationEvents)
          .where(
            and(
              eq(destinationEvents.destinationId, destinationId),
              eq(destinationEvents.name, record.name)
            )
          )
          .limit(1);

        if (existingEvent.length > 0) {
          // Update existing event
          await db
            .update(destinationEvents)
            .set({
              description: record.description,
              eventType: record.eventType,
              venue: record.venue,
              startDate: record.startDate,
              endDate: record.endDate,
              ticketUrl: record.ticketUrl,
              imageUrl: record.imageUrl,
              updatedAt: new Date(),
            })
            .where(eq(destinationEvents.id, existingEvent[0].id));
          updated++;
        } else {
          // Create new event
          await db.insert(destinationEvents).values({
            destinationId,
            name: record.name,
            description: record.description,
            eventType: record.eventType,
            venue: record.venue,
            startDate: record.startDate,
            endDate: record.endDate,
            ticketUrl: record.ticketUrl,
            imageUrl: record.imageUrl,
            status: 'upcoming',
            featured: false,
          });
          created++;
        }
      } catch (error) {
        this.logError(`Failed to save event: ${record.name}`, error);
      }
    }

    this.log(`Events saved for ${citySlug}: ${created} created, ${updated} updated`);
    return { created, updated };
  }
}
