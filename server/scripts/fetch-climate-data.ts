/**
 * Climate Data Fetcher - Open-Meteo API
 * Fetches real historical weather data for all destinations
 * and stores seasonal averages in the database.
 * 
 * API: https://archive-api.open-meteo.com/v1/archive
 * No API key required.
 */

import { db } from "../db";
import { destinationContent, destinations } from "@shared/schema";
import { eq, and } from "drizzle-orm";

interface DestinationCoordinates {
  id: string;
  name: string;
  lat: number;
  lon: number;
  hemisphere: "north" | "south";
}

const DESTINATION_COORDS: DestinationCoordinates[] = [
  { id: "abu-dhabi", name: "Abu Dhabi", lat: 24.4539, lon: 54.3773, hemisphere: "north" },
  { id: "amsterdam", name: "Amsterdam", lat: 52.3676, lon: 4.9041, hemisphere: "north" },
  { id: "bangkok", name: "Bangkok", lat: 13.7563, lon: 100.5018, hemisphere: "north" },
  { id: "barcelona", name: "Barcelona", lat: 41.3851, lon: 2.1734, hemisphere: "north" },
  { id: "dubai", name: "Dubai", lat: 25.2048, lon: 55.2708, hemisphere: "north" },
  { id: "hong-kong", name: "Hong Kong", lat: 22.3193, lon: 114.1694, hemisphere: "north" },
  { id: "istanbul", name: "Istanbul", lat: 41.0082, lon: 28.9784, hemisphere: "north" },
  { id: "las-vegas", name: "Las Vegas", lat: 36.1699, lon: -115.1398, hemisphere: "north" },
  { id: "london", name: "London", lat: 51.5074, lon: -0.1278, hemisphere: "north" },
  { id: "los-angeles", name: "Los Angeles", lat: 34.0522, lon: -118.2437, hemisphere: "north" },
  { id: "miami", name: "Miami", lat: 25.7617, lon: -80.1918, hemisphere: "north" },
  { id: "new-york", name: "New York", lat: 40.7128, lon: -74.0060, hemisphere: "north" },
  { id: "paris", name: "Paris", lat: 48.8566, lon: 2.3522, hemisphere: "north" },
  { id: "rome", name: "Rome", lat: 41.9028, lon: 12.4964, hemisphere: "north" },
  { id: "singapore", name: "Singapore", lat: 1.3521, lon: 103.8198, hemisphere: "north" },
  { id: "tokyo", name: "Tokyo", lat: 35.6762, lon: 139.6503, hemisphere: "north" },
];

interface DailyData {
  time: string[];
  temperature_2m_mean: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_sum: number[];
  sunshine_duration: number[];
}

interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  daily: DailyData;
}

interface MonthlyStats {
  month: number;
  avgTemp: number;
  maxTemp: number;
  minTemp: number;
  avgPrecip: number;
  avgSunshineHours: number;
  dataPoints: number;
}

interface SeasonData {
  name: string;
  months: string;
  weatherDescription: string;
  crowdLevel: "Low" | "Medium" | "High";
  recommendation: string;
  avgTemp: number;
  avgPrecip: number;
  avgSunshineHours: number;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function getSeasonMonths(hemisphere: "north" | "south"): Record<string, number[]> {
  if (hemisphere === "north") {
    return {
      Winter: [12, 1, 2],
      Spring: [3, 4, 5],
      Summer: [6, 7, 8],
      Fall: [9, 10, 11],
    };
  } else {
    return {
      Summer: [12, 1, 2],
      Fall: [3, 4, 5],
      Winter: [6, 7, 8],
      Spring: [9, 10, 11],
    };
  }
}

function getMonthRange(months: number[]): string {
  const first = MONTH_NAMES[months[0] - 1].substring(0, 3);
  const last = MONTH_NAMES[months[months.length - 1] - 1].substring(0, 3);
  return `${first}-${last}`;
}

function determineCrowdLevel(seasonName: string, avgTemp: number, avgPrecip: number): "Low" | "Medium" | "High" {
  if (seasonName === "Summer") {
    if (avgTemp > 35) return "Medium";
    return "High";
  }
  if (seasonName === "Winter") {
    if (avgTemp < 5) return "Low";
    if (avgTemp > 20) return "High";
    return "Medium";
  }
  if (seasonName === "Spring" || seasonName === "Fall") {
    if (avgTemp >= 15 && avgTemp <= 28 && avgPrecip < 100) return "High";
    return "Medium";
  }
  return "Medium";
}

function generateWeatherDescription(
  seasonName: string,
  avgTemp: number,
  maxTemp: number,
  minTemp: number,
  avgPrecip: number,
  avgSunshineHours: number
): string {
  const tempDesc = avgTemp > 30 ? "hot" : avgTemp > 20 ? "warm" : avgTemp > 10 ? "mild" : avgTemp > 0 ? "cool" : "cold";
  const precipDesc = avgPrecip > 150 ? "significant rainfall" : avgPrecip > 80 ? "moderate rainfall" : avgPrecip > 30 ? "occasional showers" : "mostly dry conditions";
  const sunDesc = avgSunshineHours > 8 ? "abundant sunshine" : avgSunshineHours > 5 ? "good sunshine" : "limited sunshine";
  
  return `Expect ${tempDesc} weather with temperatures averaging ${avgTemp.toFixed(0)}°C (highs around ${maxTemp.toFixed(0)}°C, lows near ${minTemp.toFixed(0)}°C). ${precipDesc.charAt(0).toUpperCase() + precipDesc.slice(1)} with ${sunDesc} (${avgSunshineHours.toFixed(1)} hours daily).`;
}

function generateRecommendation(
  seasonName: string,
  destinationName: string,
  avgTemp: number,
  avgPrecip: number,
  crowdLevel: "Low" | "Medium" | "High"
): string {
  const crowdText = crowdLevel === "High" ? "peak tourist season, book accommodations early" : 
                    crowdLevel === "Medium" ? "moderate tourist activity with good availability" :
                    "fewer tourists, excellent for budget travelers";
  
  if (avgTemp > 35) {
    return `Very hot conditions - best for pool and indoor activities. ${crowdText.charAt(0).toUpperCase() + crowdText.slice(1)}.`;
  }
  if (avgTemp > 25 && avgPrecip < 100) {
    return `Ideal weather for outdoor exploration and sightseeing. ${crowdText.charAt(0).toUpperCase() + crowdText.slice(1)}.`;
  }
  if (avgTemp > 15 && avgTemp <= 25) {
    return `Pleasant temperatures perfect for walking tours and cultural visits. ${crowdText.charAt(0).toUpperCase() + crowdText.slice(1)}.`;
  }
  if (avgTemp > 5 && avgTemp <= 15) {
    return `Cool but comfortable - pack layers for morning and evening. ${crowdText.charAt(0).toUpperCase() + crowdText.slice(1)}.`;
  }
  if (avgTemp <= 5) {
    return `Cold winter weather - warm clothing essential. ${crowdText.charAt(0).toUpperCase() + crowdText.slice(1)}.`;
  }
  return `${crowdText.charAt(0).toUpperCase() + crowdText.slice(1)}.`;
}

async function fetchClimateData(dest: DestinationCoordinates, retryCount = 0): Promise<OpenMeteoResponse | null> {
  const endDate = new Date();
  endDate.setFullYear(endDate.getFullYear() - 1);
  const startDate = new Date(endDate);
  startDate.setFullYear(startDate.getFullYear() - 10);
  
  const startStr = startDate.toISOString().split("T")[0];
  const endStr = endDate.toISOString().split("T")[0];
  
  const url = `https://archive-api.open-meteo.com/v1/archive?` +
    `latitude=${dest.lat}&longitude=${dest.lon}&` +
    `start_date=${startStr}&end_date=${endStr}&` +
    `daily=temperature_2m_mean,temperature_2m_max,temperature_2m_min,precipitation_sum,sunshine_duration&` +
    `timezone=auto`;
  
  console.log(`[ClimateData] Fetching data for ${dest.name}${retryCount > 0 ? ` (retry ${retryCount})` : ""}...`);
  
  try {
    const response = await fetch(url);
    if (response.status === 429) {
      const maxRetries = 5;
      if (retryCount < maxRetries) {
        const backoffMs = Math.min(30000, 3000 * Math.pow(2, retryCount));
        console.log(`[ClimateData] Rate limited for ${dest.name}. Waiting ${backoffMs/1000}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        return fetchClimateData(dest, retryCount + 1);
      }
      console.error(`[ClimateData] Max retries reached for ${dest.name}`);
      return null;
    }
    if (!response.ok) {
      console.error(`[ClimateData] Failed to fetch ${dest.name}: ${response.status}`);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error(`[ClimateData] Error fetching ${dest.name}:`, error);
    return null;
  }
}

function calculateMonthlyStats(data: OpenMeteoResponse): MonthlyStats[] {
  const monthlyData: Record<number, {
    temps: number[];
    maxTemps: number[];
    minTemps: number[];
    precip: number[];
    sunshine: number[];
  }> = {};
  
  for (let i = 1; i <= 12; i++) {
    monthlyData[i] = { temps: [], maxTemps: [], minTemps: [], precip: [], sunshine: [] };
  }
  
  const { time, temperature_2m_mean, temperature_2m_max, temperature_2m_min, precipitation_sum, sunshine_duration } = data.daily;
  
  time.forEach((dateStr, i) => {
    const month = new Date(dateStr).getMonth() + 1;
    if (temperature_2m_mean[i] !== null) monthlyData[month].temps.push(temperature_2m_mean[i]);
    if (temperature_2m_max[i] !== null) monthlyData[month].maxTemps.push(temperature_2m_max[i]);
    if (temperature_2m_min[i] !== null) monthlyData[month].minTemps.push(temperature_2m_min[i]);
    if (precipitation_sum[i] !== null) monthlyData[month].precip.push(precipitation_sum[i]);
    if (sunshine_duration[i] !== null) monthlyData[month].sunshine.push(sunshine_duration[i] / 3600);
  });
  
  return Object.entries(monthlyData).map(([month, stats]) => {
    const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
    
    return {
      month: parseInt(month),
      avgTemp: avg(stats.temps),
      maxTemp: avg(stats.maxTemps),
      minTemp: avg(stats.minTemps),
      avgPrecip: sum(stats.precip) / (stats.precip.length / 30),
      avgSunshineHours: avg(stats.sunshine),
      dataPoints: stats.temps.length,
    };
  });
}

function aggregateToSeasons(
  monthlyStats: MonthlyStats[],
  dest: DestinationCoordinates
): SeasonData[] {
  const seasonMonths = getSeasonMonths(dest.hemisphere);
  const seasons: SeasonData[] = [];
  
  for (const [seasonName, months] of Object.entries(seasonMonths)) {
    const seasonStats = months.map(m => monthlyStats.find(s => s.month === m)!);
    
    const avgTemp = seasonStats.reduce((a, s) => a + s.avgTemp, 0) / seasonStats.length;
    const maxTemp = seasonStats.reduce((a, s) => a + s.maxTemp, 0) / seasonStats.length;
    const minTemp = seasonStats.reduce((a, s) => a + s.minTemp, 0) / seasonStats.length;
    const avgPrecip = seasonStats.reduce((a, s) => a + s.avgPrecip, 0) / seasonStats.length;
    const avgSunshineHours = seasonStats.reduce((a, s) => a + s.avgSunshineHours, 0) / seasonStats.length;
    
    const crowdLevel = determineCrowdLevel(seasonName, avgTemp, avgPrecip);
    
    seasons.push({
      name: seasonName,
      months: getMonthRange(months),
      weatherDescription: generateWeatherDescription(seasonName, avgTemp, maxTemp, minTemp, avgPrecip, avgSunshineHours),
      crowdLevel,
      recommendation: generateRecommendation(seasonName, dest.name, avgTemp, avgPrecip, crowdLevel),
      avgTemp: Math.round(avgTemp * 10) / 10,
      avgPrecip: Math.round(avgPrecip * 10) / 10,
      avgSunshineHours: Math.round(avgSunshineHours * 10) / 10,
    });
  }
  
  return seasons.sort((a, b) => {
    const order = ["Winter", "Spring", "Summer", "Fall"];
    return order.indexOf(a.name) - order.indexOf(b.name);
  });
}

async function storeSeasonData(destinationId: string, seasons: SeasonData[]): Promise<boolean> {
  try {
    const existing = await db.select()
      .from(destinationContent)
      .where(and(
        eq(destinationContent.destinationId, destinationId),
        eq(destinationContent.contentType, "seasons")
      ))
      .limit(1);
    
    const content = { seasons };
    
    if (existing.length > 0) {
      await db.update(destinationContent)
        .set({
          content,
          updatedAt: new Date(),
          qualityTier: "publish",
          generatedBy: "open-meteo",
          generatedModel: "historical-archive",
        })
        .where(eq(destinationContent.id, existing[0].id));
      console.log(`[ClimateData] Updated seasons for ${destinationId}`);
    } else {
      await db.insert(destinationContent).values({
        destinationId,
        contentType: "seasons",
        content,
        qualityTier: "publish",
        qualityScore: 100,
        generatedBy: "open-meteo",
        generatedModel: "historical-archive",
        version: 1,
        isActive: true,
      });
      console.log(`[ClimateData] Inserted seasons for ${destinationId}`);
    }
    
    return true;
  } catch (error) {
    console.error(`[ClimateData] Failed to store data for ${destinationId}:`, error);
    return false;
  }
}

export async function fetchAndStoreAllClimateData(): Promise<void> {
  console.log("[ClimateData] Starting climate data fetch for all destinations...");
  
  let successCount = 0;
  let failCount = 0;
  
  for (const dest of DESTINATION_COORDS) {
    const destExists = await db.select({ id: destinations.id })
      .from(destinations)
      .where(eq(destinations.id, dest.id))
      .limit(1);
    
    if (destExists.length === 0) {
      console.log(`[ClimateData] Destination ${dest.id} not in database, skipping...`);
      continue;
    }
    
    const data = await fetchClimateData(dest);
    if (!data) {
      failCount++;
      continue;
    }
    
    const monthlyStats = calculateMonthlyStats(data);
    const seasons = aggregateToSeasons(monthlyStats, dest);
    
    console.log(`[ClimateData] ${dest.name} seasons:`);
    seasons.forEach(s => {
      console.log(`  ${s.name} (${s.months}): ${s.avgTemp}°C, ${s.avgPrecip}mm, ${s.crowdLevel} crowds`);
    });
    
    const success = await storeSeasonData(dest.id, seasons);
    if (success) successCount++;
    else failCount++;
    
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log(`[ClimateData] Complete! Success: ${successCount}, Failed: ${failCount}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fetchAndStoreAllClimateData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
