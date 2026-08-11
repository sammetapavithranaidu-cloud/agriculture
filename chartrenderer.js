// Custom SVG Chart Renderer for Weather Trends

/**
 * Render 24-Hour Interactive Temperature & Precipitation SVG Chart
 */
export function renderHourlyChart(containerEl, hourlyData, isFahrenheit = false) {
  if (!containerEl || !hourlyData || hourlyData.length === 0) return;

  const data = hourlyData.slice(0, 24);
  const width = containerEl.clientWidth || 800;
  const height = 180;
  const padding = { top: 30, right: 20, bottom: 35, left: 35 };

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Convert temps if needed
  const temps = data.map(d => isFahrenheit ? Math.round(d.temp * 1.8 + 32) : d.temp);
  const rainProbs = data.map(d => d.rainProb);

  const minTemp = Math.min(...temps) - 2;
  const maxTemp = Math.max(...temps) + 3;

  const stepX = chartW / (data.length - 1 || 1);

  // Generate SVG path points for temp line
  const points = temps.map((t, idx) => {
    const x = padding.left + idx * stepX;
    const y = padding.top + chartH - ((t - minTemp) / (maxTemp - minTemp || 1)) * chartH;
    return { x, y, temp: t, rainProb: rainProbs[idx], hourStr: data[idx].timeStr, icon: data[idx].isDay ? '☀️' : '🌙' };
  });

  // Polyline points
  const lineD = points.reduce((acc, p, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${p.x},${p.y}`, '');
  const areaD = `${lineD} L ${points[points.length - 1].x},${padding.top + chartH} L ${points[0].x},${padding.top + chartH} Z`;

  // Bars for Rain Probability
  const rainBars = points.map(p => {
    const barH = (p.rainProb / 100) * (chartH * 0.5);
    const barY = padding.top + chartH - barH;
    return `<rect x="${p.x - 6}" y="${barY}" width="12" height="${barH}" rx="2" fill="rgba(56, 189, 248, 0.35)" />`;
  }).join('');

  // Circles and text labels
  const pointsSvg = points.map((p, idx) => {
    const showLabel = idx % 2 === 0;
    return `
      <g class="chart-node" data-idx="${idx}">
        <circle cx="${p.x}" cy="${p.y}" r="4" fill="var(--color-primary)" stroke="#ffffff" stroke-width="2" />
        <text x="${p.x}" y="${p.y - 10}" text-anchor="middle" class="chart-temp-label">${p.temp}°</text>
        ${showLabel ? `<text x="${p.x}" y="${height - 8}" text-anchor="middle" class="chart-time-label">${p.hourStr}</text>` : ''}
        ${p.rainProb >= 30 ? `<text x="${p.x}" y="${height - 22}" text-anchor="middle" class="chart-rain-label">🌧️${p.rainProb}%</text>` : ''}
      </g>
    `;
  }).join('');

  const svgHtml = `
    <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--color-primary)" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="var(--color-primary)" stop-opacity="0.0"/>
        </linearGradient>
      </defs>
      <!-- Rain probability background bars -->
      ${rainBars}
      <!-- Gradient area under temperature curve -->
      <path d="${areaD}" fill="url(#tempGradient)" />
      <!-- Smooth polyline -->
      <path d="${lineD}" fill="none" stroke="var(--color-primary)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
      <!-- Interactive Points & Labels -->
      ${pointsSvg}
    </svg>
  `;

  containerEl.innerHTML = svgHtml;
}
