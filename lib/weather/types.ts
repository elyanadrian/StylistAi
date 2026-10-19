/** Today's weather, normalized from Open-Meteo. All temperatures in °C. */
export type WeatherSummary = {
  date: string; // YYYY-MM-DD, in the location's timezone
  latitude: number;
  longitude: number;
  timezone: string;
  tempMinC: number;
  tempMaxC: number;
  feelsLikeMinC: number;
  feelsLikeMaxC: number;
  precipProbability: number; // 0–100, daily max
  precipMm: number;
  windMaxKph: number;
  weatherCode: number; // WMO code
  description: string; // e.g. "Light rain"
  fetchedAt: string; // ISO timestamp
};
