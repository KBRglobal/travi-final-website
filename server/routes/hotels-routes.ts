import type { Express, Request, Response } from "express";
import { generateHotelDescription } from "../ai/hotel-description-generator";

// Sample hotel data for fallback
const sampleHotels = [
  {
    id: "1",
    name: "The Luxury Palace Hotel",
    stars: 5,
    rating: "9.2",
    reviews: 2500,
    price: 450,
    currency: "USD",
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop&q=80",
    location: { name: "Downtown", city: "Dubai", country: "UAE" },
    amenities: ["WiFi", "Pool", "Spa", "Restaurant", "Gym"],
  },
  {
    id: "2",
    name: "Grand Marina Resort",
    stars: 5,
    rating: "9.0",
    reviews: 1800,
    price: 380,
    currency: "USD",
    image: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&h=600&fit=crop&q=80",
    location: { name: "Marina", city: "Dubai", country: "UAE" },
    amenities: ["WiFi", "Beach", "Pool", "Restaurant"],
  },
  {
    id: "3",
    name: "City Center Boutique",
    stars: 4,
    rating: "8.8",
    reviews: 1200,
    price: 220,
    currency: "USD",
    image: "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&h=600&fit=crop&q=80",
    location: { name: "City Center", city: "Dubai", country: "UAE" },
    amenities: ["WiFi", "Restaurant", "Gym"],
  },
];

// Xotelo location key mapping (based on TripAdvisor geo IDs)
const xoteloLocationKeys: Record<string, { key: string; name: string }> = {
  dubai: { key: "g295424", name: "Dubai" },
  "abu-dhabi": { key: "g294013", name: "Abu Dhabi" },
  london: { key: "g186338", name: "London" },
  paris: { key: "g187147", name: "Paris" },
  "new-york": { key: "g60763", name: "New York" },
  tokyo: { key: "g298184", name: "Tokyo" },
  singapore: { key: "g294265", name: "Singapore" },
  bangkok: { key: "g293916", name: "Bangkok" },
  barcelona: { key: "g187497", name: "Barcelona" },
  rome: { key: "g187791", name: "Rome" },
  amsterdam: { key: "g188590", name: "Amsterdam" },
  "hong-kong": { key: "g294217", name: "Hong Kong" },
  istanbul: { key: "g293974", name: "Istanbul" },
  "las-vegas": { key: "g45963", name: "Las Vegas" },
  "los-angeles": { key: "g32655", name: "Los Angeles" },
  miami: { key: "g34438", name: "Miami" },
};

export function registerHotelsRoutes(app: Express): void {
  // Location lookup for hotel search
  app.get("/api/hotels/lookup", async (req: Request, res: Response) => {
    try {
      const { query, lang = "en", limit = 10 } = req.query;

      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Query parameter is required" });
      }

      const tpoToken = process.env.TPO_API_TOKEN;
      if (!tpoToken) {
        return res.json({ locations: [], hotels: [] });
      }

      const url = `http://engine.hotellook.com/api/v2/lookup.json?query=${encodeURIComponent(query)}&lang=${lang}&lookFor=both&limit=${limit}&token=${tpoToken}`;

      const response = await fetch(url, {
        headers: { "X-Access-Token": tpoToken },
      });

      if (!response.ok) {
        return res.json({ locations: [], hotels: [] });
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.json({ locations: [], hotels: [] });
    }
  });

  // Hotel search by city with dates, pagination, and filters
  app.get("/api/hotels/search", async (req: Request, res: Response) => {
    try {
      const {
        cityId,
        checkIn,
        checkOut,
        adults = 2,
        lang = "en",
        currency = "usd",
        page = 1,
        pageSize = 20,
        minPrice,
        maxPrice,
        amenities,
        minRating,
        stars,
      } = req.query;

      if (!cityId) {
        return res.status(400).json({ error: "cityId is required" });
      }

      const pageNum = Math.max(1, Number.parseInt(String(page), 10) || 1);
      const pageSizeNum = Math.min(50, Math.max(1, Number.parseInt(String(pageSize), 10) || 20));
      const minPriceNum = minPrice ? Number.parseFloat(String(minPrice)) : null;
      const maxPriceNum = maxPrice ? Number.parseFloat(String(maxPrice)) : null;
      const minRatingNum = minRating ? Number.parseFloat(String(minRating)) : null;
      const starsFilter = stars ? String(stars) : null;
      const amenitiesFilter = amenities
        ? String(amenities)
            .split(",")
            .map(a => a.trim().toLowerCase())
        : [];

      const tpoToken = process.env.TPO_API_TOKEN;
      if (!tpoToken) {
        const paginatedSample = sampleHotels.slice(
          (pageNum - 1) * pageSizeNum,
          pageNum * pageSizeNum
        );
        return res.json({
          hotels: paginatedSample,
          source: "sample",
          message: "API key not configured. Showing sample data.",
          total: sampleHotels.length,
          page: pageNum,
          pageSize: pageSizeNum,
          totalPages: Math.ceil(sampleHotels.length / pageSizeNum),
        });
      }

      const citySlug = String(cityId).toLowerCase();
      const cityInfo = xoteloLocationKeys[citySlug];
      if (!cityInfo) {
        return res.status(400).json({
          error: `City "${citySlug}" not supported - must be one of: ${Object.keys(xoteloLocationKeys).join(", ")}`,
        });
      }

      // Use Xotelo free hotel list API
      const url = `https://data.xotelo.com/api/list?location_key=${cityInfo.key}&limit=100&offset=0&sort=best_value`;

      const response = await fetch(url);

      if (!response.ok) {
        return res.json({
          hotels: sampleHotels.slice(0, pageSizeNum),
          source: "sample",
          message: `API request failed (${response.status}). Showing sample data.`,
          total: sampleHotels.length,
          page: pageNum,
          pageSize: pageSizeNum,
          totalPages: Math.ceil(sampleHotels.length / pageSizeNum),
        });
      }

      const data = await response.json();
      const allHotels = data.result?.list || [];
      const totalFromApi = data.result?.total_count || allHotels.length;

      let hotels = allHotels
        .filter((hotel: any) => {
          const accommodationType = (hotel.accommodation_type || "").toLowerCase();
          if (
            !["hotel", "resort", "boutique hotel", "luxury hotel"].some(
              t => accommodationType.includes(t) || accommodationType === ""
            )
          ) {
            return false;
          }
          const rating = hotel.review_summary?.rating || 0;
          if (starsFilter === "5" && rating < 4.5) return false;
          if (starsFilter === "4" && (rating < 3.5 || rating >= 4.5)) return false;
          return true;
        })
        .map((hotel: any) => {
          const hotelKey = hotel.key || "";
          const hotelIdMatch = hotelKey.match(/d(\d+)/);
          const hotelId = hotelIdMatch ? hotelIdMatch[1] : hotelKey;

          return {
            id: hotelId,
            name: hotel.name || "Unknown Hotel",
            stars: Math.round(hotel.review_summary?.rating || 4),
            rating: hotel.review_summary?.rating
              ? (hotel.review_summary.rating * 2).toFixed(1)
              : null,
            reviews: hotel.review_summary?.count || 0,
            price: hotel.price_ranges?.minimum || hotel.price_ranges?.maximum || null,
            currency: String(currency).toUpperCase(),
            image:
              hotel.image ||
              "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop&q=80",
            location: {
              name: cityInfo.name,
              city: cityInfo.name,
            },
            amenities: hotel.mentions || [],
            bookingUrl: hotel.url || null,
            description: hotel.mentions ? hotel.mentions.join(", ") : null,
            hotelKey: hotelKey,
          };
        });

      if (minPriceNum !== null) {
        hotels = hotels.filter((h: any) => h.price !== null && h.price >= minPriceNum);
      }
      if (maxPriceNum !== null) {
        hotels = hotels.filter((h: any) => h.price !== null && h.price <= maxPriceNum);
      }
      if (minRatingNum !== null) {
        hotels = hotels.filter(
          (h: any) => h.rating !== null && Number.parseFloat(h.rating) >= minRatingNum
        );
      }
      if (amenitiesFilter.length > 0) {
        hotels = hotels.filter((h: any) => {
          const hotelAmenities = (h.amenities || []).map((a: string) => a.toLowerCase());
          return amenitiesFilter.some(af => hotelAmenities.some((ha: string) => ha.includes(af)));
        });
      }

      const total = hotels.length;
      const totalPages = Math.ceil(total / pageSizeNum);
      const startIdx = (pageNum - 1) * pageSizeNum;
      const paginatedHotels = hotels.slice(startIdx, startIdx + pageSizeNum);

      res.json({
        hotels:
          paginatedHotels.length > 0
            ? paginatedHotels
            : pageNum === 1
              ? sampleHotels.slice(0, pageSizeNum)
              : [],
        source: paginatedHotels.length > 0 ? "xotelo" : "sample",
        total,
        page: pageNum,
        pageSize: pageSizeNum,
        totalPages,
        totalFromApi,
      });
    } catch (error) {
      res.json({
        hotels: sampleHotels.slice(0, 20),
        source: "sample",
        message: "Search failed. Showing sample data.",
        total: sampleHotels.length,
        page: 1,
        pageSize: 20,
        totalPages: Math.ceil(sampleHotels.length / 20),
      });
    }
  });

  // Get hotel details by ID
  app.get("/api/hotels/:hotelId", async (req: Request, res: Response) => {
    try {
      const { hotelId } = req.params;
      const { lang = "en", aiDescription = "true" } = req.query;
      const enableAI = aiDescription !== "false";

      if (!hotelId) {
        return res.status(400).json({ error: "hotelId is required" });
      }

      const tpoToken = process.env.TPO_API_TOKEN;
      if (!tpoToken) {
        const sampleHotel =
          sampleHotels.find(h => String(h.id) === String(hotelId)) || sampleHotels[0];
        if (!sampleHotel) {
          return res.status(404).json({ error: "Hotel not found" });
        }

        let description =
          "Experience luxury and comfort at this stunning property. Featuring world-class amenities, exceptional service, and breathtaking views, this hotel offers an unforgettable stay for discerning travelers.";
        let seoTitle = `${sampleHotel.name} | ${sampleHotel.stars}-Star Luxury Hotel | TRAVI`;
        let seoDescription = `Book ${sampleHotel.name}, a ${sampleHotel.stars}-star luxury hotel in ${sampleHotel.location.city}. Experience premium amenities and exceptional service.`;
        let highlights: string[] = [];
        let aiGenerated = false;

        if (enableAI) {
          const aiContent = await generateHotelDescription(
            {
              id: String(sampleHotel.id),
              name: sampleHotel.name,
              stars: sampleHotel.stars,
              location: sampleHotel.location,
              amenities: sampleHotel.amenities,
              rating: Number.parseFloat(sampleHotel.rating),
              reviews: sampleHotel.reviews,
            },
            String(lang)
          );

          if (aiContent) {
            description = aiContent.description;
            seoTitle = aiContent.seoTitle;
            seoDescription = aiContent.seoDescription;
            highlights = aiContent.highlights;
            aiGenerated = true;
          }
        }

        return res.json({
          hotel: {
            ...sampleHotel,
            description,
            seoTitle,
            seoDescription,
            highlights,
            gallery: [
              sampleHotel?.image ||
                "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop&q=80",
            ],
            facilities: [
              "WiFi",
              "Pool",
              "Spa",
              "Restaurant",
              "Fitness Center",
              "Parking",
              "Room Service",
              "Concierge",
            ],
          },
          source: "sample",
          aiGenerated,
        });
      }

      const url = `http://engine.hotellook.com/api/v2/static/hotels.json?hotelIds=${hotelId}&lang=${lang}&token=${tpoToken}`;

      const response = await fetch(url, {
        headers: { "X-Access-Token": tpoToken },
      });

      if (!response.ok) {
        const sampleHotel = sampleHotels[0];
        if (!sampleHotel) {
          return res.status(404).json({ error: "Hotel not found" });
        }

        let description = "Experience luxury and comfort at this stunning property.";
        let seoTitle = `${sampleHotel.name} | ${sampleHotel.stars}-Star Luxury Hotel | TRAVI`;
        let seoDescription = `Book ${sampleHotel.name} in ${sampleHotel.location.city}. Premium amenities and exceptional service.`;
        let highlights: string[] = [];
        let aiGenerated = false;

        if (enableAI) {
          const aiContent = await generateHotelDescription(
            {
              id: String(sampleHotel.id),
              name: sampleHotel.name,
              stars: sampleHotel.stars,
              location: sampleHotel.location,
              amenities: sampleHotel.amenities,
              rating: Number.parseFloat(sampleHotel.rating),
              reviews: sampleHotel.reviews,
            },
            String(lang)
          );

          if (aiContent) {
            description = aiContent.description;
            seoTitle = aiContent.seoTitle;
            seoDescription = aiContent.seoDescription;
            highlights = aiContent.highlights;
            aiGenerated = true;
          }
        }

        return res.json({
          hotel: {
            ...sampleHotel,
            description,
            seoTitle,
            seoDescription,
            highlights,
            gallery: [sampleHotel?.image],
            facilities: ["WiFi", "Pool", "Spa", "Restaurant", "Fitness Center"],
          },
          source: "sample",
          aiGenerated,
        });
      }

      const data = await response.json();
      const hotelData = data.hotels?.[0] || data[0];

      if (!hotelData) {
        return res.status(404).json({ error: "Hotel not found" });
      }

      const hotel: any = {
        id: hotelData.id || hotelId,
        name: hotelData.name || hotelData.hotelName,
        stars: hotelData.stars || 0,
        rating: hotelData.rating ? (hotelData.rating / 10).toFixed(1) : null,
        reviews: hotelData.reviews || 0,
        price: hotelData.priceFrom || hotelData.price || null,
        currency: "USD",
        image:
          hotelData.photos?.[0]?.url ||
          (hotelData.id
            ? `https://photo.hotellook.com/image_v2/limit/${hotelData.id}/1/800x600.jpg`
            : "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop&q=80"),
        location: {
          name: hotelData.location?.name || hotelData.address || "",
          city: hotelData.location?.city || hotelData.cityName || "",
          country: hotelData.location?.country || hotelData.countryName || "",
          lat: hotelData.location?.lat || hotelData.latitude,
          lon: hotelData.location?.lon || hotelData.longitude,
        },
        amenities: hotelData.amenities || [],
        facilities: hotelData.facilities ||
          hotelData.amenities || ["WiFi", "Pool", "Spa", "Restaurant"],
        description:
          hotelData.description ||
          hotelData.desc ||
          "Experience luxury and comfort at this stunning property. Featuring world-class amenities and exceptional service.",
        gallery: (hotelData.photos || []).map(
          (p: any) =>
            p.url ||
            `https://photo.hotellook.com/image_v2/limit/${hotelData.id}/${p.id || 1}/800x600.jpg`
        ),
        bookingUrl: hotelData.fullUrl || null,
        checkInTime: hotelData.checkIn || "14:00",
        checkOutTime: hotelData.checkOut || "12:00",
        seoTitle: `${hotelData.name || hotelData.hotelName} | ${hotelData.stars || 5}-Star Luxury Hotel | TRAVI`,
        seoDescription:
          "Book " +
          (hotelData.name || hotelData.hotelName) +
          (hotelData.location?.city || hotelData.cityName
            ? " in " + (hotelData.location?.city || hotelData.cityName)
            : "") +
          ". Premium amenities and exceptional service.",
        highlights: [],
      };

      if (hotel.gallery.length === 0) {
        hotel.gallery = [hotel.image];
        for (let i = 2; i <= 5; i++) {
          hotel.gallery.push(
            `https://photo.hotellook.com/image_v2/limit/${hotelData.id}/${i}/800x600.jpg`
          );
        }
      }

      let aiGenerated = false;
      if (enableAI) {
        const aiContent = await generateHotelDescription(
          {
            id: String(hotel.id),
            name: hotel.name,
            stars: hotel.stars,
            location: hotel.location,
            amenities: hotel.amenities,
            facilities: hotel.facilities,
            rating: hotel.rating ? Number.parseFloat(hotel.rating) : null,
            reviews: hotel.reviews,
          },
          String(lang)
        );

        if (aiContent) {
          hotel.description = aiContent.description;
          hotel.seoTitle = aiContent.seoTitle;
          hotel.seoDescription = aiContent.seoDescription;
          hotel.highlights = aiContent.highlights;
          aiGenerated = true;
        }
      }

      res.json({ hotel, source: "api", aiGenerated });
    } catch (error) {
      const sampleHotel = sampleHotels[0];
      res.json({
        hotel: {
          ...sampleHotel,
          description: "Experience luxury and comfort at this stunning property.",
          seoTitle: `${sampleHotel?.name || "Luxury Hotel"} | TRAVI`,
          seoDescription: "Book this luxury hotel for an exceptional experience.",
          highlights: [],
          gallery: [sampleHotel?.image],
          facilities: ["WiFi", "Pool", "Spa", "Restaurant"],
        },
        source: "sample",
        aiGenerated: false,
      });
    }
  });

  // Get popular/curated hotel selections for a city
  app.get("/api/hotels/popular/:cityId", async (req: Request, res: Response) => {
    try {
      const { cityId } = req.params;

      if (!cityId) {
        return res.status(400).json({ error: "cityId is required" });
      }

      const tpoToken = process.env.TPO_API_TOKEN;
      if (!tpoToken) {
        return res.json({
          selections: [],
          hotels: sampleHotels,
          source: "sample",
        });
      }

      const url = `http://yasen.hotellook.com/tp/public/available_selections.json?id=${cityId}&token=${tpoToken}`;

      const response = await fetch(url, {
        headers: { "X-Access-Token": tpoToken },
      });

      if (!response.ok) {
        return res.json({
          selections: [],
          hotels: sampleHotels,
          source: "sample",
        });
      }

      const data = await response.json();
      res.json({
        selections: data || [],
        source: "api",
      });
    } catch (error) {
      res.json({
        selections: [],
        hotels: sampleHotels,
        source: "sample",
      });
    }
  });
}
