// Open-Meteo is free and needs no API key — safe for a demo widget. If we
// keep this feature, swap to WeatherAPI/OpenWeather with a server-side proxy
// so we don't hit rate limits from every device.
import * as Location from 'expo-location';

export interface Weather {
  tempC: number;
  feelsLikeC: number;
  precipitationMm: number;
  weatherCode: number;
  isDay: boolean;
  locationName?: string;
}

const AMMAN_FALLBACK = { lat: 31.95, lng: 35.93, name: 'Amman' };

async function getCoords(): Promise<{
  lat: number;
  lng: number;
  name?: string;
}> {
  try {
    // Check first — if the user has already decided (granted or denied) we
    // don't re-prompt. Only ask when the status is "undetermined".
    const current = await Location.getForegroundPermissionsAsync();
    let status = current.status;
    if (status !== 'granted' && current.canAskAgain) {
      const asked = await Location.requestForegroundPermissionsAsync();
      status = asked.status;
    }
    if (status !== 'granted') return AMMAN_FALLBACK;
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Lowest,
    });
    return { lat: loc.coords.latitude, lng: loc.coords.longitude };
  } catch {
    return AMMAN_FALLBACK;
  }
}

export async function getCurrentWeather(): Promise<Weather> {
  const { lat, lng, name } = await getCoords();
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    `&current=temperature_2m,apparent_temperature,precipitation,weather_code,is_day` +
    `&temperature_unit=celsius&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather ${res.status}`);
  const json = (await res.json()) as {
    current: {
      temperature_2m: number;
      apparent_temperature: number;
      precipitation: number;
      weather_code: number;
      is_day: 0 | 1;
    };
  };
  return {
    tempC: Math.round(json.current.temperature_2m),
    feelsLikeC: Math.round(json.current.apparent_temperature),
    precipitationMm: json.current.precipitation,
    weatherCode: json.current.weather_code,
    isDay: json.current.is_day === 1,
    locationName: name,
  };
}

// WMO code → human label. Kept small on purpose; we only need enough
// granularity to pick the right icon and outfit hint.
export function describeWeatherCode(
  code: number,
  locale: 'ar' | 'en',
): string {
  const map: Record<string, { ar: string; en: string }> = {
    clear: { ar: 'صحو', en: 'Clear' },
    cloudy: { ar: 'غائم', en: 'Cloudy' },
    fog: { ar: 'ضباب', en: 'Fog' },
    drizzle: { ar: 'رذاذ', en: 'Drizzle' },
    rain: { ar: 'مطر', en: 'Rain' },
    snow: { ar: 'ثلج', en: 'Snow' },
    storm: { ar: 'عاصفة رعدية', en: 'Thunderstorm' },
  };
  const k = bucketForCode(code);
  return map[k][locale];
}

export type WeatherBucket =
  | 'clear'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'snow'
  | 'storm';

export function bucketForCode(code: number): WeatherBucket {
  if (code === 0) return 'clear';
  if (code >= 1 && code <= 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if ((code >= 51 && code <= 57) || code === 80) return 'drizzle';
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if (code >= 71 && code <= 77) return 'snow';
  if (code >= 95) return 'storm';
  return 'cloudy';
}

export interface OutfitSuggestion {
  key: string;
  ar: string;
  en: string;
}

// Outfit logic: temperature + precipitation bucket → one concrete tip.
// Intentionally simple since we're hedging on whether to keep the feature.
export function suggestOutfit(w: Weather): OutfitSuggestion {
  const bucket = bucketForCode(w.weatherCode);
  const feels = w.feelsLikeC;

  if (bucket === 'snow') {
    return {
      key: 'snow',
      ar: 'معطف سميك وحذاء للثلج — الطقس بارد جداً.',
      en: 'Heavy coat and boots — it is freezing.',
    };
  }
  if (bucket === 'storm' || bucket === 'rain') {
    return {
      key: 'rain',
      ar: 'خذ مظلة وسترة مقاومة للماء.',
      en: 'Take an umbrella and a waterproof jacket.',
    };
  }
  if (bucket === 'drizzle') {
    return {
      key: 'drizzle',
      ar: 'سترة خفيفة ومظلة احتياطية.',
      en: 'Light jacket and a backup umbrella.',
    };
  }
  if (feels >= 32) {
    return {
      key: 'hot',
      ar: 'ملابس خفيفة، قبعة، وواقي شمس — الجو حار.',
      en: 'Light clothes, a hat, and sunscreen — it is hot.',
    };
  }
  if (feels >= 22) {
    return {
      key: 'warm',
      ar: 'ملابس صيفية مريحة.',
      en: 'Comfortable summer clothes.',
    };
  }
  if (feels >= 14) {
    return {
      key: 'mild',
      ar: 'سترة خفيفة كافية.',
      en: 'A light jacket should be enough.',
    };
  }
  if (feels >= 6) {
    return {
      key: 'cool',
      ar: 'كنزة وسترة — الجو بارد.',
      en: 'Sweater and a jacket — it is chilly.',
    };
  }
  return {
    key: 'cold',
    ar: 'معطف سميك ووشاح — الجو بارد جداً.',
    en: 'Heavy coat and a scarf — it is very cold.',
  };
}
