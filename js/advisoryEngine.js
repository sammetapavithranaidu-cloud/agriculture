// AI FarmGuard Climate Analysis & Advisory Engine

import { CROP_DATABASE } from './cropData.js';

/**
 * Generate full farm advisory analysis based on weather data and active crop selection
 */
export function analyzeFarmClimate(weatherData, selectedCropId = "wheat", selectedStageIndex = 2) {
  const crop = CROP_DATABASE[selectedCropId] || CROP_DATABASE.wheat;
  const currentStage = crop.stages[selectedStageIndex] || crop.stages[0];

  const current = weatherData.current;
  const hourly = weatherData.hourly || [];
  const daily = weatherData.daily || [];

  // 1. Generate Climate Warnings & Alerts
  const alerts = generateClimateAlerts(current, hourly, daily, crop);

  // 2. Compute Disease Vulnerability Ratings
  const diseaseRisks = calculateDiseaseRisks(current, hourly, crop);

  // 3. Formulate Irrigation Advisory
  const irrigationAdvice = calculateIrrigationAdvisory(current, hourly, daily, crop);

  // 4. Formulate Spraying Advisory
  const sprayingAdvice = calculateSprayingAdvisory(current, hourly, crop);

  // 5. Crop Protection & Fieldwork Advisory
  const cropProtection = calculateCropProtectionAdvisory(current, hourly, daily, crop, currentStage);

  // 6. Action Window Hourly Scheduler Matrix (24 Hours)
  const actionSchedule = calculateHourlyActionSchedule(hourly, crop);

  // Overall Climate Risk Index (0 - 100)
  const overallRiskScore = calculateOverallRiskScore(alerts, diseaseRisks);

  return {
    crop: crop,
    currentStage: currentStage,
    overallRiskScore: overallRiskScore,
    overallRiskLevel: overallRiskScore > 65 ? "CRITICAL RISK" : (overallRiskScore > 35 ? "MODERATE RISK" : "OPTIMAL CONDITIONS"),
    overallRiskColor: overallRiskScore > 65 ? "var(--color-danger)" : (overallRiskScore > 35 ? "var(--color-warning)" : "var(--color-success)"),
    alerts: alerts,
    diseaseRisks: diseaseRisks,
    irrigationAdvice: irrigationAdvice,
    sprayingAdvice: sprayingAdvice,
    cropProtection: cropProtection,
    actionSchedule: actionSchedule
  };
}

/**
 * Generate Climate Risk Warnings
 */
function generateClimateAlerts(current, hourly, daily, crop) {
  const alerts = [];

  // Check 1: Heavy Rainfall Alert
  const next24hPrecipSum = hourly.slice(0, 24).reduce((sum, h) => sum + (h.precip || 0), 0);
  const maxRainProb24h = Math.max(...hourly.slice(0, 24).map(h => h.rainProb || 0));

  if (next24hPrecipSum >= 12 || maxRainProb24h >= 75 || current.precip >= 5) {
    alerts.push({
      id: "heavy_rain",
      type: "HEAVY RAINFALL WARNING",
      severity: next24hPrecipSum >= 25 ? "critical" : "warning",
      icon: "⛈️",
      title: "Heavy Rainfall & Soil Waterlogging Alert",
      summary: `Forecast indicates high rain probability (${maxRainProb24h}%) with ~${next24hPrecipSum.toFixed(1)}mm rainfall expected within 24 hours.`,
      impact: "High risk of soil erosion, root saturation, nutrient leaching, and chemical spray wash-off.",
      actions: [
        "Inspect and clear field drainage ditches immediately.",
        "Postpone chemical spray and liquid fertilizer applications to avoid wash-off.",
        "Ensure raised bed ridges are reinforced to protect crop roots."
      ]
    });
  }

  // Check 2: High Temperature / Heatwave Alert
  const maxTempToday = daily[0]?.maxTemp || current.temp;
  if (current.temp >= 34 || maxTempToday >= 36) {
    alerts.push({
      id: "high_temp",
      type: "HIGH TEMPERATURE ALERT",
      severity: (current.temp >= 38 || maxTempToday >= 39) ? "critical" : "warning",
      icon: "🔥",
      title: "Extreme Thermal Stress Hazard",
      summary: `Ambient temperature reached ${current.temp}°C (Day Peak: ${maxTempToday}°C), exceeding optimal limit of ${crop.tempOptimal.max}°C for ${crop.name}.`,
      impact: "Accelerated evapotranspiration, potential pollen sterilization, leaf scalding, and blossom drop.",
      actions: [
        "Apply light canopy cooling irrigation early morning or late evening.",
        "Avoid heavy field cultivation during peak heat hours (12:00 PM - 04:00 PM).",
        "Utilize shade nets or anti-transpirant sprays for high-value vegetable crops."
      ]
    });
  }

  // Check 3: Strong Wind Warning
  const maxWind24h = Math.max(...hourly.slice(0, 24).map(h => h.windSpeed || 0));
  if (current.windSpeed >= 20 || current.windGusts >= 28 || maxWind24h >= 24) {
    alerts.push({
      id: "strong_wind",
      type: "STRONG WIND WARNING",
      severity: current.windSpeed >= 30 ? "critical" : "warning",
      icon: "💨",
      title: "High Wind Velocity & Gust Hazard",
      summary: `Current wind speed is ${current.windSpeed} km/h (Gusts up to ${current.windGusts} km/h). Safe threshold for field spraying is < ${crop.windMaxSpraying} km/h.`,
      impact: "Severe spray drift hazard, physical crop lodging (stalk breakage), and rapid soil drying.",
      actions: [
        "SUSPEND all pesticide and herbicide spraying immediately due to chemical drift.",
        "Check crop staking and support trellises for orchards and tall cereals.",
        "Postpone plastic mulch installation or greenhouse shade panel adjustment."
      ]
    });
  }

  // Check 4: High Humidity Alert
  const humidHoursCount = hourly.slice(0, 12).filter(h => h.humidity >= crop.humidityHighThreshold).length;
  if (current.humidity >= crop.humidityHighThreshold || humidHoursCount >= 6) {
    alerts.push({
      id: "high_humidity",
      type: "HIGH HUMIDITY ALERT",
      severity: current.humidity >= 88 ? "critical" : "caution",
      icon: "💧",
      title: "Elevated Humidity & Fungal Pathogen Trigger",
      summary: `Relative humidity is ${current.humidity}% (Sustained >${crop.humidityHighThreshold}% for ${humidHoursCount} hours).`,
      impact: "Extremely favorable microclimate for fungal spore germination, blight outbreak, and mildew infection.",
      actions: [
        "Monitor dense crop foliage closely for early symptom spots.",
        "Prune lower canopy leaves to increase air movement and sunlight penetration.",
        "Prepare preventative bio-fungicide or systemic spray when wind permits."
      ]
    });
  }

  // If no severe alerts, add a positive status card
  if (alerts.length === 0) {
    alerts.push({
      id: "optimal",
      type: "OPTIMAL WEATHER CONDITIONS",
      severity: "safe",
      icon: "🌱",
      title: "Favorable Growing Environment",
      summary: `Temperature (${current.temp}°C), Humidity (${current.humidity}%), and Wind (${current.windSpeed} km/h) are within optimal ranges for ${crop.name}.`,
      impact: "Ideal conditions for steady crop development and routine field management.",
      actions: [
        "Proceed with scheduled field operations, weeding, and nutrient applications.",
        "Maintain routine soil moisture monitoring."
      ]
    });
  }

  return alerts;
}

/**
 * Calculate Risk Level for Crop Diseases
 */
function calculateDiseaseRisks(current, hourly, crop) {
  const next12h = hourly.slice(0, 12);
  const avgTemp = next12h.reduce((s, h) => s + h.temp, 0) / (next12h.length || 1);
  const avgHum = next12h.reduce((s, h) => s + h.humidity, 0) / (next12h.length || 1);
  const wetnessHours = next12h.filter(h => h.humidity >= 80 || h.rainProb >= 40).length;

  return crop.diseases.map(disease => {
    const cond = disease.triggerConditions;
    let riskScore = 0;

    // Temperature score (0 - 40 points)
    if (avgTemp >= cond.tempRange[0] && avgTemp <= cond.tempRange[1]) {
      riskScore += 40;
    } else if (Math.abs(avgTemp - (cond.tempRange[0] + cond.tempRange[1]) / 2) <= 5) {
      riskScore += 20;
    }

    // Humidity score (0 - 40 points)
    if (avgHum >= cond.minHumidity) {
      riskScore += 40;
    } else if (avgHum >= cond.minHumidity - 10) {
      riskScore += 25;
    }

    // Rain / Leaf Wetness bonus (0 - 20 points)
    if (cond.leafWetnessHours && wetnessHours >= cond.leafWetnessHours) {
      riskScore += 20;
    } else if (cond.minRainfallChance && current.rainProb >= cond.minRainfallChance) {
      riskScore += 20;
    } else {
      riskScore += Math.min(20, wetnessHours * 3);
    }

    riskScore = Math.min(98, Math.max(10, Math.round(riskScore)));

    let statusLabel = "LOW RISK";
    let statusColor = "var(--color-success)";
    if (riskScore >= 75) {
      statusLabel = "HIGH RISK";
      statusColor = "var(--color-danger)";
    } else if (riskScore >= 45) {
      statusLabel = "MODERATE RISK";
      statusColor = "var(--color-warning)";
    }

    return {
      ...disease,
      riskScore: riskScore,
      statusLabel: statusLabel,
      statusColor: statusColor,
      triggerDescription: cond.description
    };
  });
}

/**
 * Irrigation Advisory Engine
 */
function calculateIrrigationAdvisory(current, hourly, daily, crop) {
  const next48hPrecip = hourly.slice(0, 48).reduce((sum, h) => sum + (h.precip || 0), 0);
  const maxRainProb = Math.max(...hourly.slice(0, 24).map(h => h.rainProb || 0));
  const soilMoisture = current.soilMoisture;

  let recommendation = "NORMAL IRRIGATION";
  let statusBadge = "SAFE TO IRRIGATE";
  let badgeColor = "var(--color-success)";
  let reason = "";

  if (next48hPrecip >= 10 || maxRainProb >= 70) {
    recommendation = "SKIP IRRIGATION";
    statusBadge = "POSTPONE / SKIP";
    badgeColor = "var(--color-warning)";
    reason = `Sufficient rain expected (~${next48hPrecip.toFixed(1)}mm over 48 hours). Supplying extra water risks root suffocation and standing water.`;
  } else if (soilMoisture <= 30 && current.temp >= 30) {
    recommendation = "HEAVY IRRIGATION REQUIRED";
    statusBadge = "URGENT WATERING";
    badgeColor = "var(--color-danger)";
    reason = `Low soil moisture estimate (${soilMoisture}%) combined with warm temperature (${current.temp}°C) accelerates water loss.`;
  } else if (soilMoisture >= 75) {
    recommendation = "HOLD IRRIGATION";
    statusBadge = "SOIL SUFFICIENTLY WET";
    badgeColor = "var(--color-info)";
    reason = `Soil moisture level (${soilMoisture}%) is well saturated. Save water and power by pausing pump operation.`;
  } else {
    recommendation = "MODERATE IRRIGATION";
    statusBadge = "ROUTINE SCHEDULE";
    badgeColor = "var(--color-success)";
    reason = `Soil moisture is at ${soilMoisture}%. Apply ~${Math.round(crop.waterNeedPerWeek / 3)}mm water in early morning to minimize evaporation.`;
  }

  return {
    recommendation: recommendation,
    statusBadge: statusBadge,
    badgeColor: badgeColor,
    reason: reason,
    soilMoisture: soilMoisture,
    next48hRainMm: Number(next48hPrecip.toFixed(1)),
    maxRainProb: maxRainProb,
    optimalTimeOfDay: "05:00 AM - 08:00 AM or 06:00 PM - 08:00 PM"
  };
}

/**
 * Chemical Spraying Window Advisory Engine
 */
function calculateSprayingAdvisory(current, hourly, crop) {
  const currentWind = current.windSpeed;
  const maxWindLimit = crop.windMaxSpraying || 15;
  const next6hPrecip = hourly.slice(0, 6).reduce((sum, h) => sum + (h.precip || 0), 0);
  const next6hRainProb = Math.max(...hourly.slice(0, 6).map(h => h.rainProb || 0));

  let isSafe = true;
  let statusTitle = "OPTIMAL SPRAYING WINDOW";
  let badgeColor = "var(--color-success)";
  let mainReason = "Wind speed is low and no immediate rainfall is forecasted.";
  const riskFactors = [];

  if (currentWind > maxWindLimit) {
    isSafe = false;
    riskFactors.push(`Wind speed (${currentWind} km/h) exceeds safe threshold (${maxWindLimit} km/h) causing chemical drift.`);
  }

  if (next6hRainProb > 40 || next6hPrecip > 1.0) {
    isSafe = false;
    riskFactors.push(`Rain chance in next 6 hours is ${next6hRainProb}%. High risk of chemical rain wash-off.`);
  }

  if (current.humidity < 40) {
    riskFactors.push(`Low relative humidity (${current.humidity}%) causes rapid droplet evaporation before leaf absorption.`);
  } else if (current.humidity > 85) {
    riskFactors.push(`Very high humidity (${current.humidity}%) slows spray drying time.`);
  }

  if (!isSafe) {
    statusTitle = "UNSAFE FOR SPRAYING";
    badgeColor = "var(--color-danger)";
    mainReason = riskFactors[0] || "Unfavorable atmospheric conditions.";
  }

  // Find next safest 3-hour continuous window
  let nextSafeWindowText = "No suitable window in next 12 hours";
  for (let i = 0; i < hourly.length - 3; i++) {
    const chunk = hourly.slice(i, i + 3);
    const windowWindMax = Math.max(...chunk.map(h => h.windSpeed));
    const windowRainMax = Math.max(...chunk.map(h => h.rainProb));

    if (windowWindMax <= maxWindLimit && windowRainMax <= 30) {
      const startTime = chunk[0].timeStr;
      const endTime = chunk[2].timeStr;
      nextSafeWindowText = `Today between ${startTime} - ${endTime} (Wind ~${windowWindMax} km/h, Rain ~${windowRainMax}%)`;
      break;
    }
  }

  return {
    isSafe: isSafe,
    statusTitle: statusTitle,
    badgeColor: badgeColor,
    mainReason: mainReason,
    riskFactors: riskFactors,
    nextSafeWindow: nextSafeWindowText,
    idealNozzlePressure: currentWind > 10 ? "Coarse Droplets / Air-Induction Nozzle" : "Standard Flat Fan Nozzle"
  };
}

/**
 * Crop Protection & Fieldwork Advisory
 */
function calculateCropProtectionAdvisory(current, hourly, daily, crop, stage) {
  const advisories = [];

  // Stage specific advice
  if (stage === "Flowering" && current.temp >= 33) {
    advisories.push({
      category: "Heat Protection",
      icon: "☀️",
      text: "Crop is in critical Flowering stage under high heat. Maintain light soil wetness to buffer thermal spikes and avoid pollen drying."
    });
  }

  if (current.windSpeed >= 22) {
    advisories.push({
      category: "Lodging Protection",
      icon: "🚩",
      text: "Tie tall plant stalks or inspect orchard trellising to prevent crop lodging during windy gusts."
    });
  }

  const nextRainSum = daily[0]?.precipSum || 0;
  if (nextRainSum > 10) {
    advisories.push({
      category: "Drainage Check",
      icon: "🛠️",
      text: "Open field bund outlets to let surface runoff drain quickly, preventing root rot and oxygen deprivation."
    });
  }

  if (advisories.length === 0) {
    advisories.push({
      category: "General Protection",
      icon: "🛡️",
      text: "Field conditions are stable. Perform visual pest scouting around field borders."
    });
  }

  return advisories;
}

/**
 * Calculate 24-Hour Hourly Action Scheduler Matrix
 */
function calculateHourlyActionSchedule(hourly, crop) {
  const schedule = [];
  const hoursToAnalyze = hourly.slice(0, 24);

  hoursToAnalyze.forEach(h => {
    // Spraying score
    let sprayScore = 100;
    if (h.windSpeed > crop.windMaxSpraying) sprayScore -= 60;
    else if (h.windSpeed > 10) sprayScore -= 20;

    if (h.rainProb > 40) sprayScore -= 50;
    else if (h.rainProb > 20) sprayScore -= 20;

    if (h.humidity > 85 || h.humidity < 40) sprayScore -= 15;

    // Irrigation score
    let irrigateScore = 80;
    if (h.rainProb > 50) irrigateScore -= 60;
    if (h.temp > 32) irrigateScore += 10; // high ET
    if (h.hour >= 11 && h.hour <= 16) irrigateScore -= 30; // avoid midday sun

    // Harvesting / Fieldwork score
    let harvestScore = 90;
    if (h.rainProb > 30 || h.precip > 0.5) harvestScore -= 70;
    if (h.humidity > 82) harvestScore -= 30;

    schedule.push({
      hour: h.hour,
      timeStr: h.timeStr,
      temp: h.temp,
      rainProb: h.rainProb,
      windSpeed: h.windSpeed,
      spraying: getScoreStatus(sprayScore),
      irrigation: getScoreStatus(irrigateScore),
      harvesting: getScoreStatus(harvestScore)
    });
  });

  return schedule;
}

function getScoreStatus(score) {
  const safeScore = Math.max(0, Math.min(100, score));
  if (safeScore >= 75) return { rating: "IDEAL", score: safeScore, class: "status-ideal" };
  if (safeScore >= 45) return { rating: "MODERATE", score: safeScore, class: "status-moderate" };
  return { rating: "UNSAFE", score: safeScore, class: "status-unsafe" };
}

function calculateOverallRiskScore(alerts, diseaseRisks) {
  let score = 20; // baseline

  alerts.forEach(a => {
    if (a.severity === "critical") score += 25;
    if (a.severity === "warning") score += 15;
    if (a.severity === "caution") score += 8;
  });

  const maxDiseaseRisk = Math.max(...diseaseRisks.map(d => d.riskScore || 0), 0);
  if (maxDiseaseRisk > 70) score += 20;

  return Math.min(100, Math.max(5, score));
}
