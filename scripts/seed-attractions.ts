import { db } from "../server/db";
import { contents, attractions } from "../shared/schema";
import { sql } from "drizzle-orm";

const attractionsData = [
  {
    title: "Global Village Dubai",
    slug: "global-village-dubai",
    category: "Theme Parks",
    priceFrom: "25",
    location: "Sheikh Mohammed Bin Zayed Road",
    description: "Experience the world under one roof at this spectacular multicultural festival park featuring pavilions from over 90 countries, live entertainment, global cuisine, and thrilling rides."
  },
  {
    title: "Dubai Mall Attractions",
    slug: "dubai-mall-attractions",
    category: "Theme Parks",
    priceFrom: "69",
    location: "Downtown Dubai",
    description: "Explore the endless entertainment options at the world's largest shopping destination, featuring VR Park, KidZania, an Olympic-sized ice rink, and the famous Dubai Aquarium."
  },
  {
    title: "Dubai Miracle Garden",
    slug: "dubai-miracle-garden",
    category: "Parks",
    priceFrom: "89",
    location: "Al Barsha South",
    description: "Wander through the world's largest natural flower garden showcasing over 150 million blooming flowers arranged in stunning displays, heart-shaped arches, and the iconic Emirates A380 structure."
  },
  {
    title: "Dubai Aquarium & Underwater Zoo",
    slug: "dubai-aquarium",
    category: "Aquariums",
    priceFrom: "168",
    location: "Dubai Mall",
    description: "Dive into an underwater wonderland home to over 33,000 aquatic animals including sharks, rays, and the largest collection of sand tiger sharks, with glass-bottom boat rides and cage snorkeling experiences."
  },
  {
    title: "Dubai Frame",
    slug: "dubai-frame",
    category: "Landmarks",
    priceFrom: "48",
    location: "Zabeel Park",
    description: "Stand atop the world's largest picture frame for panoramic views connecting old and new Dubai, featuring a glass-floored Sky Deck at 150 meters and immersive galleries showcasing the city's evolution."
  },
  {
    title: "Dubai Safari Park",
    slug: "dubai-safari-park",
    category: "Zoos",
    priceFrom: "50",
    location: "Al Warqa'a",
    description: "Embark on an African adventure in the heart of Dubai, encountering over 3,000 animals across vast open habitats, including lions, giraffes, elephants, and rare species in their natural-like environments."
  },
  {
    title: "Museum of the Future",
    slug: "museum-of-the-future",
    category: "Museums",
    priceFrom: "169",
    location: "Sheikh Zayed Road",
    description: "Journey into tomorrow at this architectural marvel featuring immersive exhibits on AI, space colonization, and sustainable futures, housed in a stunning torus-shaped building covered in Arabic calligraphy."
  },
  {
    title: "The View at The Palm",
    slug: "the-view-at-the-palm",
    category: "Observation Decks",
    priceFrom: "93",
    location: "Palm Jumeirah",
    description: "Ascend to the 52nd floor of The Palm Tower for breathtaking 360-degree views of the iconic Palm Jumeirah, Arabian Gulf, and Dubai's stunning skyline from the observation deck."
  },
  {
    title: "AYA Universe",
    slug: "aya-universe",
    category: "Immersive Experiences",
    priceFrom: "96",
    location: "WAFI City Mall",
    description: "Step into a mesmerizing journey through 12 cosmic zones featuring cutting-edge light projections, interactive installations, and surreal digital landscapes that blur the line between reality and imagination."
  },
  {
    title: "Ain Dubai",
    slug: "ain-dubai",
    category: "Landmarks",
    priceFrom: "145",
    location: "Bluewaters Island",
    description: "Soar above the city on the world's largest and tallest observation wheel, offering spectacular 360-degree views of Dubai's coastline, Palm Jumeirah, and the glittering skyline from 250 meters."
  },
  {
    title: "Green Planet Dubai",
    slug: "green-planet-dubai",
    category: "Zoos",
    priceFrom: "116",
    location: "City Walk",
    description: "Explore a tropical rainforest ecosystem under a bio-dome housing over 3,000 plants and animals, from colorful birds and sloths to fascinating reptiles and the world's largest indoor man-made tree."
  },
  {
    title: "Aquaventure Waterpark",
    slug: "aquaventure-waterpark",
    category: "Water Parks",
    priceFrom: "135",
    location: "Atlantis The Palm",
    description: "Plunge into the Middle East's largest waterpark featuring record-breaking slides, a 1.6km river rapids ride, Shark Lagoon encounters, and the ultimate Leap of Faith through a shark-filled tunnel."
  },
  {
    title: "Wild Wadi Waterpark",
    slug: "wild-wadi-waterpark",
    category: "Water Parks",
    priceFrom: "179",
    location: "Jumeirah Beach",
    description: "Experience 30 exhilarating rides and attractions themed around the tale of Juha, including interconnected rivers, wave pools, and the legendary Jumeirah Sceirah speed slide reaching 80 km/h."
  },
  {
    title: "Dubai Dolphinarium",
    slug: "dubai-dolphinarium",
    category: "Zoos",
    priceFrom: "50",
    location: "Creek Park",
    description: "Witness captivating performances by dolphins and seals, enjoy swimming sessions with these intelligent creatures, and explore the exotic bird show and mirror maze at this family-friendly venue."
  },
  {
    title: "XLine Dubai Marina Zipline",
    slug: "xline-dubai-marina",
    category: "Landmarks",
    priceFrom: "685",
    location: "Dubai Marina",
    description: "Feel the ultimate adrenaline rush zooming across Dubai Marina on the world's longest urban zipline, traveling 1 kilometer at speeds up to 80 km/h with stunning skyline views."
  },
  {
    title: "House of Hype",
    slug: "house-of-hype",
    category: "Immersive Experiences",
    priceFrom: "110",
    location: "Dubai Hills Mall",
    description: "Immerse yourself in a world of viral content creation with 15 uniquely themed rooms designed for the perfect social media moments, featuring interactive art installations and optical illusions."
  },
  {
    title: "Motiongate Dubai",
    slug: "motiongate-dubai",
    category: "Theme Parks",
    priceFrom: "230",
    location: "Dubai Parks and Resorts",
    description: "Live the magic of Hollywood at the region's largest theme park, featuring thrilling attractions from DreamWorks, Sony Pictures, and Lionsgate including Hunger Games and Madagascar zones."
  },
  {
    title: "Dubai Garden Glow",
    slug: "dubai-garden-glow",
    category: "Parks",
    priceFrom: "62.50",
    location: "Zabeel Park",
    description: "Marvel at millions of LED lights transformed into stunning displays across four themed parks: Glow Park, Dinosaur Park, Ice Park, and Art Park, creating a magical nighttime wonderland."
  },
  {
    title: "Sky Views Observatory",
    slug: "sky-views-observatory",
    category: "Observation Decks",
    priceFrom: "80",
    location: "Downtown Dubai",
    description: "Experience Dubai from new heights with the Sky Views Observatory offering panoramic city views, a thrilling glass slide between towers, and an edge walk around the building's exterior."
  },
  {
    title: "Big Bus Dubai",
    slug: "big-bus-dubai",
    category: "Tours",
    priceFrom: "200",
    location: "Various Locations",
    description: "Discover Dubai's iconic landmarks aboard open-top double-decker buses with hop-on-hop-off flexibility, multilingual audio guides, and access to all major attractions across multiple routes."
  },
  {
    title: "LEGOLAND Dubai",
    slug: "legoland-dubai",
    category: "Theme Parks",
    priceFrom: "228",
    location: "Dubai Parks and Resorts",
    description: "Build unforgettable family memories at this LEGO-themed wonderland featuring over 40 rides, shows, and building experiences designed for children aged 2-12 with interactive play zones."
  },
  {
    title: "Expo City Dubai",
    slug: "expo-city-dubai",
    category: "Theme Parks",
    priceFrom: "75",
    location: "Expo 2020 Site",
    description: "Explore the lasting legacy of World Expo 2020 featuring futuristic pavilions, the stunning Al Wasl dome, innovative sustainability exhibits, and immersive cultural experiences."
  },
  {
    title: "Deep Dive Dubai",
    slug: "deep-dive-dubai",
    category: "Immersive Experiences",
    priceFrom: "400",
    location: "Nad Al Sheba",
    description: "Plunge into the world's deepest diving pool at 60 meters, featuring a sunken city, underwater film studio, and unique diving experiences for beginners and certified divers alike."
  },
  {
    title: "Madame Tussauds Dubai",
    slug: "madame-tussauds-dubai",
    category: "Museums",
    priceFrom: "56",
    location: "Bluewaters Island",
    description: "Strike a pose with incredibly lifelike wax figures of international celebrities, sports legends, world leaders, and regional icons in themed interactive zones designed for memorable photos."
  },
  {
    title: "Museum of Illusions",
    slug: "museum-of-illusions",
    category: "Museums",
    priceFrom: "75",
    location: "Al Seef",
    description: "Challenge your perception through mind-bending optical illusions, holograms, and interactive exhibits that play tricks on your senses, perfect for curious minds of all ages."
  },
  {
    title: "Museum of Candy",
    slug: "museum-of-candy",
    category: "Museums",
    priceFrom: "113",
    location: "Dubai Hills Mall",
    description: "Satisfy your sweet tooth in a whimsical world of candy-themed rooms, interactive installations, and delicious treats across colorful zones designed for Instagram-worthy moments."
  },
  {
    title: "ARTE Museum Dubai",
    slug: "arte-museum-dubai",
    category: "Museums",
    priceFrom: "119",
    location: "Dubai Mall",
    description: "Immerse yourself in Korea's largest digital art exhibition featuring ethereal projections of nature, infinity mirror rooms, and interactive installations across 10 mesmerizing themed zones."
  },
  {
    title: "OliOli Children's Museum",
    slug: "olioli-childrens-museum",
    category: "Museums",
    priceFrom: "69",
    location: "Al Quoz",
    description: "Ignite young imaginations at this hands-on play museum featuring 8 interactive galleries with over 40 exhibits designed by psychologists and educators for children up to 11 years."
  },
  {
    title: "Al Shindagha Museum",
    slug: "al-shindagha-museum",
    category: "Museums",
    priceFrom: "30",
    location: "Al Shindagha Historical District",
    description: "Journey through Dubai's heritage in this restored historical district, exploring traditional Emirati life, pearling history, perfumery, and the founding story of modern Dubai."
  },
  {
    title: "Real Madrid World",
    slug: "real-madrid-world",
    category: "Theme Parks",
    priceFrom: "175",
    location: "Dubai Parks and Resorts",
    description: "Live the passion of Real Madrid at the world's first Real Madrid theme park, featuring thrilling rides, football experiences, and exclusive access to the legendary club's history."
  },
  {
    title: "IMG Worlds of Adventure",
    slug: "img-worlds-of-adventure",
    category: "Theme Parks",
    priceFrom: "199",
    location: "Sheikh Mohammed Bin Zayed Road",
    description: "Explore the world's largest indoor theme park featuring Marvel superheroes, Cartoon Network characters, and Lost Valley dinosaurs across four epic adventure zones with thrilling rides."
  },
  {
    title: "Dubai Dhow Cruise",
    slug: "dubai-dhow-cruise",
    category: "Cruises",
    priceFrom: "60",
    location: "Dubai Creek / Marina",
    description: "Glide along Dubai's waterways aboard a traditional wooden dhow, savoring an international buffet dinner, live entertainment, and spectacular views of illuminated landmarks."
  }
];

async function seedAttractions() {
  console.log("Starting to seed attractions...");
  
  for (const attraction of attractionsData) {
    try {
      const existingContent = await db.select()
        .from(contents)
        .where(sql`slug = ${attraction.slug}`)
        .limit(1);
      
      if (existingContent.length > 0) {
        console.log(`Updating existing: ${attraction.title}`);
        await db.update(attractions)
          .set({ 
            category: attraction.category, 
            priceFrom: attraction.priceFrom,
            location: attraction.location
          })
          .where(sql`content_id = ${existingContent[0].id}`);
      } else {
        console.log(`Creating new: ${attraction.title}`);
        const [newContent] = await db.insert(contents).values({
          type: "attraction",
          status: "published",
          title: attraction.title,
          slug: attraction.slug,
          metaDescription: attraction.description,
          primaryKeyword: attraction.title.toLowerCase(),
        }).returning();
        
        await db.insert(attractions).values({
          contentId: newContent.id,
          location: attraction.location,
          category: attraction.category,
          priceFrom: attraction.priceFrom,
        });
      }
    } catch (error) {
      console.error(`Error processing ${attraction.title}:`, error);
    }
  }
  
  console.log("Seeding complete!");
}

seedAttractions().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
