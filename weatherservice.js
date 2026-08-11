// Weather API Service using Open-Meteo API
// Free, public, no API key required, reliable real-time and forecast weather API.

const OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const OPEN_METEO_GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const NOMINATIM_REVERSE_GEO_URL = "https://nominatim.openstreetmap.org/reverse";

/**
 * Fetch live weather and forecast for given lat/lon
 */
export async function fetchWeatherData(lat, lon, locationName = "") {
  try {
    const params = new URLSearchParams({
      latitude: lat,
      longitude: lon,
      current: [
        "temperature_2m",
        "relative_humidity_2m",
        "apparent_temperature",
        "is_day",
        "precipitation",
        "rain",
        "showers",
        "weather_code",
        "cloud_cover",
        "pressure_msl",
        "surface_pressure",
        "wind_speed_10m",
        "wind_direction_10m",
        "wind_gusts_10m"
      ].join(","),
      hourly: [
        "temperature_2m",
        "relative_humidity_2m",
        "dew_point_2m",
        "apparent_temperature",
        "precipitation_probability",
        "precipitation",
        "weather_code",
        "pressure_msl",
        "cloud_cover",
        "wind_speed_10m",
        "wind_direction_10m",
        "soil_temperature_0cm",
        "soil_moisture_0_to_1cm",
        "uv_index"
      ].join(","),
      daily: [
        "weather_code",
        "temperature_2m_max",
        "temperature_2m_min",
        "apparent_temperature_max",
        "apparent_temperature_min",
        "sunrise",
        "sunset",
        "uv_index_max",
        "precipitation_sum",
        "rain_sum",
        "precipitation_probability_max",
        "wind_speed_10m_max",
        "wind_gusts_10m_max",
        "wind_direction_10m_dominant"
      ].join(","),
      timezone: "auto"
    });

    const response = await fetch(`${OPEN_METEO_FORECAST_URL}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Open-Meteo API returned HTTP status ${response.status}`);
    }

    const rawData = await response.json();
    return parseOpenMeteoResponse(rawData, lat, lon, locationName);
  } catch (error) {
    console.warn("Weather API fetch failed, loading offline dynamic simulation data:", error);
    return generateFallbackWeatherData(lat, lon, locationName);
  }
}

/**
 * Search city or location using Open-Meteo Geocoding API
 */
export async function searchLocations(query) {
  if (!query || query.trim().length < 2) return [];

  try {
    const url = `${OPEN_METEO_GEOCODING_URL}?name=${encodeURIComponent(query)}&count=6&language=en&format=json`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Geocoding API request failed");
    
    const data = await response.json();
    if (!data.results) return [];

    return data.results.map(item => ({
      name: item.name,
      admin1: item.admin1 || "",
      country: item.country || "",
      displayName: `${item.name}${item.admin1 ? ", " + item.admin1 : ""}${item.country ? ", " + item.country : ""}`,
      lat: item.latitude,
      lon: item.longitude
    }));
  } catch (err) {
    console.error("Geocoding search error:", err);
    return [];
  }
}

/**
 * Reverse geocode latitude and longitude to human-readable address name
 */
export async function reverseGeocode(lat, lon) {
  try {
    const url = `${NOMINATIM_REVERSE_GEO_URL}?format=json&lat=${lat}&lon=${lon}&zoom=10`;
    const response = await fetch(url, { headers: { 'User-Agent': 'AIFarmGuard/1.0' } });
    if (response.ok) {
      const data = await response.json();
      const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || data.address?.state;
      const country = data.address?.country;
      if (city) return `${city}${country ? ', ' + country : ''}`;
    }
  } catch (e) {
    // fallback to formatted lat lon
  }
  return `Farm Sector (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`;
}

/**
 * Parse Open-Meteo response into unified weather object
 */
function parseOpenMeteoResponse(data, lat, lon, locationName) {
  const current = data.current || {};
  const hourly = data.hourly || {};
  const daily = data.daily || {};

  // Current weather properties
  const temp = Math.round(current.temperature_2m ?? 24);
  const feelsLike = Math.round(current.apparent_temperature ?? temp);
  const humidity = Math.round(current.relative_humidity_2m ?? 65);
  const windSpeed = Math.round(current.wind_speed_10m ?? 12);
  const windGusts = Math.round(current.wind_gusts_10m ?? windSpeed * 1.3);
  const windDirection = Math.round(current.wind_direction_10m ?? 180);
  const precip = current.precipitation ?? 0;
  const weatherCode = current.weather_code ?? 0;
  const pressure = Math.round(current.pressure_msl ?? 1013);
  const cloudCover = Math.round(current.cloud_cover ?? 30);

  // Hourly index current match
  const hourlyTimeList = hourly.time || [];
  const currentHourIndex = Math.max(0, hourlyTimeList.findIndex(t => new Date(t) >= new Date()) || 0);

  const rainProb = Math.round(hourly.precipitation_probability?.[currentHourIndex] ?? (precip > 0 ? 85 : 20));
  const uvIndex = Number((hourly.uv_index?.[currentHourIndex] ?? (current.is_day ? 5.5 : 0)).toFixed(1));
  const dewPoint = Math.round(hourly.dew_point_2m?.[currentHourIndex] ?? (temp - ((100 - humidity) / 5)));
  
  // Soil moisture calculation (0 to 1 converted to %)
  const rawSoilMoisture = hourly.soil_moisture_0_to_1cm?.[currentHourIndex] ?? 0.28;
  const soilMoisturePercent = Math.min(100, Math.max(10, Math.round(rawSoilMoisture * 100 * 2.2)));

  // Parse next 24 hours
  const hourlyForecast = [];
  const totalHours = Math.min(24, hourlyTimeList.length - currentHourIndex);
  for (let i = 0; i < Math.max(24, totalHours); i++) {
    const idx = currentHourIndex + i;
    if (idx < hourlyTimeList.length) {
      const timeStr = hourlyTimeList[idx];
      const hDate = new Date(timeStr);
      hourlyForecast.push({
        timeStr: hDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        hour: hDate.getHours(),
        temp: Math.round(hourly.temperature_2m[idx] ?? temp),
        humidity: Math.round(hourly.relative_humidity_2m[idx] ?? humidity),
        rainProb: Math.round(hourly.precipitation_probability[idx] ?? 0),
        precip: Number((hourly.precipitation[idx] ?? 0).toFixed(1)),
        windSpeed: Math.round(hourly.wind_speed_10m[idx] ?? windSpeed),
        weatherCode: hourly.weather_code[idx] ?? weatherCode,
        isDay: hDate.getHours() >= 6 && hDate.getHours() < 19
      });
    }
  }

  // Parse 7-day daily forecast
  const dailyForecast = [];
  const dailyTimeList = daily.time || [];
  for (let i = 0; i < Math.min(7, dailyTimeList.length); i++) {
    const dDate = new Date(dailyTimeList[i]);
    const dayName = i === 0 ? "Today" : dDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    dailyForecast.push({
      dateStr: dailyTimeList[i],
      dayName: dayName,
      maxTemp: Math.round(daily.temperature_2m_max[i] ?? temp + 3),
      minTemp: Math.round(daily.temperature_2m_min[i] ?? temp - 4),
      rainProbMax: Math.round(daily.precipitation_probability_max[i] ?? 20),
      precipSum: Number((daily.precipitation_sum[i] ?? 0).toFixed(1)),
      windSpeedMax: Math.round(daily.wind_speed_10m_max[i] ?? windSpeed),
      weatherCode: daily.weather_code[i] ?? weatherCode,
      uvMax: Number((daily.uv_index_max[i] ?? 6).toFixed(1)),
      sunrise: daily.sunrise?.[i] ? new Date(daily.sunrise[i]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "06:15 AM",
      sunset: daily.sunset?.[i] ? new Date(daily.sunset[i]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "07:10 PM"
    });
  }

  const conditionMeta = getWeatherConditionFromCode(weatherCode, current.is_day !== 0);

  return {
    location: {
      name: locationName || `Lat ${lat.toFixed(2)}, Lon ${lon.toFixed(2)}`,
      lat: lat,
      lon: lon,
      timezone: data.timezone || "Local"
    },
    current: {
      temp: temp,
      feelsLike: feelsLike,
      humidity: humidity,
      windSpeed: windSpeed,
      windGusts: windGusts,
      windDirection: windDirection,
      windDirectionText: getWindDirectionText(windDirection),
      rainProb: rainProb,
      precip: precip,
      uvIndex: uvIndex,
      uvCategory: getUVCategory(uvIndex),
      dewPoint: dewPoint,
      pressure: pressure,
      cloudCover: cloudCover,
      soilMoisture: soilMoisturePercent,
      isDay: current.is_day !== 0,
      weatherCode: weatherCode,
      conditionText: conditionMeta.text,
      conditionIcon: conditionMeta.icon,
      conditionClass: conditionMeta.bgClass,
      updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    },
    hourly: hourlyForecast,
    daily: dailyForecast
  };
}

/**
 * Convert weather code (WMO standard) to icon and text label
 */
export function getWeatherConditionFromCode(code, isDay = true) {
  if (code === 0) {
    return { text: "Clear Sky", icon: isDay ? "☀️" : "🌙", bgClass: "sunny" };
  }
  if (code === 1 || code === 2) {
    return { text: "Partly Cloudy", icon: isDay ? "⛅" : "🌤️", bgClass: "partly-cloudy" };
  }
  if (code === 3) {
    return { text: "Overcast", icon: "☁️", bgClass: "cloudy" };
  }
  if (code === 45 || code === 48) {
    return { text: "Foggy & Mist", icon: "🌫️", bgClass: "foggy" };
  }
  if (code >= 51 && code <= 57) {
    return { text: "Light Drizzle", icon: "🌦️", bgClass: "rainy" };
  }
  if (code >= 61 && code <= 67) {
    return { text: "Moderate Rain", icon: "🌧️", bgClass: "rainy" };
  }
  if (code >= 71 && code <= 77) {
    return { text: "Snowfall", icon: "❄️", bgClass: "snowy" };
  }
  if (code >= 80 && code <= 82) {
    return { text: "Heavy Rain Showers", icon: "🌧️⚡", bgClass: "stormy" };
  }
  if (code >= 95 && code <= 99) {
    return { text: "Thunderstorm", icon: "⛈️", bgClass: "stormy" };
  }
  return { text: "Clear / Mild", icon: "🌤️", bgClass: "sunny" };
}

function getWindDirectionText(degrees) {
  const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const index = Math.round((degrees % 360) / 22.5);
  return directions[index % 16];
}

function getUVCategory(uv) {
  if (uv <= 2) return "Low";
  if (uv <= 5) return "Moderate";
  if (uv <= 7) return "High";
  if (uv <= 10) return "Very High";
  return "Extreme";
}

/**
 * Generate fallback dataset when network is completely offline
 */
function generateFallbackWeatherData(lat, lon, locationName) {
  const baseTemp = 26;
  const baseHumidity = 72;
  const baseWind = 13;

  const hourly = [];
  const nowHour = new Date().getHours();
  for (let i = 0; i < 24; i++) {
    const h = (nowHour + i) % 24;
    const tempVar = Math.round(baseTemp + Math.sin((h - 6) / 24 * 2 * Math.PI) * 5);
    const humVar = Math.round(baseHumidity - Math.sin((h - 6) / 24 * 2 * Math.PI) * 20);
    const rainProb = (h >= 14 && h <= 18) ? 65 : 15;
    hourly.push({
      timeStr: `${h < 10 ? '0' + h : h}:00`,
      hour: h,
      temp: tempVar,
      humidity: humVar,
      rainProb: rainProb,
      precip: rainProb > 50 ? 2.5 : 0,
      windSpeed: Math.round(baseWind + (h % 5)),
      weatherCode: rainProb > 50 ? 61 : 2,
      isDay: h >= 6 && h < 19
    });
  }

  const days = ["Today", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const daily = days.map((d, i) => ({
    dateStr: `2026-08-${11 + i}`,
    dayName: d,
    maxTemp: baseTemp + 4 + (i % 3),
    minTemp: baseTemp - 3 - (i % 2),
    rainProbMax: i === 1 || i === 4 ? 75 : 20,
    precipSum: i === 1 ? 14.2 : (i === 4 ? 8.5 : 0),
    windSpeedMax: baseWind + (i * 2),
    weatherCode: i === 1 ? 80 : (i === 4 ? 61 : 1),
    uvMax: 7.2,
    sunrise: "06:12 AM",
    sunset: "07:05 PM"
  }));

  return parseOpenMeteoResponse({
    timezone: "UTC",
    current: {
      temperature_2m: baseTemp,
      relative_humidity_2m: baseHumidity,
      apparent_temperature: baseTemp + 2,
      is_day: 1,
      precipitation: 0,
      weather_code: 2,
      pressure_msl: 1012,
      wind_speed_10m: baseWind,
      wind_direction_10m: 195
    },
    hourly: {
      time: Array.from({length: 48}, (_, i) => new Date(Date.now() + i * 3600000).toISOString()),
      temperature_2m: hourly.map(h => h.temp).concat(hourly.map(h => h.temp)),
      relative_humidity_2m: hourly.map(h => h.humidity).concat(hourly.map(h => h.humidity)),
      precipitation_probability: hourly.map(h => h.rainProb).concat(hourly.map(h => h.rainProb)),
      precipitation: hourly.map(h => h.precip).concat(hourly.map(h => h.precip)),
      wind_speed_10m: hourly.map(h => h.windSpeed).concat(hourly.map(h => h.windSpeed)),
      weather_code: hourly.map(h => h.weatherCode).concat(hourly.map(h => h.weatherCode)),
      uv_index: Array(48).fill(6.0),
      dew_point_2m: Array(48).fill(19),
      soil_moisture_0_to_1cm: Array(48).fill(0.32)
    },
    daily: {
      time: daily.map(d => d.dateStr),
      temperature_2m_max: daily.map(d => d.maxTemp),
      temperature_2m_min: daily.map(d => d.minTemp),
      precipitation_probability_max: daily.map(d => d.rainProbMax),
      precipitation_sum: daily.map(d => d.precipSum),
      wind_speed_10m_max: daily.map(d => d.windSpeedMax),
      weather_code: daily.map(d => d.weatherCode),
      uv_index_max: daily.map(d => d.uvMax)
    }
  }, lat, lon, locationName || "Demo Farm Region (Offline Mode)");
}
