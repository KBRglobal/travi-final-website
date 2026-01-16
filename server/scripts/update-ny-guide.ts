import fs from 'fs';
import path from 'path';
import { db } from '../db';
import { sql } from 'drizzle-orm';

async function updateNYGuide() {
  try {
    // Read the full HTML content
    const contentPath = path.join(process.cwd(), 'server/data/new-york-guide-full-content.html');
    const fullContent = fs.readFileSync(contentPath, 'utf-8');
    
    console.log(`Read ${fullContent.length} characters of content`);
    
    // Update the guide in the database
    const result = await db.execute(sql`
      UPDATE update_9987_guides 
      SET 
        rewritten_content = ${fullContent},
        status = 'published',
        meta_title = 'New York Travel Guide 2026: Costs, Hotels, Attractions | TRAVI',
        meta_description = 'Discover NYC in 2026: honest costs from $150/day, best hotels from $100, top attractions, real traveler tips. Complete guide for first-time visitors.',
        focus_keyword = 'New York travel guide 2026',
        updated_at = NOW()
      WHERE slug = 'new-york-travel-guide'
    `);
    
    console.log('Update result:', result);
    console.log('New York guide updated successfully with full content!');
    
    // Also update the structured FAQs
    const faqs = JSON.stringify([
      { question: "Is New York City safe for tourists in 2026?", answer: "Yes, New York City is very safe for tourists. It ranks among the safest large cities in the United States with a violent crime rate lower than Chicago, Philadelphia, or Houston. Manhattan, Brooklyn's tourist areas (Williamsburg, DUMBO, Park Slope), and Queens neighborhoods like Astoria are particularly safe. Standard urban precautions apply." },
      { question: "How many days do I need in New York City?", answer: "Plan for 4-5 days for a first visit to see major highlights including the Statue of Liberty, Empire State Building, Central Park, museums, and Brooklyn Bridge without rushing. Three days covers the absolute essentials but feels rushed. Seven days allows for deeper neighborhood exploration." },
      { question: "Is New York expensive for tourists?", answer: "New York can be expensive but offers options for every budget. Budget travelers can enjoy the city on $150-200 per day staying in hostels or outer-borough hotels, using the subway, eating street food, and visiting free attractions. Mid-range visitors typically spend $300-450 daily." },
      { question: "What's the best way to get around New York City?", answer: "The subway is the fastest and cheapest option for most trips covering all five boroughs for $2.90 per ride (OMNY tap-to-pay or MetroCard). It runs 24/7 with service every 3-10 minutes during the day. Walking is excellent for distances under 15-20 blocks." },
      { question: "Do I need to speak English to visit New York?", answer: "Basic English helps but isn't strictly necessary. Over 170 languages are spoken across the city's immigrant neighborhoods. Major tourist attractions, hotels, and most restaurants have multilingual staff. Translation apps like Google Translate work well." },
      { question: "When is the cheapest time to visit New York City?", answer: "January through mid-March (after New Year's and before spring break) offers the lowest hotel rates, often 40-50% cheaper than peak season. Hotels that charge $350 in October may drop to $150-200 in February." },
      { question: "Can I drink tap water in New York City?", answer: "Yes, New York City tap water is safe to drink and famously high-quality, sourced from protected Catskill Mountain watersheds. Restaurants serve it free upon request. Most locals drink tap water routinely." },
      { question: "What should I pack for New York City?", answer: "Pack comfortable walking shoes (you'll cover 15-20 kilometers daily), weather-appropriate clothing by season, a small backpack or crossbody bag, phone charger and portable battery, universal power adapter for international visitors (US uses 110V Type A/B plugs)." },
      { question: "Are there free things to do in New York City?", answer: "Absolutely. Free attractions include walking the Brooklyn Bridge, Staten Island Ferry, Central Park, High Line elevated park, Times Square, Grand Central Terminal, 9/11 Memorial pools, and numerous free museum hours." },
      { question: "Do I need a car in New York City?", answer: "No, and actively avoid renting a car. New York's subway, bus, taxi, and rideshare systems make car ownership unnecessary. Parking costs $30-60 per day in garages, traffic crawls at 7-10 km/h in Midtown." },
      { question: "What's the best area to stay in NYC for first-time visitors?", answer: "Midtown Manhattan offers the most convenient location for first-time visitors within walking distance of Times Square, Broadway theaters, Rockefeller Center, Grand Central, MoMA, and major subway lines." },
      { question: "Can I visit the Statue of Liberty crown?", answer: "Yes, but crown access requires separate tickets ($25.50 adult) that sell out 3-6 months in advance. The narrow 162-step spiral staircase accommodates only small groups at timed intervals." },
      { question: "Is tipping required in New York restaurants?", answer: "Yes, tipping is expected and considered part of service workers' income, not optional. Standard restaurant tipping is 18-20% of the pre-tax bill. Bar drinks: $1-2 per drink or 20% of tab." },
      { question: "What are the best day trips from New York City?", answer: "Top day trips include the Hamptons beach towns (2-3 hours by bus or train), Hudson Valley for hiking (90 minutes by Metro-North), Philadelphia for history (1.5 hours by Amtrak), Bear Mountain State Park for hiking." },
      { question: "Do I need travel insurance for New York?", answer: "Strongly recommended, especially for international visitors. US healthcare is extremely expensive without insurance; a simple emergency room visit costs $2,000-5,000, hospitalization $20,000+." }
    ]);
    
    await db.execute(sql`
      UPDATE update_9987_guides 
      SET structured_faqs = ${faqs}::jsonb
      WHERE slug = 'new-york-travel-guide'
    `);
    
    console.log('FAQs updated successfully!');
    
  } catch (error) {
    console.error('Error updating guide:', error);
    process.exit(1);
  }
}

updateNYGuide();
