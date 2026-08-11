// AI FarmGuard Main Application JavaScript

import { PRESET_LOCATIONS } from './presetLocations.js';
import { CROP_DATABASE } from './cropData.js';
import { fetchWeatherData, searchLocations, reverseGeocode, getWeatherConditionFromCode } from './weatherService.js';
import { analyzeFarmClimate } from './advisoryEngine.js';
import { renderHourlyChart } from './chartRenderer.js';
import { analyzeCropScan, drawKeypointOverlay, CROP_DETECTOR_PRESETS } from './cropDetector.js';

// Application State
const state = {
  location: PRESET_LOCATIONS[0], // Ludhiana, Punjab default
  weatherData: null,
  cropId: "wheat",
  cropStageIndex: 2, // Tillering / Flowering
  isFahrenheit: false,
  theme: "dark",
  simulatedWeather: null, // If simulator is active
  isSimulating: false,
  currentScanResult: null
};

// DOM Content Loaded Initializer
document.addEventListener("DOMContentLoaded", async () => {
  initTheme();
  setupEventListeners();
  renderPresetButtons();
  renderCropSelector();
  initCropScanner();
  
  // Load initial location weather
  await loadWeatherForLocation(state.location.lat, state.location.lon, state.location.name);
});

function initTheme() {
  document.documentElement.setAttribute("data-theme", state.theme);
}

/**
 * Fetch and refresh weather for target coordinates
 */
async function loadWeatherForLocation(lat, lon, name = "") {
  showLoadingState();
  const rawWeather = await fetchWeatherData(lat, lon, name);
  state.weatherData = rawWeather;
  state.isSimulating = false;
  state.simulatedWeather = null;
  updateUI();
}

/**
 * Main UI Update Dispatcher
 */
function updateUI() {
  if (!state.weatherData) return;

  const currentW = state.isSimulating ? state.simulatedWeather : state.weatherData;
  const analysis = analyzeFarmClimate(currentW, state.cropId, state.cropStageIndex);

  renderHeaderState();
  renderHeroCard(currentW, analysis);
  renderMetricsGrid(currentW);
  renderAlertsList(analysis.alerts);
  renderDiseaseGrid(analysis.diseaseRisks);
  renderActionAdvisories(analysis);
  renderScheduleMatrix(analysis.actionSchedule);
  renderHourlyAndDailyForecast(currentW);

  if (state.currentScanResult) {
    refreshScanClimateCorrelation(currentW);
  }
}

function showLoadingState() {
  const heroEl = document.getElementById("hero-section");
  if (heroEl) {
    heroEl.style.opacity = "0.6";
  }
}

/**
 * Render Header Location and Status
 */
function renderHeaderState() {
  const locTitleEl = document.getElementById("header-location-name");
  if (locTitleEl && state.weatherData) {
    locTitleEl.textContent = state.weatherData.location.name;
  }
}

/**
 * Render Presets Buttons
 */
function renderPresetButtons() {
  const container = document.getElementById("preset-locations-container");
  if (!container) return;

  container.innerHTML = PRESET_LOCATIONS.map(loc => `
    <button class="crop-pill-btn ${state.location.name === loc.name ? 'active' : ''}" data-lat="${loc.lat}" data-lon="${loc.lon}" data-name="${loc.name}">
      📍 ${loc.name.split(',')[0]}
    </button>
  `).join('');

  container.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      const lat = parseFloat(btn.dataset.lat);
      const lon = parseFloat(btn.dataset.lon);
      const name = btn.dataset.name;
      state.location = { lat, lon, name };
      renderPresetButtons();
      loadWeatherForLocation(lat, lon, name);
    });
  });
}

/**
 * Render Hero Weather & Safety Card
 */
function renderHeroCard(weather, analysis) {
  const container = document.getElementById("hero-section");
  if (!container) return;

  const cur = weather.current;
  const tempVal = state.isFahrenheit ? Math.round(cur.temp * 1.8 + 32) : cur.temp;
  const feelsVal = state.isFahrenheit ? Math.round(cur.feelsLike * 1.8 + 32) : cur.feelsLike;
  const unit = state.isFahrenheit ? "°F" : "°C";

  container.style.opacity = "1";
  container.innerHTML = `
    <div class="hero-weather-card">
      <div class="hero-left-info">
        <div class="location-badge-row">
          <span class="status-pill" style="background: rgba(16, 185, 129, 0.2); color: var(--color-brand); border: 1px solid var(--color-brand);">
            ● LIVE WEATHER INTEGRATED
          </span>
          ${state.isSimulating ? '<span class="status-pill" style="background: rgba(245, 158, 11, 0.25); color: var(--color-warning); border: 1px solid var(--color-warning);">⚠️ SIMULATION MODE</span>' : ''}
          <span style="font-size: 0.8rem; color: var(--text-muted);">Updated: ${cur.updatedAt}</span>
        </div>

        <h1 class="location-title">📍 ${weather.location.name}</h1>

        <div class="temp-large-display">
          <span class="current-temp-num">${tempVal}${unit}</span>
          <div class="temp-meta-column">
            <span class="condition-text">${cur.conditionIcon} ${cur.conditionText}</span>
            <span class="feels-like-text">Feels like ${feelsVal}${unit} • Soil Est. ${cur.soilMoisture}% Moisture</span>
          </div>
        </div>

        <div class="quick-stats-strip">
          <div class="quick-stat-item">
            <span class="quick-stat-label">Humidity</span>
            <span class="quick-stat-val">💧 ${cur.humidity}%</span>
          </div>
          <div class="quick-stat-item">
            <span class="quick-stat-label">Wind Speed</span>
            <span class="quick-stat-val">💨 ${cur.windSpeed} km/h (${cur.windDirectionText})</span>
          </div>
          <div class="quick-stat-item">
            <span class="quick-stat-label">Rain Chance</span>
            <span class="quick-stat-val">🌧️ ${cur.rainProb}%</span>
          </div>
          <div class="quick-stat-item">
            <span class="quick-stat-label">UV Index</span>
            <span class="quick-stat-val">☀️ ${cur.uvIndex} (${cur.uvCategory})</span>
          </div>
        </div>
      </div>

      <div class="hero-right-summary">
        <div>
          <div class="summary-header">
            <span>CLIMATE RISK LEVEL</span>
            <span class="status-pill" style="background: ${analysis.overallRiskColor}22; color: ${analysis.overallRiskColor}; border: 1px solid ${analysis.overallRiskColor};">
              ${analysis.overallRiskLevel}
            </span>
          </div>
          <p style="font-size: 0.88rem; color: var(--text-muted); margin-bottom: 1rem;">
            AI FarmGuard evaluated climate risk at <strong>${analysis.overallRiskScore}/100</strong> for active crop <strong>${analysis.crop.name}</strong> (${analysis.currentStage} stage).
          </p>
        </div>

        <div style="background: rgba(0,0,0,0.25); padding: 0.9rem; border-radius: var(--radius-md); border-left: 4px solid ${analysis.overallRiskColor};">
          <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.2rem;">TOP ACTIONABLE ADVISORY</div>
          <div style="font-size: 0.83rem; color: var(--text-muted);">${analysis.alerts[0]?.title || "Conditions stable. Maintain standard maintenance."}</div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render 8 Detailed Weather Metrics Cards
 */
function renderMetricsGrid(weather) {
  const container = document.getElementById("metrics-grid-container");
  if (!container) return;

  const c = weather.current;
  const metrics = [
    {
      label: "Air Temperature",
      val: `${state.isFahrenheit ? Math.round(c.temp * 1.8 + 32) : c.temp}${state.isFahrenheit ? "°F" : "°C"}`,
      icon: "🌡️",
      desc: `Dew point ${c.dewPoint}°C`,
      barPercent: Math.min(100, Math.max(10, (c.temp / 45) * 100)),
      color: "var(--color-primary)"
    },
    {
      label: "Relative Humidity",
      val: `${c.humidity}%`,
      icon: "💧",
      desc: c.humidity >= 80 ? "High fungal risk" : "Optimal range",
      barPercent: c.humidity,
      color: c.humidity >= 80 ? "var(--color-warning)" : "var(--color-info)"
    },
    {
      label: "Rainfall Probability",
      val: `${c.rainProb}%`,
      icon: "🌧️",
      desc: c.precip > 0 ? `Current: ${c.precip}mm` : "No current rain",
      barPercent: c.rainProb,
      color: "#38bdf8"
    },
    {
      label: "Wind Velocity",
      val: `${c.windSpeed} km/h`,
      icon: "💨",
      desc: `Gusts up to ${c.windGusts} km/h (${c.windDirectionText})`,
      barPercent: Math.min(100, (c.windSpeed / 40) * 100),
      color: c.windSpeed > 15 ? "var(--color-danger)" : "var(--color-success)"
    },
    {
      label: "Soil Moisture Est.",
      val: `${c.soilMoisture}%`,
      icon: "🌱",
      desc: c.soilMoisture < 30 ? "Irrigation required" : "Adequate dampness",
      barPercent: c.soilMoisture,
      color: "var(--color-brand)"
    },
    {
      label: "UV Radiation",
      val: `${c.uvIndex}`,
      icon: "☀️",
      desc: `${c.uvCategory} exposure`,
      barPercent: Math.min(100, (c.uvIndex / 12) * 100),
      color: c.uvIndex >= 8 ? "var(--color-danger)" : "var(--color-warning)"
    },
    {
      label: "Barometric Pressure",
      val: `${c.pressure} hPa`,
      icon: "🧭",
      desc: c.pressure < 1008 ? "Low pressure system" : "Stable high pressure",
      barPercent: 50,
      color: "var(--color-purple)"
    },
    {
      label: "Cloud Coverage",
      val: `${c.cloudCover}%`,
      icon: "☁️",
      desc: c.cloudCover > 70 ? "Overcast sky" : "Partial sunlight",
      barPercent: c.cloudCover,
      color: "var(--text-muted)"
    }
  ];

  container.innerHTML = metrics.map(m => `
    <div class="metric-card">
      <div class="metric-header">
        <span class="metric-label">${m.label}</span>
        <span class="metric-icon-bubble">${m.icon}</span>
      </div>
      <div class="metric-value-large">${m.val}</div>
      <div class="metric-foot-desc">${m.desc}</div>
      <div class="metric-bar-bg">
        <div class="metric-bar-fill" style="width: ${m.barPercent}%; background: ${m.color};"></div>
      </div>
    </div>
  `).join('');
}

/**
 * Render Climate Alerts List
 */
function renderAlertsList(alerts) {
  const container = document.getElementById("alerts-container");
  if (!container) return;

  container.innerHTML = alerts.map(a => `
    <div class="alert-card ${a.severity}">
      <div class="alert-card-head">
        <span class="alert-card-title">${a.icon} ${a.title}</span>
        <span class="status-pill" style="background: rgba(0,0,0,0.25);">${a.type}</span>
      </div>
      <div class="alert-body-summary">${a.summary} <em>${a.impact}</em></div>
      <div class="alert-actions-box">
        <div class="alert-actions-title">Recommended Protection Steps:</div>
        <ul class="alert-actions-ul">
          ${a.actions.map(act => `<li>${act}</li>`).join('')}
        </ul>
      </div>
    </div>
  `).join('');
}

/**
 * Render Crop Selector and Growth Stage Selector
 */
function renderCropSelector() {
  const cropContainer = document.getElementById("crop-selector-pills");
  if (!cropContainer) return;

  cropContainer.innerHTML = Object.values(CROP_DATABASE).map(crop => `
    <button class="crop-pill-btn ${state.cropId === crop.id ? 'active' : ''}" data-crop="${crop.id}">
      ${crop.icon} ${crop.name}
    </button>
  `).join('');

  cropContainer.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      state.cropId = btn.dataset.crop;
      state.cropStageIndex = 0;
      renderCropSelector();
      renderStageSelector();
      updateUI();
    });
  });

  renderStageSelector();
}

function renderStageSelector() {
  const stageContainer = document.getElementById("crop-stage-select");
  if (!stageContainer) return;

  const crop = CROP_DATABASE[state.cropId];
  stageContainer.innerHTML = crop.stages.map((stage, idx) => `
    <option value="${idx}" ${state.cropStageIndex === idx ? 'selected' : ''}>${stage} Stage</option>
  `).join('');

  stageContainer.onchange = (e) => {
    state.cropStageIndex = parseInt(e.target.value);
    updateUI();
  };
}

/**
 * Render Disease Risk Cards
 */
function renderDiseaseGrid(diseases) {
  const container = document.getElementById("disease-grid-container");
  if (!container) return;

  container.innerHTML = diseases.map(d => `
    <div class="disease-card">
      <div class="disease-card-head">
        <span class="disease-name">${d.name}</span>
        <span class="status-pill" style="background: ${d.statusColor}22; color: ${d.statusColor}; border: 1px solid ${d.statusColor};">
          ${d.statusLabel} (${d.riskScore}%)
        </span>
      </div>
      <p style="font-size: 0.83rem; color: var(--text-muted); margin-bottom: 0.5rem;">
        <strong>Symptoms:</strong> ${d.symptoms}
      </p>
      <div style="background: rgba(0,0,0,0.2); padding: 0.6rem; border-radius: var(--radius-sm); font-size: 0.78rem; color: var(--text-muted); margin-bottom: 0.5rem;">
        <strong>Weather Driver:</strong> ${d.triggerDescription}
      </div>
      <div style="font-size: 0.8rem; color: var(--color-brand); font-weight: 600;">
        💡 Action: ${d.mitigation}
      </div>
    </div>
  `).join('');
}

/**
 * Render Action Advisories (Spraying, Irrigation, Protection)
 */
function renderActionAdvisories(analysis) {
  const container = document.getElementById("advisories-tab-row");
  if (!container) return;

  const spr = analysis.sprayingAdvice;
  const irr = analysis.irrigationAdvice;

  container.innerHTML = `
    <!-- Spraying Advisory -->
    <div class="advisory-box">
      <div>
        <div class="advisory-title">🧪 Chemical Spraying Advisory</div>
        <div class="status-pill" style="background: ${spr.badgeColor}22; color: ${spr.badgeColor}; border: 1px solid ${spr.badgeColor}; margin-bottom: 0.75rem;">
          ${spr.statusTitle}
        </div>
        <p style="font-size: 0.85rem; color: var(--text-main); margin-bottom: 0.5rem;">${spr.mainReason}</p>
        <div style="font-size: 0.78rem; color: var(--text-muted);">
          <strong>Best Safe Window:</strong> ${spr.nextSafeWindow}
        </div>
      </div>
      <div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 0.75rem;">
        Nozzle Rec: ${spr.idealNozzlePressure}
      </div>
    </div>

    <!-- Irrigation Advisory -->
    <div class="advisory-box">
      <div>
        <div class="advisory-title">💧 Smart Irrigation Scheduler</div>
        <div class="status-pill" style="background: ${irr.badgeColor}22; color: ${irr.badgeColor}; border: 1px solid ${irr.badgeColor}; margin-bottom: 0.75rem;">
          ${irr.statusBadge}
        </div>
        <p style="font-size: 0.85rem; color: var(--text-main); margin-bottom: 0.5rem;">${irr.reason}</p>
        <div style="font-size: 0.78rem; color: var(--text-muted);">
          <strong>Optimal Time Window:</strong> ${irr.optimalTimeOfDay}
        </div>
      </div>
      <div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 0.75rem;">
        48h Forecast Rain: ${irr.next48hRainMm}mm
      </div>
    </div>

    <!-- Protection Advisory -->
    <div class="advisory-box">
      <div>
        <div class="advisory-title">🛡️ Crop Protection Guide</div>
        <div class="status-pill" style="background: rgba(16, 185, 129, 0.2); color: var(--color-brand); border: 1px solid var(--color-brand); margin-bottom: 0.75rem;">
          STAGE: ${analysis.currentStage.toUpperCase()}
        </div>
        ${analysis.cropProtection.map(cp => `
          <div style="font-size: 0.83rem; color: var(--text-muted); margin-bottom: 0.4rem;">
            ${cp.icon} <strong>${cp.category}:</strong> ${cp.text}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

/**
 * Render 24-Hour Safest Action Schedule Table Matrix
 */
function renderScheduleMatrix(schedule) {
  const container = document.getElementById("schedule-matrix-container");
  if (!container) return;

  container.innerHTML = `
    <div class="schedule-table-container">
      <table class="schedule-table">
        <thead>
          <tr>
            <th>Time Slot</th>
            <th>Temp / Rain</th>
            <th>Wind Velocity</th>
            <th>Pesticide Spraying</th>
            <th>Field Irrigation</th>
            <th>Harvesting / Work</th>
          </tr>
        </thead>
        <tbody>
          ${schedule.map(s => `
            <tr>
              <td><strong>${s.timeStr}</strong></td>
              <td>${s.temp}°C | 🌧️${s.rainProb}%</td>
              <td>💨 ${s.windSpeed} km/h</td>
              <td><span class="badge-${s.spraying.class.replace('status-', '')}">${s.spraying.rating}</span></td>
              <td><span class="badge-${s.irrigation.class.replace('status-', '')}">${s.irrigation.rating}</span></td>
              <td><span class="badge-${s.harvesting.class.replace('status-', '')}">${s.harvesting.rating}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Render Hourly Chart & 7-Day Extended Forecast
 */
function renderHourlyAndDailyForecast(weather) {
  const chartEl = document.getElementById("hourly-chart-container");
  if (chartEl) {
    renderHourlyChart(chartEl, weather.hourly, state.isFahrenheit);
  }

  const dailyContainer = document.getElementById("daily-forecast-container");
  if (dailyContainer && weather.daily) {
    const maxTempAll = Math.max(...weather.daily.map(d => d.maxTemp));
    const minTempAll = Math.min(...weather.daily.map(d => d.minTemp));

    dailyContainer.innerHTML = weather.daily.map(d => {
      const cond = getWeatherConditionFromCode(d.weatherCode, true);
      const maxVal = state.isFahrenheit ? Math.round(d.maxTemp * 1.8 + 32) : d.maxTemp;
      const minVal = state.isFahrenheit ? Math.round(d.minTemp * 1.8 + 32) : d.minTemp;
      const barLeft = ((d.minTemp - minTempAll) / (maxTempAll - minTempAll || 1)) * 100;
      const barWidth = Math.max(15, ((d.maxTemp - d.minTemp) / (maxTempAll - minTempAll || 1)) * 100);

      return `
        <div class="daily-row-item">
          <div>
            <strong>${d.dayName}</strong>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${d.sunrise} - ${d.sunset}</div>
          </div>
          <div>${cond.icon} ${cond.text}</div>
          <div class="daily-temp-bar-bg">
            <div class="daily-temp-bar-fill" style="margin-left: ${barLeft}%; width: ${barWidth}%;"></div>
          </div>
          <div style="text-align: right;">
            <strong>${maxVal}°</strong> / <span style="color: var(--text-muted);">${minVal}°</span>
            ${d.rainProbMax >= 30 ? `<div style="font-size: 0.75rem; color: #38bdf8;">🌧️ ${d.rainProbMax}% (${d.precipSum}mm)</div>` : ''}
          </div>
        </div>
      `;
    }).join('');
  }
}

/**
 * Setup Event Listeners for Controls, Search, Modals, Simulator
 */
function setupEventListeners() {
  // Theme Toggle
  const themeBtn = document.getElementById("btn-toggle-theme");
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      state.theme = state.theme === "dark" ? "light" : "dark";
      initTheme();
      themeBtn.textContent = state.theme === "dark" ? "🌙 Dark" : "☀️ Light";
    });
  }

  // Unit Toggle (°C / °F)
  const unitBtn = document.getElementById("btn-toggle-unit");
  if (unitBtn) {
    unitBtn.addEventListener("click", () => {
      state.isFahrenheit = !state.isFahrenheit;
      unitBtn.textContent = state.isFahrenheit ? "°F Units" : "°C Units";
      updateUI();
    });
  }

  // GPS Location Button
  const gpsBtn = document.getElementById("btn-use-gps");
  if (gpsBtn) {
    gpsBtn.addEventListener("click", () => {
      if (navigator.geolocation) {
        gpsBtn.textContent = "⌛ Detecting...";
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            const address = await reverseGeocode(lat, lon);
            state.location = { lat, lon, name: address };
            gpsBtn.textContent = "🎯 GPS Location";
            loadWeatherForLocation(lat, lon, address);
          },
          (err) => {
            alert("Geolocation access denied or unavailable. Loading preset location instead.");
            gpsBtn.textContent = "🎯 GPS Location";
          }
        );
      }
    });
  }

  // Location Search Box Input & Autocomplete
  const searchInput = document.getElementById("location-search-input");
  const suggestionsBox = document.getElementById("search-suggestions-dropdown");

  if (searchInput && suggestionsBox) {
    let debounceTimer;
    searchInput.addEventListener("input", (e) => {
      clearTimeout(debounceTimer);
      const query = e.target.value;
      if (query.trim().length < 2) {
        suggestionsBox.style.display = "none";
        return;
      }

      debounceTimer = setTimeout(async () => {
        const results = await searchLocations(query);
        if (results.length > 0) {
          suggestionsBox.innerHTML = results.map(r => `
            <div class="suggestion-item" data-lat="${r.lat}" data-lon="${r.lon}" data-name="${r.displayName}">
              <span>📍 ${r.displayName}</span>
              <span style="font-size: 0.75rem; color: var(--text-dim);">${r.lat.toFixed(2)}°, ${r.lon.toFixed(2)}°</span>
            </div>
          `).join('');
          suggestionsBox.style.display = "block";

          suggestionsBox.querySelectorAll(".suggestion-item").forEach(item => {
            item.addEventListener("click", () => {
              const lat = parseFloat(item.dataset.lat);
              const lon = parseFloat(item.dataset.lon);
              const name = item.dataset.name;
              state.location = { lat, lon, name };
              suggestionsBox.style.display = "none";
              searchInput.value = "";
              loadWeatherForLocation(lat, lon, name);
            });
          });
        } else {
          suggestionsBox.style.display = "none";
        }
      }, 300);
    });

    document.addEventListener("click", (e) => {
      if (!searchInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
        suggestionsBox.style.display = "none";
      }
    });
  }

  // Weather Simulator Modal Controls
  const simOpenBtn = document.getElementById("btn-open-simulator");
  const simOverlay = document.getElementById("simulator-modal");
  const simCloseBtn = document.getElementById("btn-close-simulator");

  if (simOpenBtn && simOverlay) {
    simOpenBtn.addEventListener("click", () => {
      simOverlay.classList.add("active");
    });
  }
  if (simCloseBtn && simOverlay) {
    simCloseBtn.addEventListener("click", () => {
      simOverlay.classList.remove("active");
    });
  }

  // Simulator Sliders Input
  const simTempSlider = document.getElementById("sim-slider-temp");
  const simWindSlider = document.getElementById("sim-slider-wind");
  const simRainSlider = document.getElementById("sim-slider-rain");
  const simHumSlider = document.getElementById("sim-slider-hum");

  const runSimulation = () => {
    if (!state.weatherData) return;
    state.isSimulating = true;
    
    // Deep clone weather object and override parameters
    const simW = JSON.parse(JSON.stringify(state.weatherData));
    const tempVal = parseInt(simTempSlider.value);
    const windVal = parseInt(simWindSlider.value);
    const rainVal = parseInt(simRainSlider.value);
    const humVal = parseInt(simHumSlider.value);

    simW.current.temp = tempVal;
    simW.current.windSpeed = windVal;
    simW.current.rainProb = rainVal;
    simW.current.humidity = humVal;

    if (rainVal > 50) {
      simW.current.weatherCode = 80; // Heavy Rain Showers
      simW.current.conditionText = "Simulated Heavy Rain";
      simW.current.conditionIcon = "🌧️⚡";
    } else if (tempVal >= 36) {
      simW.current.weatherCode = 0;
      simW.current.conditionText = "Simulated Extreme Heatwave";
      simW.current.conditionIcon = "🔥";
    } else if (windVal >= 25) {
      simW.current.weatherCode = 3;
      simW.current.conditionText = "Simulated Gale Wind";
      simW.current.conditionIcon = "💨";
    }

    // Override hourly forecast
    simW.hourly.forEach(h => {
      h.temp = tempVal;
      h.windSpeed = windVal;
      h.rainProb = rainVal;
      h.humidity = humVal;
    });

    state.simulatedWeather = simW;
    updateUI();
  };

  [simTempSlider, simWindSlider, simRainSlider, simHumSlider].forEach(slider => {
    if (slider) {
      slider.addEventListener("input", (e) => {
        const valEl = document.getElementById(`${slider.id}-val`);
        if (valEl) valEl.textContent = e.target.value;
        runSimulation();
      });
    }
  });

  const resetSimBtn = document.getElementById("btn-reset-simulation");
  if (resetSimBtn) {
    resetSimBtn.addEventListener("click", () => {
      state.isSimulating = false;
      state.simulatedWeather = null;
      updateUI();
    });
  }

  // Export Advisory Report Modal
  const exportBtn = document.getElementById("btn-export-report");
  const exportModal = document.getElementById("export-modal");
  const closeExportBtn = document.getElementById("btn-close-export");

  if (exportBtn && exportModal) {
    exportBtn.addEventListener("click", () => {
      renderExportModalContent();
      exportModal.classList.add("active");
    });
  }

  if (closeExportBtn && exportModal) {
    closeExportBtn.addEventListener("click", () => {
      exportModal.classList.remove("active");
    });
  }

  const printBtn = document.getElementById("btn-trigger-print");
  if (printBtn) {
    printBtn.addEventListener("click", () => {
      window.print();
    });
  }

  // Scroll to scanner button
  const scrollScanBtn = document.getElementById("btn-scroll-scanner");
  if (scrollScanBtn) {
    scrollScanBtn.addEventListener("click", () => {
      const scanSection = document.getElementById("ai-crop-scanner-section");
      if (scanSection) {
        scanSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }
}

/**
 * Initialize AI Crop & Disease Scanner Module
 */
function initCropScanner() {
  const tabs = document.querySelectorAll(".scanner-tab-btn");
  const uploadPrompt = document.getElementById("scanner-upload-prompt");
  const cameraViewfinder = document.getElementById("scanner-camera-viewfinder");
  const imageWrapper = document.getElementById("scanner-image-wrapper");
  const fileInput = document.getElementById("scanner-file-input");
  const viewportBox = document.getElementById("scanner-viewport");
  const sampleCards = document.querySelectorAll(".sample-preset-card");
  const videoFeed = document.getElementById("scanner-video-feed");
  const captureBtn = document.getElementById("btn-capture-camera");

  let mediaStream = null;

  // Scanner Mode Switcher
  tabs.forEach(tab => {
    tab.addEventListener("click", async () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      const mode = tab.dataset.mode;

      // Stop camera if leaving camera mode
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
      }

      if (mode === "upload") {
        uploadPrompt.style.display = "flex";
        cameraViewfinder.style.display = "none";
        imageWrapper.style.display = "none";
      } else if (mode === "camera") {
        uploadPrompt.style.display = "none";
        imageWrapper.style.display = "none";
        cameraViewfinder.style.display = "block";

        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
          videoFeed.srcObject = mediaStream;
        } catch (err) {
          console.warn("Camera access fallback:", err);
          alert("Unable to access camera device. Please use Upload or Sample Presets.");
        }
      } else {
        // Presets mode
        uploadPrompt.style.display = "none";
        cameraViewfinder.style.display = "none";
        imageWrapper.style.display = "flex";
      }
    });
  });

  // Click Viewport to Browse File when in Upload Mode
  if (viewportBox && fileInput) {
    viewportBox.addEventListener("click", (e) => {
      const activeTab = document.querySelector(".scanner-tab-btn.active");
      if (activeTab && activeTab.dataset.mode === "upload" && e.target !== fileInput) {
        fileInput.click();
      }
    });

    // Drag & Drop handlers
    viewportBox.addEventListener("dragover", (e) => {
      e.preventDefault();
      viewportBox.classList.add("dragover");
    });
    viewportBox.addEventListener("dragleave", () => {
      viewportBox.classList.remove("dragover");
    });
    viewportBox.addEventListener("drop", (e) => {
      e.preventDefault();
      viewportBox.classList.remove("dragover");
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleImageFile(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) {
        handleImageFile(e.target.files[0]);
      }
    });
  }

  function handleImageFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      uploadPrompt.style.display = "none";
      imageWrapper.style.display = "flex";
      runScannerDiagnosis(e.target.result);
    };
    reader.readAsDataURL(file);
  }

  // Camera Frame Capture
  if (captureBtn && videoFeed) {
    captureBtn.addEventListener("click", () => {
      const canvas = document.createElement("canvas");
      canvas.width = videoFeed.videoWidth || 640;
      canvas.height = videoFeed.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(videoFeed, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/png");

      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
      }

      cameraViewfinder.style.display = "none";
      imageWrapper.style.display = "flex";
      runScannerDiagnosis(dataUrl);
    });
  }

  // 1-Click Sample Preset Selection
  sampleCards.forEach(card => {
    card.addEventListener("click", () => {
      sampleCards.forEach(c => c.classList.remove("active"));
      card.classList.add("active");
      const presetKey = card.dataset.preset;
      
      uploadPrompt.style.display = "none";
      cameraViewfinder.style.display = "none";
      imageWrapper.style.display = "flex";

      // Switch tab indicator to presets
      tabs.forEach(t => t.classList.remove("active"));
      const presetTab = document.getElementById("tab-scan-preset");
      if (presetTab) presetTab.classList.add("active");

      runScannerDiagnosis(`preset:${presetKey}`);
    });
  });

  // Run initial diagnostic on load for Wheat Rust
  runScannerDiagnosis('preset:wheat_rust');
}

/**
 * Execute AI Scanner Pathology Analysis and Render UI
 */
function runScannerDiagnosis(inputData) {
  const viewportBox = document.getElementById("scanner-viewport");
  const targetImg = document.getElementById("scanner-target-img");
  const keypointCanvas = document.getElementById("scanner-keypoint-canvas");

  if (viewportBox) viewportBox.classList.add("scanning");

  const currentW = state.isSimulating ? state.simulatedWeather : state.weatherData;
  const result = analyzeCropScan(inputData, currentW, state.cropId);
  state.currentScanResult = result;

  // Set target image source
  if (targetImg) {
    targetImg.src = result.imagePath;
    targetImg.onload = () => {
      drawKeypointOverlay(keypointCanvas, targetImg, result.keypoints, result.severity);
    };
  }

  setTimeout(() => {
    if (viewportBox) viewportBox.classList.remove("scanning");
    updateDiagnosticDisplayCard(result);
  }, 500);
}

/**
 * Update UI text and metrics inside Diagnostic Card
 */
function updateDiagnosticDisplayCard(res) {
  const nameEl = document.getElementById("diag-disease-name");
  const sciEl = document.getElementById("diag-scientific-name");
  const sevEl = document.getElementById("diag-severity-badge");
  const confValEl = document.getElementById("diag-confidence-val");
  const confBarEl = document.getElementById("diag-confidence-bar");
  const sympEl = document.getElementById("diag-symptoms-text");
  const bioEl = document.getElementById("diag-bio-text");
  const chemEl = document.getElementById("diag-chem-text");
  const cultEl = document.getElementById("diag-cult-text");

  if (nameEl) nameEl.textContent = res.name;
  if (sciEl) sciEl.textContent = res.scientificName;
  if (sevEl) {
    sevEl.textContent = `${res.severity} Severity`;
    sevEl.className = `severity-pill ${res.severity}`;
  }
  if (confValEl) confValEl.textContent = `${res.confidence}%`;
  if (confBarEl) confBarEl.style.width = `${res.confidence}%`;
  if (sympEl) sympEl.textContent = res.symptoms;
  if (bioEl) bioEl.textContent = res.biologicalControl;
  if (chemEl) chemEl.textContent = res.chemicalControl;
  if (cultEl) cultEl.textContent = res.culturalControl;

  refreshScanClimateCorrelation(state.isSimulating ? state.simulatedWeather : state.weatherData, res);
}

/**
 * Refresh Microclimate correlation box
 */
function refreshScanClimateCorrelation(weatherData, scanRes = state.currentScanResult) {
  if (!scanRes) return;
  const climateBox = document.getElementById("diag-climate-impact-box");
  const titleEl = document.getElementById("diag-climate-title");
  const textEl = document.getElementById("diag-climate-text");

  if (!climateBox || !titleEl || !textEl) return;

  const currentW = weatherData || (state.isSimulating ? state.simulatedWeather : state.weatherData);
  const corr = analyzeCropScan(`preset:${scanRes.key || 'wheat_rust'}`, currentW, state.cropId).climateCorrelation;

  titleEl.textContent = corr.title;
  textEl.textContent = corr.message;

  if (corr.riskLevel.includes("High") || corr.riskLevel.includes("Critical")) {
    climateBox.style.borderColor = "rgba(239, 68, 68, 0.4)";
    climateBox.style.background = "rgba(239, 68, 68, 0.08)";
    titleEl.style.color = "#ef4444";
  } else if (corr.riskLevel.includes("Moderate")) {
    climateBox.style.borderColor = "rgba(245, 158, 11, 0.4)";
    climateBox.style.background = "rgba(245, 158, 11, 0.08)";
    titleEl.style.color = "#f59e0b";
  } else {
    climateBox.style.borderColor = "rgba(16, 185, 129, 0.4)";
    climateBox.style.background = "rgba(16, 185, 129, 0.08)";
    titleEl.style.color = "#10b981";
  }
}

/**
 * Render Exportable Advisory Summary Modal Content
 */
function renderExportModalContent() {
  const container = document.getElementById("export-report-body");
  if (!container || !state.weatherData) return;

  const currentW = state.isSimulating ? state.simulatedWeather : state.weatherData;
  const analysis = analyzeFarmClimate(currentW, state.cropId, state.cropStageIndex);
  const cur = currentW.current;
  const scan = state.currentScanResult;

  container.innerHTML = `
    <div style="border: 2px solid var(--color-brand); padding: 1.5rem; border-radius: var(--radius-md); background: rgba(0,0,0,0.3);">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-card); padding-bottom: 0.75rem; margin-bottom: 1rem;">
        <div>
          <h2 style="font-family: var(--font-heading); color: var(--color-brand); font-size: 1.3rem;">🌱 AI FARMGUARD OFFICIAL ADVISORY REPORT</h2>
          <div style="font-size: 0.8rem; color: var(--text-muted);">Generated: ${new Date().toLocaleString()}</div>
        </div>
        <div style="text-align: right;">
          <strong style="color: ${analysis.overallRiskColor};">${analysis.overallRiskLevel} (${analysis.overallRiskScore}/100)</strong>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; font-size: 0.85rem; margin-bottom: 1rem;">
        <div>
          <p><strong>Farm Location:</strong> ${currentW.location.name}</p>
          <p><strong>Target Crop:</strong> ${analysis.crop.name} (${analysis.currentStage} stage)</p>
          <p><strong>Ambient Temp:</strong> ${cur.temp}°C (Feels like ${cur.feelsLike}°C)</p>
        </div>
        <div>
          <p><strong>Humidity / Wind:</strong> ${cur.humidity}% | ${cur.windSpeed} km/h</p>
          <p><strong>Rain Risk / Soil:</strong> ${cur.rainProb}% rain chance | Est. Soil ${cur.soilMoisture}%</p>
        </div>
      </div>

      ${scan ? `
      <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid var(--border-card-bright); padding: 0.85rem; border-radius: var(--radius-sm); margin-bottom: 1rem; font-size: 0.83rem;">
        <h3 style="font-family: var(--font-heading); font-size: 0.95rem; color: var(--color-brand); margin-bottom: 0.3rem;">🔬 Latest AI Crop Disease Scan Diagnosis</h3>
        <p><strong>Detected Pathogen:</strong> ${scan.name} (<em>${scan.scientificName}</em>) - ${scan.confidence}% Confidence</p>
        <p><strong>Severity & Symptoms:</strong> ${scan.severity} Severity - ${scan.symptoms}</p>
        <p><strong>Recommended Treatment:</strong> ${scan.chemicalControl}</p>
      </div>
      ` : ''}

      <h3 style="font-family: var(--font-heading); font-size: 1rem; color: var(--text-main); margin-bottom: 0.5rem;">Critical Environmental Warnings:</h3>
      <ul style="padding-left: 1.2rem; font-size: 0.83rem; color: var(--text-muted); margin-bottom: 1rem;">
        ${analysis.alerts.map(a => `<li><strong>${a.type}:</strong> ${a.summary}</li>`).join('')}
      </ul>

      <h3 style="font-family: var(--font-heading); font-size: 1rem; color: var(--text-main); margin-bottom: 0.5rem;">Recommended Farm Action Windows:</h3>
      <div style="font-size: 0.83rem; color: var(--text-muted);">
        <p>🧪 <strong>Spraying:</strong> ${analysis.sprayingAdvice.statusTitle} - ${analysis.sprayingAdvice.mainReason}</p>
        <p>💧 <strong>Irrigation:</strong> ${analysis.irrigationAdvice.recommendation} - ${analysis.irrigationAdvice.reason}</p>
      </div>

      <div style="margin-top: 1.5rem; padding: 0.75rem; background: rgba(16, 185, 129, 0.15); border-radius: var(--radius-sm); border: 1px solid var(--color-brand); font-size: 0.8rem; text-align: center;">
        📱 SMS Alert Simulator: "AI FarmGuard: Alert for ${currentW.location.name}. ${analysis.alerts[0]?.title}. Spray window: ${analysis.sprayingAdvice.nextSafeWindow}."
      </div>
    </div>
  `;
}
