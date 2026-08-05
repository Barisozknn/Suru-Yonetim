import { useState, useEffect } from 'react';

export interface WeatherData {
  temperature: number;
  weathercode: number;
  windspeed: number;
  humidity: number;
  feelsLike: number;
  isDay: number;
  sunrise: string | null;
  sunset: string | null;
}

interface UseWeatherResult {
  data: WeatherData | null;
  loading: boolean;
  error: string | null;
}

const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 dakika
const CACHE_KEY = 'weather_cache_v2'; // sunrise/sunset eklendi, eski cache geçersiz

interface CacheEntry {
  data: WeatherData;
  timestamp: number;
  lat: number;
  lon: number;
}

function getCachedWeather(lat: number, lon: number): WeatherData | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache: CacheEntry = JSON.parse(raw);
    const isExpired = Date.now() - cache.timestamp > CACHE_DURATION_MS;
    const isSameLocation = Math.abs(cache.lat - lat) < 0.01 && Math.abs(cache.lon - lon) < 0.01;
    // sunrise alanı yoksa eski cache — geçersiz say
    const hasNewFields = 'sunrise' in cache.data;
    if (!isExpired && isSameLocation && hasNewFields) return cache.data;
  } catch {
    // ignore
  }
  return null;
}

function setCachedWeather(lat: number, lon: number, data: WeatherData): void {
  try {
    const entry: CacheEntry = { data, timestamp: Date.now(), lat, lon };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // ignore
  }
}

export function useWeather(
  lat: number | null,
  lon: number | null
): UseWeatherResult {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (lat === null || lon === null) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    // Önbellekten kontrol et
    const cached = getCachedWeather(lat, lon);
    if (cached) {
      setData(cached);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,apparent_temperature,weathercode,windspeed_10m,relative_humidity_2m,is_day` +
      `&daily=sunrise,sunset` +
      `&timezone=auto` +
      `&forecast_days=1`;

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        const c = json.current;
        const d = json.daily;
        const weather: WeatherData = {
          temperature: Math.round(c.temperature_2m),
          weathercode: c.weathercode,
          windspeed: Math.round(c.windspeed_10m),
          humidity: c.relative_humidity_2m,
          feelsLike: Math.round(c.apparent_temperature),
          isDay: c.is_day,
          sunrise: d?.sunrise?.[0] ?? null,
          sunset: d?.sunset?.[0] ?? null,
        };
        setCachedWeather(lat, lon, weather);
        setData(weather);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, [lat, lon]);

  return { data, loading, error };
}

// WMO Weather Codes → Türkçe açıklama + emoji
export function getWeatherDescription(code: number, isDay: number): { label: string; emoji: string } {
  const night = isDay === 0;
  if (code === 0) return { label: 'Açık', emoji: night ? '🌙' : '☀️' };
  if (code === 1) return { label: 'Büyük Ölçüde Açık', emoji: night ? '🌙' : '🌤️' };
  if (code === 2) return { label: 'Parçalı Bulutlu', emoji: '⛅' };
  if (code === 3) return { label: 'Kapalı', emoji: '☁️' };
  if (code === 45 || code === 48) return { label: 'Sisli', emoji: '🌫️' };
  if (code >= 51 && code <= 55) return { label: 'Çiseleme', emoji: '🌦️' };
  if (code >= 61 && code <= 65) return { label: 'Yağmurlu', emoji: '🌧️' };
  if (code >= 71 && code <= 77) return { label: 'Karlı', emoji: '❄️' };
  if (code >= 80 && code <= 82) return { label: 'Sağanak Yağışlı', emoji: '🌧️' };
  if (code >= 85 && code <= 86) return { label: 'Kar Sağanağı', emoji: '🌨️' };
  if (code === 95) return { label: 'Fırtınalı', emoji: '⛈️' };
  if (code >= 96 && code <= 99) return { label: 'Dolulu Fırtına', emoji: '⛈️' };
  return { label: 'Bilinmiyor', emoji: '🌡️' };
}

// "2026-08-05T05:42" → "05:42" formatına çevirir
export function formatSunTime(isoStr: string | null): string {
  if (!isoStr) return '--:--';
  const parts = isoStr.split('T');
  if (parts.length < 2) return '--:--';
  return parts[1].substring(0, 5);
}
