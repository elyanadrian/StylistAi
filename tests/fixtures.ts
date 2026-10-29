import type { Item } from "@/lib/wardrobe";
import type { WeatherSummary } from "@/lib/weather/types";

let seq = 0;

export function item(overrides: Partial<Item> = {}): Item {
  seq += 1;
  const id = overrides.id ?? `item-${String(seq).padStart(3, "0")}`;
  return {
    id,
    user_id: "user-1",
    image_path: `user-1/${id}.jpg`,
    name: null,
    category: "top",
    subcategory: null,
    colors: ["black"],
    pattern: "solid",
    formality: 2,
    warmth: 2,
    waterproof: false,
    ai_tags: null,
    tag_status: "tagged",
    user_edited: false,
    archived_at: null,
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
    ...overrides,
  };
}

export function weather(overrides: Partial<WeatherSummary> = {}): WeatherSummary {
  return {
    date: "2026-10-19",
    latitude: 47.61,
    longitude: -122.33,
    timezone: "America/Los_Angeles",
    tempMinC: 12,
    tempMaxC: 20,
    feelsLikeMinC: 12,
    feelsLikeMaxC: 20,
    precipProbability: 10,
    precipMm: 0,
    windMaxKph: 10,
    weatherCode: 1,
    description: "Partly cloudy",
    fetchedAt: "2026-10-19T08:00:00Z",
    ...overrides,
  };
}
