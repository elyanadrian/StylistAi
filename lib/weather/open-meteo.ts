import { cacheLife } from "next/cache";
import { z } from "zod";

import type { WeatherSummary } from "@/lib/weather/types";

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";

const ForecastResponse = z.object({
  latitude: z.number(),
  longitude: z.number(),
  timezone: z.string(),
  daily: z.object({
    time: z.array(z.string()),
    weather_code: z.array(z.number()),
    temperature_2m_min: z.array(z.number()),
    temperature_2m_max: z.array(z.number()),
    apparent_temperature_min: z.array(z.number()),
    apparent_temperature_max: z.array(z.number()),
    precipitation_sum: z.array(z.number()),
    precipitation_probability_max: z.array(z.number().nullable()),
    wind_speed_10m_max: z.array(z.number()),
  }),
});

/**
 * Today's forecast for a location. Coordinates are rounded to ~1 km so nearby
 * requests share one cache entry; Open-Meteo updates hourly, so cache for an hour.
 */
export async function getTodayWeather(latitude: number, longitude: number): Promise<WeatherSummary> {
  return fetchTodayWeather(round2(latitude), round2(longitude));
}

async function fetchTodayWeather(latitude: number, longitude: number): Promise<WeatherSummary> {
  "use cache";
  cacheLife("hours");

  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    daily: [
      "weather_code",
      "temperature_2m_min",
      "temperature_2m_max",
      "apparent_temperature_min",
      "apparent_temperature_max",
      "precipitation_sum",
      "precipitation_probability_max",
      "wind_speed_10m_max",
    ].join(","),
    timezone: "auto",
    forecast_days: "1",
    wind_speed_unit: "kmh",
  });

  const res = await fetch(`${FORECAST_URL}?${params}`);
  if (!res.ok) throw new Error(`Open-Meteo forecast failed: ${res.status} ${res.statusText}`);
  const data = ForecastResponse.parse(await res.json());
  const d = data.daily;

  return {
    date: d.time[0],
    latitude: data.latitude,
    longitude: data.longitude,
    timezone: data.timezone,
    tempMinC: d.temperature_2m_min[0],
    tempMaxC: d.temperature_2m_max[0],
    feelsLikeMinC: d.apparent_temperature_min[0],
    feelsLikeMaxC: d.apparent_temperature_max[0],
    precipProbability: d.precipitation_probability_max[0] ?? 0,
    precipMm: d.precipitation_sum[0],
    windMaxKph: d.wind_speed_10m_max[0],
    weatherCode: d.weather_code[0],
    description: describeWeatherCode(d.weather_code[0]),
    fetchedAt: new Date().toISOString(),
  };
}

const GeocodingResponse = z.object({
  results: z
    .array(
      z.object({
        name: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        country: z.string().optional(),
        admin1: z.string().optional(),
      }),
    )
    .optional(),
});

export type Place = { label: string; latitude: number; longitude: number };

/** City search for the settings page (Open-Meteo's free geocoding API). */
export async function searchPlaces(query: string): Promise<Place[]> {
  "use cache";
  cacheLife("days");

  const params = new URLSearchParams({ name: query, count: "5", language: "en", format: "json" });
  const res = await fetch(`${GEOCODING_URL}?${params}`);
  if (!res.ok) throw new Error(`Open-Meteo geocoding failed: ${res.status} ${res.statusText}`);
  const data = GeocodingResponse.parse(await res.json());

  return (data.results ?? []).map((r) => ({
    label: [r.name, r.admin1, r.country].filter(Boolean).join(", "),
    latitude: r.latitude,
    longitude: r.longitude,
  }));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// WMO weather interpretation codes, as documented by Open-Meteo.
export function describeWeatherCode(code: number): string {
  if (code === 0) return "Clear sky";
  if (code <= 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Fog";
  if (code >= 51 && code <= 57) return "Drizzle";
  if (code === 61 || code === 80) return "Light rain";
  if (code === 63 || code === 81) return "Rain";
  if (code === 65 || code === 82) return "Heavy rain";
  if (code === 66 || code === 67) return "Freezing rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code === 85 || code === 86) return "Snow showers";
  if (code >= 95) return "Thunderstorm";
  return "Unknown";
}
