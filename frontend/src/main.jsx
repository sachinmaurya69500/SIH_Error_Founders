import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  LayersControl,
  LayerGroup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./styles.css";
import "./map.css";
import "./ai.css";

const API =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? "http://localhost:8000/api" : "/api");
const LOCATION = { latitude: 28.6139, longitude: 77.209 };
const demo = {
  weather: {
    temperature_2m: 29,
    relative_humidity_2m: 64,
    precipitation: 0.8,
    wind_speed_10m: 11,
  },
  risk: {
    overall_score: 62,
    category: "HIGH",
    components: { flood: 68, fire: 42, pollution: 76 },
  },
  alerts: [
    {
      type: "pollution",
      severity: "HIGH",
      location: "Delhi NCR",
      message: "Air quality is above the safe threshold",
    },
    {
      type: "flood",
      severity: "MODERATE",
      location: "Assam",
      message: "Rainfall accumulation is being monitored",
    },
  ],
};

async function get(path) {
  try {
    const r = await fetch(`${API}${path}`);
    const p = await r.json();
    return r.ok && p.success ? p.data : null;
  } catch {
    return null;
  }
}
async function post(path, body) {
  try {
    const r = await fetch(`${API}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const p = await r.json();
    return r.ok && p.success
      ? p.data
      : {
          error:
            p?.detail?.error?.message ||
            p?.error?.message ||
            `Request failed (${r.status})`,
        };
  } catch {
    return {
      error: `Unable to connect to ${API}. Start the backend or check VITE_API_BASE_URL.`,
    };
  }
}
async function getPointWeather(point) {
  try {
    const response = await fetch(
      `${API}/weather?latitude=${point.lat}&longitude=${point.lng}&forecast_days=3`,
    );
    const payload = await response.json();
    if (!response.ok || !payload.success)
      return {
        error:
          payload?.detail?.error?.message ||
          payload?.error?.message ||
          "The weather service rejected this location.",
      };
    return payload.data;
  } catch {
    return {
      error:
        "Unable to reach the weather service. Check the backend deployment and API connection.",
    };
  }
}

async function loadLiveData(location = LOCATION) {
  const [weather, rainfall, hotspots, pollution] = await Promise.all([
    get(
      `/weather?latitude=${location.latitude}&longitude=${location.longitude}&forecast_days=7`,
    ),
    get(
      `/rainfall?latitude=${location.latitude}&longitude=${location.longitude}`,
    ),
    get("/fire/hotspots?area=india&days=1"),
    get("/pollution?limit=20"),
  ]);
  const current = weather?.current || {};
  const flood = await get(
    `/flood/risk?rainfall_24h=${rainfall?.recent_totals?.last_24_hours ?? 0}&rainfall_7d=${rainfall?.forecast_total ?? 0}&forecast_rainfall=${rainfall?.forecast_total ?? 0}`,
  );
  const fire = await get(
    `/fire/risk?latitude=${location.latitude}&longitude=${location.longitude}&temperature=${current.temperature_2m ?? 0}&humidity=${current.relative_humidity_2m ?? 0}&wind=${current.wind_speed_10m ?? 0}&precipitation=${current.precipitation ?? 0}&hotspots=${hotspots?.length ?? 0}`,
  );
  const station = pollution?.[0] || {};
  const pollutionParams = new URLSearchParams(
    Object.entries({
      aqi: station.aqi,
      pm2_5: station.pm2_5,
      pm10: station.pm10,
    }).filter(
      ([, value]) =>
        value !== null && value !== undefined && value !== "" && value !== "NA",
    ),
  );
  const air = await get(`/pollution/risk?${pollutionParams.toString()}`);
  const overall = await get(
    `/risk?flood=${flood?.score ?? 0}&fire=${fire?.score ?? 0}&pollution=${air?.score ?? 0}`,
  );
  const alerts = await get(`/alerts?risk=${overall?.overall_score ?? 0}`);
  return {
    weather,
    rainfall,
    hotspots,
    pollution,
    flood,
    fire,
    air,
    overall,
    alerts,
  };
}

function Icon({ name, size = 18 }) {
  const paths = {
    grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
    pulse: "M3 12h4l2-7 4 14 2-7h6",
    cloud: "M7 18h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6 9.5 4.25 4.25 0 0 0 7 18Z",
    flame:
      "M12 3c1 4-3 5-3 9a3 3 0 0 0 6 0c0-1.6-.8-3-1.5-4.3C15 11 18 13 18 16a6 6 0 0 1-12 0c0-3 2-5 4.5-7.2C10.5 6.8 11.8 5 12 3Z",
    wind: "M3 8h12a3 3 0 1 0-3-3M3 12h17M3 16h12a3 3 0 1 1-3 3",
    layers: "m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5m-18 5 9 5 9-5",
    bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4",
    settings:
      "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.7 1.7-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.1h-2.4v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L8 17l.1-.1A1.7 1.7 0 0 0 8.4 15a1.7 1.7 0 0 0-1.6-1H6v-2.4h.8a1.7 1.7 0 0 0 1.6-1A1.7 1.7 0 0 0 8.1 9L8 8.9l1.7-1.7.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6v-.1h2.4V6a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 9l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1v2.4H21a1.7 1.7 0 0 0-1.6.6Z",
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name] || paths.grid} />
    </svg>
  );
}
function ScoreRing({ score }) {
  return (
    <div className="score-ring" style={{ "--score": `${score * 3.6}deg` }}>
      <div>
        <strong>{score}</strong>
        <span>/100</span>
      </div>
    </div>
  );
}
function RiskBar({ label, value, color }) {
  return (
    <div className="risk-bar">
      <div>
        <span>{label}</span>
        <b>{value}</b>
      </div>
      <i>
        <em style={{ width: `${value}%`, background: color }} />
      </i>
    </div>
  );
}
function IndiaMap({ hotspots = [], weather, onOpenLiveMap }) {
  const liveHotspots = hotspots
    .filter(
      (x) =>
        Number.isFinite(Number(x.latitude)) &&
        Number.isFinite(Number(x.longitude)),
    )
    .slice(0, 18);
  return (
    <div className="map-card overview-map-card">
      <div className="map-toolbar">
        <div>
          <span className="eyebrow">LIVE MONITORING</span>
          <h2>India environmental view</h2>
        </div>
        <button className="outline-button" onClick={onOpenLiveMap}>
          <Icon name="layers" size={15} /> Open live map
        </button>
      </div>
      <MapContainer
        center={[22.5, 79]}
        zoom={5}
        minZoom={4}
        maxZoom={8}
        scrollWheelZoom={false}
        className="map overview-map"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {liveHotspots.map((hotspot, index) => (
          <CircleMarker
            key={`${hotspot.latitude}-${hotspot.longitude}-${index}`}
            center={[Number(hotspot.latitude), Number(hotspot.longitude)]}
            radius={5}
            pathOptions={{
              color: "#ff707c",
              fillColor: "#ff707c",
              fillOpacity: 0.8,
            }}
          >
            <Popup>
              NASA FIRMS hotspot
              <br />
              Confidence: {hotspot.confidence ?? "—"}
            </Popup>
          </CircleMarker>
        ))}
        <CircleMarker
          center={[LOCATION.latitude, LOCATION.longitude]}
          radius={8}
          pathOptions={{
            color: "#63d8b5",
            fillColor: "#63d8b5",
            fillOpacity: 0.95,
          }}
        >
          <Popup>
            <strong>New Delhi</strong>
            <br />
            Temperature: {weather?.temperature_2m ?? "—"} °C
          </Popup>
        </CircleMarker>
      </MapContainer>
      <div className="overview-map-cta" onClick={onOpenLiveMap}>
        Explore live conditions <span>→</span>
      </div>
    </div>
  );
}

function ClickWeather({ onSelect }) {
  useMapEvents({ click: (event) => onSelect(event.latlng) });
  return null;
}
function FollowLocation({ location }) {
  const map = useMap();
  useEffect(() => {
    if (location?.latitude && location?.longitude) {
      map.setView([location.latitude, location.longitude], Math.max(map.getZoom(), 5), { animate: true });
    }
  }, [location?.latitude, location?.longitude, map]);
  return null;
}
function InteractiveIndiaMap({ hotspots = [], weather, states = [], location = LOCATION }) {
  const liveHotspots = hotspots.filter(
    (x) =>
      Number.isFinite(Number(x.latitude)) &&
      Number.isFinite(Number(x.longitude)),
  );
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedWeather, setSelectedWeather] = useState(null);
  const choosePoint = async (point) => {
    setSelected(point);
    setSelectedWeather(null);
    setLoading(true);
    const result = await getPointWeather(point);
    setSelectedWeather(result);
    setLoading(false);
  };
  return (
    <div className="interactive-map-wrap">
      <MapContainer
        center={[location.latitude, location.longitude]}
        zoom={5}
        minZoom={4}
        maxZoom={12}
        scrollWheelZoom
        className="interactive-map"
      >
        <FollowLocation location={location} />
        <ClickWeather onSelect={choosePoint} />
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="OpenStreetMap">
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>
          <LayersControl.Overlay checked name="State forecasts">
            <LayerGroup>
              {states.map((x, i) => {
                const temperature = Number(x.current?.temperature_2m);
                const color =
                  temperature >= 35
                    ? "#ff707c"
                    : temperature >= 28
                      ? "#ffbb63"
                      : "#63d8b5";
                return (
                  <CircleMarker
                    key={`${x.name}-${i}`}
                    center={[x.latitude, x.longitude]}
                    radius={6}
                    pathOptions={{ color, fillColor: color, fillOpacity: 0.8 }}
                  >
                    <Popup>
                      <strong>{x.name}</strong>
                      <br />
                      Temperature: {x.current?.temperature_2m ?? "—"} °C
                      <br />
                      Humidity: {x.current?.relative_humidity_2m ?? "—"}%<br />
                      Rain: {x.current?.precipitation ?? "—"} mm
                      <br />
                      <small>3-day forecast loaded from Open-Meteo</small>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </LayerGroup>
          </LayersControl.Overlay>
          <LayersControl.Overlay checked name="Fire hotspots">
            <LayerGroup>
              {liveHotspots.map((x, i) => (
                <CircleMarker
                  key={`${x.latitude}-${x.longitude}-${i}`}
                  center={[x.latitude, x.longitude]}
                  radius={7}
                  pathOptions={{
                    color: "#ff6b75",
                    fillColor: "#ff6b75",
                    fillOpacity: 0.75,
                  }}
                >
                  <Popup>
                    <strong>NASA FIRMS hotspot</strong>
                    <br />
                    Satellite: {x.satellite || "—"}
                    <br />
                    Confidence: {x.confidence ?? "—"}
                    <br />
                    FRP: {x.frp ?? "—"} MW
                  </Popup>
                </CircleMarker>
              ))}
            </LayerGroup>
          </LayersControl.Overlay>
          <LayersControl.Overlay checked name="Current device location">
            <LayerGroup>
              <CircleMarker
                center={[location.latitude, location.longitude]}
                radius={9}
                pathOptions={{
                  color: "#63d8b5",
                  fillColor: "#63d8b5",
                  fillOpacity: 0.9,
                }}
              >
                <Popup>
                  <strong>Current device location</strong>
                  <br />
                  {location.latitude.toFixed(4)}°N, {location.longitude.toFixed(4)}°E
                  <br />
                  Temperature: {weather?.temperature_2m ?? "—"} °C
                  <br />
                  Humidity: {weather?.relative_humidity_2m ?? "—"}%
                </Popup>
              </CircleMarker>
            </LayerGroup>
          </LayersControl.Overlay>
          {selected && (
            <CircleMarker
              center={[selected.lat, selected.lng]}
              radius={10}
              pathOptions={{
                color: "#ffffff",
                fillColor: "#63d8b5",
                fillOpacity: 0.95,
              }}
            >
              <Popup>
                <strong>Selected location</strong>
                <br />
                {selected.lat.toFixed(4)}°N, {selected.lng.toFixed(4)}°E
                <br />
                {loading ? (
                  "Loading live weather…"
                ) : selectedWeather?.error ? (
                  selectedWeather.error
                ) : selectedWeather ? (
                  <>
                    Temperature:{" "}
                    {selectedWeather.current?.temperature_2m ?? "—"} °C
                    <br />
                    Humidity:{" "}
                    {selectedWeather.current?.relative_humidity_2m ?? "—"}%
                    <br />
                    Wind: {selectedWeather.current?.wind_speed_10m ?? "—"} km/h
                    <br />
                    <small>Forecast available in the Weather tab</small>
                  </>
                ) : (
                  "Weather unavailable for this location"
                )}
              </Popup>
            </CircleMarker>
          )}
        </LayersControl>
      </MapContainer>
      <div className="map-live-badge">
        <i /> LIVE · {liveHotspots.length} hotspots · {states.length} state
        forecasts
      </div>
      <div className="map-click-hint">
        Click anywhere in India for live weather
      </div>
    </div>
  );
}
function toggleMapLayer(name) {
  const labels = [
    ...document.querySelectorAll(".leaflet-control-layers-overlays label"),
  ];
  const label = labels.find((item) => item.textContent.trim() === name);
  label?.querySelector("input")?.click();
}
function ProviderHealth({ providers = {} }) {
  return (
    <div className="provider-health">
      {Object.entries(providers).map(([name, item]) => (
        <div className="provider-row" key={name}>
          <span className={`provider-dot ${item.status?.toLowerCase()}`} />
          <div>
            <strong>{name}</strong>
            <small>{item.reason}</small>
          </div>
          <b className={`provider-status ${item.status?.toLowerCase()}`}>
            {item.status}
          </b>
        </div>
      ))}
    </div>
  );
}
function DataPanel({ title, eyebrow, children }) {
  return (
    <div className="panel data-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
        </div>
      </div>
      {children}
    </div>
  );
}
function Table({ columns, rows }) {
  return (
    <div className="data-table">
      <div className="table-row table-head">
        {columns.map((c) => (
          <span key={c}>{c}</span>
        ))}
      </div>
      {rows.map((row, i) => (
        <div className="table-row" key={i}>
          {row.map((cell, j) => (
            <span key={j}>{cell}</span>
          ))}
        </div>
      ))}
    </div>
  );
}
function HourlyForecast({ hourly = {}, temp, imperial }) {
  const times = hourly.time || [];
  const temperatures = hourly.temperature_2m || [];
  const precipitation = hourly.precipitation_probability || [];
  const weatherCodes = hourly.weather_code || [];
  const start = Math.max(
    times.findIndex((time) => new Date(time) >= new Date()) - 1,
    0,
  );
  const items = times
    .slice(start, start + 12)
    .map((time, index) => ({
      time,
      temperature: temperatures[start + index],
      precipitation: precipitation[start + index],
      code: weatherCodes[start + index],
    }));
  const fallback = ["NOW", "3 PM", "6 PM", "9 PM"].map((label, index) => ({
    time: label,
    temperature: [temp, 30, 27, 25][index],
    precipitation: null,
    code: null,
  }));
  const forecast = items.length ? items : fallback;
  const iconFor = (code) =>
    code == null
      ? "☼"
      : Number(code) >= 80
        ? "⛈"
        : Number(code) >= 50
          ? "☂"
          : Number(code) >= 1
            ? "☁"
            : "☼";
  return (
    <div className="hourly-forecast">
      <div className="hourly-forecast-track">
        {forecast.map((item, index) => {
          const label =
            typeof item.time === "string" && item.time.includes("T")
              ? index === 0
                ? "NOW"
                : new Date(item.time).toLocaleTimeString("en-IN", {
                    hour: "numeric",
                    hour12: true,
                  })
              : item.time;
          const value = Number(item.temperature);
          const display = Number.isFinite(value)
            ? imperial
              ? Math.round((value * 9) / 5 + 32)
              : Math.round(value)
            : "—";
          return (
            <div
              className={`hourly-card ${index === 0 ? "current" : ""}`}
              key={`${item.time}-${index}`}
            >
              <span>{label}</span>
              <i>{iconFor(item.code)}</i>
              <b>{display}°</b>
              <small>
                {item.precipitation == null
                  ? "—"
                  : `${Math.round(item.precipitation)}%`}{" "}
                rain
              </small>
            </div>
          );
        })}
      </div>
      <div className="hourly-scroll-hint">
        Scroll for more hours <span>→</span>
      </div>
    </div>
  );
}
function RainfallWorkspace({ rainfall, risk, settings }) {
  const imperial = settings.units === "imperial";
  const convert = (value) =>
    value == null ? null : imperial ? Number(value) * 0.0393701 : Number(value);
  const unit = imperial ? "in" : "mm";
  const format = (value) => {
    const converted = convert(value);
    return converted == null || Number.isNaN(converted)
      ? "—"
      : `${converted < 1 ? converted.toFixed(2) : converted.toFixed(1)} ${unit}`;
  };
  const hourlyValues = (rainfall?.hourly?.precipitation || [])
    .slice(-12)
    .map((value) => Number(value) || 0);
  const maxHourly = Math.max(...hourlyValues, 1);
  const dailyTimes = rainfall?.daily?.time || [];
  const dailyValues = rainfall?.daily?.precipitation_sum || [];
  const daily = dailyValues
    .slice(0, 7)
    .map((value, index) => ({
      date: dailyTimes[index],
      value: Number(value) || 0,
    }));
  const wetDays = daily.filter((item) => item.value >= 1).length;
  const peak = daily.reduce(
    (current, item) => (item.value > current.value ? item : current),
    { value: 0 },
  );
  const peakLabel = peak.date
    ? new Date(`${peak.date}T12:00:00`).toLocaleDateString("en-IN", {
        weekday: "short",
      })
    : "—";
  const floodRisk = Number(risk?.components?.flood ?? risk?.flood?.score ?? 0);
  return (
    <section className="rainfall-workspace">
      <div className="rainfall-hero">
        <div>
          <span className="eyebrow">
            PRECIPITATION INTELLIGENCE · OPEN-METEO
          </span>
          <h2>Rainfall monitor</h2>
          <p>
            Track recent accumulation and the next seven days of precipitation
            around your monitoring location.
          </p>
        </div>
        <div className="rainfall-hero-reading">
          <strong>{format(rainfall?.current_precipitation)}</strong>
          <span>current precipitation</span>
          <i
            className={
              Number(rainfall?.current_precipitation) > 2 ? "rain-active" : ""
            }
          />
        </div>
      </div>
      <div className="rainfall-stat-grid">
        <div className="rainfall-stat">
          <small>LAST 1 HOUR</small>
          <strong>{format(rainfall?.recent_totals?.last_1_hour)}</strong>
          <span>Immediate intensity</span>
        </div>
        <div className="rainfall-stat">
          <small>LAST 6 HOURS</small>
          <strong>{format(rainfall?.recent_totals?.last_6_hours)}</strong>
          <span>Short-range accumulation</span>
        </div>
        <div className="rainfall-stat">
          <small>LAST 24 HOURS</small>
          <strong>{format(rainfall?.recent_totals?.last_24_hours)}</strong>
          <span>Flood input window</span>
        </div>
        <div className="rainfall-stat accent">
          <small>7-DAY OUTLOOK</small>
          <strong>{format(rainfall?.forecast_total)}</strong>
          <span>{wetDays} wet days forecast</span>
        </div>
      </div>
      <div className="rainfall-content-grid">
        <DataPanel title="Recent intensity" eyebrow="LAST 12 HOURS">
          <div className="rainfall-chart-meta">
            <span>Hourly precipitation</span>
            <b>{format(Math.max(...hourlyValues, 0))} peak</b>
          </div>
          <div className="rainfall-chart">
            {(hourlyValues.length
              ? hourlyValues
              : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
            ).map((value, index) => (
              <div
                className="rainfall-bar"
                key={`${index}-${value}`}
                title={`${format(value)} precipitation`}
              >
                <i
                  style={{
                    height: `${Math.max((value / maxHourly) * 100, value ? 8 : 2)}%`,
                  }}
                />
                <span>
                  {index === hourlyValues.length - 1
                    ? "now"
                    : `-${hourlyValues.length - index - 1}h`}
                </span>
              </div>
            ))}
          </div>
          <div className="rainfall-chart-footer">
            <span>
              <i className="rain-dot" /> Precipitation
            </span>
            <span>Updates with each refresh</span>
          </div>
        </DataPanel>
        <DataPanel title="Seven-day outlook" eyebrow="FORECAST">
          <div className="rainfall-days">
            {daily.length ? (
              daily.map((item) => (
                <div
                  className={
                    item.value === peak.value && item.value > 0
                      ? "rainfall-day peak"
                      : "rainfall-day"
                  }
                  key={item.date}
                >
                  <span>
                    {item.date
                      ? new Date(`${item.date}T12:00:00`).toLocaleDateString(
                          "en-IN",
                          { weekday: "short" },
                        )
                      : "—"}
                  </span>
                  <b>{format(item.value)}</b>
                  <i
                    style={{
                      height: `${Math.max((item.value / Math.max(...daily.map((day) => day.value), 1)) * 100, item.value ? 12 : 4)}%`,
                    }}
                  />
                </div>
              ))
            ) : (
              <p className="rainfall-empty">
                Forecast data will appear after the next provider response.
              </p>
            )}
          </div>
          <div className="rainfall-peak">
            <span>Peak forecast day</span>
            <strong>
              {peakLabel} · {format(peak.value)}
            </strong>
          </div>
        </DataPanel>
      </div>
      <div className="rainfall-bottom-grid">
        <DataPanel title="Flood signal context" eyebrow="RISK ENGINE">
          <div className="rainfall-risk-row">
            <div
              className="rainfall-risk-ring"
              style={{ "--rain-score": `${floodRisk * 3.6}deg` }}
            >
              <strong>{floodRisk}</strong>
              <span>/100</span>
            </div>
            <div>
              <strong>
                {floodRisk >= 61 ? "Elevated attention" : "Routine monitoring"}
              </strong>
              <p>
                Recent and forecast rainfall are combined with other
                environmental signals to estimate flood potential.
              </p>
            </div>
          </div>
          <RiskBar
            label="Flood risk contribution"
            value={floodRisk}
            color="#5b9cff"
          />
        </DataPanel>
        <DataPanel title="Monitoring notes" eyebrow="DATA QUALITY">
          <div className="rainfall-notes">
            <div>
              <span>Provider</span>
              <strong>Open-Meteo</strong>
            </div>
            <div>
              <span>Forecast range</span>
              <strong>{daily.length || 0} days loaded</strong>
            </div>
            <div>
              <span>Measurement</span>
              <strong>
                {unit} · {settings.units === "imperial" ? "imperial" : "metric"}
              </strong>
            </div>
          </div>
          <p className="rainfall-disclaimer">
            Rainfall readings are observational guidance and should not replace
            official weather or flood warnings.
          </p>
        </DataPanel>
      </div>
    </section>
  );
}
function FireWorkspace({ hotspots = [], risk }) {
  const valid = hotspots.filter(
    (item) =>
      Number.isFinite(Number(item.latitude)) &&
      Number.isFinite(Number(item.longitude)),
  );
  const totalFrp = valid.reduce(
    (sum, item) => sum + (Number(item.frp) || 0),
    0,
  );
  const highConfidence = valid.filter(
    (item) => Number(item.confidence) >= 80,
  ).length;
  const peak = valid.reduce(
    (current, item) =>
      Number(item.frp) > Number(current.frp || 0) ? item : current,
    {},
  );
  const fireRisk = Number(risk?.components?.fire ?? 0);
  return (
    <section className="hazard-workspace">
      <div className="hazard-hero fire-hero">
        <div>
          <span className="eyebrow">SATELLITE DETECTION · NASA FIRMS</span>
          <h2>Active fire intelligence</h2>
          <p>
            Near-real-time thermal anomalies across India, ranked by confidence
            and fire radiative power.
          </p>
        </div>
        <div className="hazard-hero-value">
          <strong>{valid.length}</strong>
          <span>hotspots · last 24h</span>
        </div>
      </div>
      <div className="hazard-stat-grid">
        <div>
          <small>HIGH CONFIDENCE</small>
          <strong>{highConfidence}</strong>
          <span>detections above 80%</span>
        </div>
        <div>
          <small>TOTAL FRP</small>
          <strong>
            {totalFrp.toFixed(0)} <em>MW</em>
          </strong>
          <span>combined radiative power</span>
        </div>
        <div>
          <small>PEAK DETECTION</small>
          <strong>
            {peak.frp ? `${Number(peak.frp).toFixed(0)} MW` : "—"}
          </strong>
          <span>
            {peak.latitude
              ? `${Number(peak.latitude).toFixed(2)}°N, ${Number(peak.longitude).toFixed(2)}°E`
              : "No signal"}
          </span>
        </div>
        <div className="hazard-risk-card">
          <small>FIRE RISK SCORE</small>
          <strong>
            {fireRisk}
            <em>/100</em>
          </strong>
          <span>{fireRisk >= 60 ? "Elevated attention" : "Monitoring"}</span>
        </div>
      </div>
      <div className="hazard-content-grid">
        <DataPanel title="Latest detections" eyebrow="SORTED BY FRP">
          <div className="hazard-table">
            {valid.length ? (
              valid
                .slice()
                .sort((a, b) => Number(b.frp || 0) - Number(a.frp || 0))
                .slice(0, 8)
                .map((item, index) => (
                  <div
                    className="hazard-row"
                    key={`${item.latitude}-${item.longitude}-${index}`}
                  >
                    <div className="hazard-row-icon">🔥</div>
                    <div className="hazard-row-main">
                      <strong>
                        {Number(item.latitude).toFixed(2)}°N,{" "}
                        {Number(item.longitude).toFixed(2)}°E
                      </strong>
                      <span>
                        {item.satellite || "VIIRS"} ·{" "}
                        {item.instrument || "Satellite"} ·{" "}
                        {item.acquisition_date || "Recent"}
                      </span>
                    </div>
                    <b>
                      {item.frp == null
                        ? "—"
                        : `${Number(item.frp).toFixed(1)} MW`}
                    </b>
                    <span
                      className={`confidence ${Number(item.confidence) >= 80 ? "high" : ""}`}
                    >
                      {item.confidence ?? "—"}%
                    </span>
                  </div>
                ))
            ) : (
              <p className="hazard-empty">
                No satellite hotspots returned. Check NASA FIRMS configuration
                or refresh the data.
              </p>
            )}
          </div>
        </DataPanel>
        <DataPanel title="Detection profile" eyebrow="WHAT TO WATCH">
          <div className="signal-list">
            <div>
              <span>Confidence threshold</span>
              <b>80% high confidence</b>
            </div>
            <div>
              <span>Primary signal</span>
              <b>Thermal anomaly + FRP</b>
            </div>
            <div>
              <span>Feed cadence</span>
              <b>Last 24 hours</b>
            </div>
            <div>
              <span>Map action</span>
              <b>Open Live map for coordinates</b>
            </div>
          </div>
          <p className="hazard-disclaimer">
            Hotspots are satellite detections, not confirmed ground fires.
            Validate before emergency action.
          </p>
        </DataPanel>
      </div>
    </section>
  );
}

function PollutionWorkspace({ pollution = [], risk }) {
  const records = pollution.filter(
    (item) => item && (item.aqi != null || item.pm2_5 != null),
  );
  const numeric = (field) =>
    records.map((item) => Number(item[field])).filter(Number.isFinite);
  const average = (values) =>
    values.length
      ? Math.round(
          values.reduce((sum, value) => sum + value, 0) / values.length,
        )
      : null;
  const aqiValues = numeric("aqi");
  const pm25Values = numeric("pm2_5");
  const worst = records
    .slice()
    .sort((a, b) => Number(b.aqi || 0) - Number(a.aqi || 0))[0];
  const pollutionRisk = Number(risk?.components?.pollution ?? 0);
  return (
    <section className="hazard-workspace">
      <div className="hazard-hero pollution-hero">
        <div>
          <span className="eyebrow">AIR QUALITY INTELLIGENCE · CPCB</span>
          <h2>Pollution across India</h2>
          <p>
            Compare station-level AQI and particulate matter readings to
            identify the locations needing attention.
          </p>
        </div>
        <div className="hazard-hero-value">
          <strong>{average(aqiValues) ?? "—"}</strong>
          <span>average AQI</span>
        </div>
      </div>
      <div className="hazard-stat-grid">
        <div>
          <small>STATIONS REPORTING</small>
          <strong>{records.length}</strong>
          <span>available observations</span>
        </div>
        <div>
          <small>AVERAGE PM2.5</small>
          <strong>
            {average(pm25Values) ?? "—"} <em>µg/m³</em>
          </strong>
          <span>across reporting stations</span>
        </div>
        <div>
          <small>HIGHEST AQI</small>
          <strong>{worst?.aqi ?? "—"}</strong>
          <span>{worst?.city || worst?.station || "No station"}</span>
        </div>
        <div className="hazard-risk-card pollution-risk-card">
          <small>POLLUTION RISK SCORE</small>
          <strong>
            {pollutionRisk}
            <em>/100</em>
          </strong>
          <span>
            {pollutionRisk >= 60 ? "Unhealthy conditions" : "Monitoring"}
          </span>
        </div>
      </div>
      <div className="hazard-content-grid">
        <DataPanel title="Station readings" eyebrow="LATEST CPCB OBSERVATIONS">
          <div className="pollution-table">
            {records.length ? (
              records
                .slice()
                .sort((a, b) => Number(b.aqi || 0) - Number(a.aqi || 0))
                .slice(0, 8)
                .map((item, index) => (
                  <div
                    className="pollution-row"
                    key={`${item.station}-${index}`}
                  >
                    <div>
                      <strong>{item.station || "Unknown station"}</strong>
                      <span>
                        {item.city || "—"} · {item.state || "India"}
                      </span>
                    </div>
                    <b
                      className={
                        Number(item.aqi) >= 200
                          ? "pollution-severe"
                          : Number(item.aqi) >= 100
                            ? "pollution-high"
                            : ""
                      }
                    >
                      {item.aqi ?? "—"} <small>AQI</small>
                    </b>
                    <span>PM2.5 {item.pm2_5 ?? "—"}</span>
                    <span>PM10 {item.pm10 ?? "—"}</span>
                  </div>
                ))
            ) : (
              <p className="hazard-empty">
                No CPCB observations returned. Add DATA_GOV_API_KEY and refresh.
              </p>
            )}
          </div>
        </DataPanel>
        <DataPanel title="Pollutant profile" eyebrow="AVAILABLE MEASUREMENTS">
          <div className="pollutant-bars">
            {[
              ["PM2.5", average(pm25Values), 150, "#b08cff"],
              ["PM10", average(numeric("pm10")), 250, "#ff9c5c"],
              ["NO2", average(numeric("no2")), 200, "#6daaff"],
              ["O3", average(numeric("o3")), 180, "#63d8b5"],
            ].map(([label, value, max, color]) => (
              <div key={label}>
                <div>
                  <span>{label}</span>
                  <b>{value ?? "—"}</b>
                </div>
                <i>
                  <em
                    style={{
                      width: `${Math.min((Number(value || 0) / max) * 100, 100)}%`,
                      background: color,
                    }}
                  />
                </i>
              </div>
            ))}
          </div>
          <p className="hazard-disclaimer">
            AQI interpretation depends on pollutant mix, station location, and
            update time. Use official advisories for public-health decisions.
          </p>
        </DataPanel>
      </div>
    </section>
  );
}
const DEFAULT_SETTINGS = {
  locationMode: "device",
  refreshMinutes: "5",
  units: "metric",
  theme: "dark",
};

function readSettings() {
  try {
    return {
      ...DEFAULT_SETTINGS,
      ...JSON.parse(localStorage.getItem("ecoshield-settings") || "{}"),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

const settings = readSettings();
const updateSettings = (changes) => Object.assign(settings, changes);
const alertToast = null;
const setAlertToast = () => {};
document.documentElement.dataset.theme = settings.theme;

function buildRiskAlerts(risk, rainfall, hotspots = []) {
  const components = risk?.components || {};
  const checks = [
    [
      "overall",
      "Overall environmental risk",
      risk?.overall_score,
      "Combined signals crossed the high-risk threshold.",
    ],
    [
      "flood",
      "Flood risk",
      components.flood,
      "Rainfall accumulation or forecast precipitation is elevated.",
    ],
    [
      "fire",
      "Fire risk",
      components.fire,
      `${hotspots.length} active fire hotspots are being monitored.`,
    ],
    [
      "pollution",
      "Pollution risk",
      components.pollution,
      "Air quality indicators are above the safe threshold.",
    ],
  ];
  const alerts = checks
    .filter(([, , score]) => Number(score) >= 60)
    .map(([type, label, score, message]) => ({
      type,
      severity: Number(score) >= 80 ? "EXTREME" : "HIGH",
      location: "Current monitoring area",
      score: Number(score),
      message: `${label}: ${message}`,
    }));
  const rainfall24h = Number(rainfall?.recent_totals?.last_24_hours ?? 0);
  if (rainfall24h >= 80)
    alerts.push({
      type: "rainfall",
      severity: rainfall24h >= 150 ? "EXTREME" : "HIGH",
      location: "Current monitoring area",
      score: rainfall24h,
      message: `Heavy rainfall accumulation detected: ${rainfall24h.toFixed(1)} mm in the last 24 hours.`,
    });
  return alerts;
}

function AlertToast({ alert, onClose }) {
  if (!alert) return null;
  return (
    <div
      className={`risk-alert-toast ${alert.severity === "EXTREME" ? "extreme" : ""}`}
      role="alert"
    >
      <div className="risk-alert-icon">!</div>
      <div>
        <span>LIVE RISK ALERT · {alert.severity}</span>
        <strong>{alert.message}</strong>
        <small>{alert.location} · Review the Alerts tab for details.</small>
      </div>
      <button onClick={onClose} aria-label="Dismiss alert">
        ×
      </button>
    </div>
  );
}

function AIAssistant({ active, weather, rainfall, hotspots, risk, alerts }) {
  const [open, setOpen] = useState(true);
  const overall = Number(risk?.overall_score ?? 62);
  const flood = Number(risk?.components?.flood ?? 0);
  const fire = Number(risk?.components?.fire ?? 0);
  const pollution = Number(risk?.components?.pollution ?? 0);
  const rainfall24h = Number(rainfall?.recent_totals?.last_24_hours ?? 0);
  const hotspotCount = hotspots?.length ?? 0;
  const warning =
    overall >= 70 ||
    pollution >= 75 ||
    flood >= 70 ||
    fire >= 70 ||
    rainfall24h >= 80 ||
    hotspotCount >= 30;
  const drivers = [];
  if (pollution >= 75) drivers.push(`air quality risk is ${pollution}/100`);
  if (flood >= 70 || rainfall24h >= 80)
    drivers.push("rainfall signals are elevated");
  if (fire >= 70 || hotspotCount >= 30)
    drivers.push(`${hotspotCount} active fire hotspots detected`);
  const title = warning
    ? "Potential warning detected"
    : "Conditions look stable";
  const summary = drivers.length
    ? `AI is watching this tab because ${drivers.join(" and ")}.`
    : `AI read the latest provider data for ${active.toLowerCase()} and found no immediate threshold breach.`;
  const recommendation = warning
    ? "Review the Alerts and Live map tabs for affected areas."
    : "Continue monitoring. The next automatic refresh will re-check the signals.";
  return (
    <aside
      className={`ai-float ${open ? "is-open" : "is-collapsed"} ${warning ? "is-warning" : "is-clear"}`}
      aria-live="polite"
    >
      <button
        className="ai-float-toggle"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Collapse AI summary" : "Expand AI summary"}
      >
        <span className="ai-spark">✦</span>
        {!open && <span>AI signal</span>}
        <span className="ai-toggle-mark">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="ai-float-body">
          <div className="ai-float-heading">
            <div>
              <span className="eyebrow">
                AI SIGNAL · {active.toUpperCase()}
              </span>
              <strong>{title}</strong>
            </div>
            <span className="ai-state-dot" />
          </div>
          <p>{summary}</p>
          <div className="ai-float-reading">
            <span>Risk score</span>
            <b>{overall}/100</b>
            <span>
              · {weather?.temperature_2m ?? "—"}°C · {rainfall24h || "—"} mm
              rain
            </span>
          </div>
          <small>{recommendation}</small>
          {alerts?.[0] && (
            <div className="ai-float-alert">
              <b>Latest alert</b>
              <span>{alerts[0].message}</span>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

function Workspace({
  active,
  location,
  weather,
  rainfall,
  hotspots,
  pollution,
  stateForecasts,
  risk,
  alerts,
  settings,
  onSettingsChange,
  onNavigate,
  onGenerateBriefing,
}) {
  const temp = Math.round(weather?.temperature_2m ?? 29);
  const rain = rainfall?.current_precipitation ?? weather?.precipitation ?? 0.8;
  const [selectedStateName, setSelectedStateName] = useState("");
  const selectedState = (stateForecasts || []).find((state) => state.name === selectedStateName);
  const imperial = settings.units === "imperial";
  const displayTemp = `${imperial ? Math.round((temp * 9) / 5 + 32) : temp}°${imperial ? "F" : "C"}`;
  const displayWind = `${imperial ? Math.round((weather?.wind_speed_10m ?? 11) * 0.621371) : (weather?.wind_speed_10m ?? 11)} ${imperial ? "mph" : "km/h"}`;
  const displayRain = `${imperial ? (rain * 0.0393701).toFixed(2) : rain} ${imperial ? "in" : "mm"}`;
  if (active === "State data")
    return (
      <section className="workspace-single state-data-workspace">
        <DataPanel title="India state data" eyebrow="ALL INDIA FORECAST NETWORK">
          <div className="state-data-toolbar">
            <label>
              Select a state or territory
              <select id="state-data-select" value={selectedStateName} onChange={(event) => setSelectedStateName(event.target.value)}>
                <option value="" disabled>Choose a location</option>
                {(stateForecasts || []).map((state) => (
                  <option value={state.name} key={state.name}>{state.name}</option>
                ))}
              </select>
            </label>
            <span>{stateForecasts?.length || 0} locations available</span>
          </div>
          {selectedState && <div className="state-data-selected"><strong>{selectedState.name}</strong><span>{selectedState.current?.temperature_2m ?? "—"}°C · {selectedState.current?.relative_humidity_2m ?? "—"}% humidity · {selectedState.current?.precipitation ?? "—"} mm rain · {selectedState.current?.wind_speed_10m ?? "—"} km/h wind</span></div>}
          <div className="state-data-grid">
            {(stateForecasts || []).map((state) => (
              <button className={`state-data-card ${selectedStateName === state.name ? "selected" : ""}`} key={state.name} onClick={() => setSelectedStateName(state.name)}>
                <strong>{state.name}</strong>
                <span>{state.current?.temperature_2m ?? "—"}°C · {state.current?.relative_humidity_2m ?? "—"}% humidity</span>
                <small>Rain {state.current?.precipitation ?? "—"} mm · Wind {state.current?.wind_speed_10m ?? "—"} km/h</small>
              </button>
            ))}
          </div>
        </DataPanel>
      </section>
    );
  if (active === "Live map")
    return (
      <section className="workspace-wide">
        <InteractiveIndiaMap
          hotspots={hotspots || []}
          weather={weather}
          states={risk?.state_forecasts || []}
          location={risk?.location || LOCATION}
        />
        <div className="panel map-note">
          <span className="eyebrow">INTERACTIVE MAP</span>
          <h2>Live environmental layers</h2>
          <p>
            Pan and zoom across India, click any state for its forecast, or
            click a random point for live weather.
          </p>
          <div className="layer-buttons">
            <button
              className="layer-active"
              onClick={() => toggleMapLayer("State forecasts")}
            >
              <span /> State weather forecasts
            </button>
            <button onClick={() => toggleMapLayer("Current device location")}>
              <span /> Weather · Current device location
            </button>
            <button onClick={() => toggleMapLayer("Fire hotspots")}>
              <span /> NASA FIRMS hotspots
            </button>
            <button
              onClick={() =>
                alert(
                  "Flood signals become available after an Earth Engine flood export is completed.",
                )
              }
            >
              <span /> Flood signals
            </button>
          </div>
          <small className="map-source">
            Map tiles © OpenStreetMap contributors
          </small>
        </div>
      </section>
    );
  if (active === "Weather")
    return (
      <section className="workspace-grid">
        <DataPanel title="Weather now · New Delhi" eyebrow="OPEN-METEO · LIVE">
          <div className="big-reading">
            <strong>{displayTemp}</strong>
            <span>Partly cloudy</span>
          </div>
          <div className="stat-grid">
            <div>
              <small>Humidity</small>
              <b>{weather?.relative_humidity_2m ?? 64}%</b>
            </div>
            <div>
              <small>Wind speed</small>
              <b>{displayWind}</b>
            </div>
            <div>
              <small>Precipitation</small>
              <b>{displayRain}</b>
            </div>
            <div>
              <small>Coordinates</small>
              <b>{location?.latitude?.toFixed(4)}, {location?.longitude?.toFixed(4)}</b>
            </div>
          </div>
        </DataPanel>
        <DataPanel title="Next hours" eyebrow="LIVE HOURLY FORECAST">
          <HourlyForecast
            hourly={weather?.hourly}
            temp={temp}
            imperial={imperial}
          />
        </DataPanel>
      </section>
    );
  if (active === "Rainfall")
    return (
      <RainfallWorkspace rainfall={rainfall} risk={risk} settings={settings} />
    );
  if (active === "Fire hotspots")
    return <FireWorkspace hotspots={hotspots || []} risk={risk} />;
  if (active === "Pollution")
    return (
      <PollutionWorkspace
        pollution={pollution || risk?.pollution_data || []}
        risk={risk}
      />
    );
  if (active === "Flood risk")
    return (
      <section className="workspace-grid">
        <DataPanel
          title="Flood risk assessment"
          eyebrow="RAINFALL + TERRAIN SIGNALS"
        >
          <div className="flood-score">
            <ScoreRing score={risk?.components?.flood ?? 68} />
            <div>
              <strong>
                {risk?.components?.flood >= 61
                  ? "High attention"
                  : "Monitoring"}
              </strong>
              <p>
                Accumulated rainfall and forecast precipitation are being
                evaluated for flood potential.
              </p>
            </div>
          </div>
          <RiskBar
            label="Flood risk"
            value={risk?.components?.flood ?? 68}
            color="#5b9cff"
          />
          {risk?.flood_job ? (
            <p className="job-status">
              Earth Engine task submitted: <code>{risk.flood_job.task_id}</code>
            </p>
          ) : risk?.flood_error ? (
            <p className="ai-error">{risk.flood_error}</p>
          ) : null}
          <button
            className="full-button"
            onClick={onNavigate.startFloodAnalysis}
          >
            {risk?.flood_job
              ? "Submit another Sentinel-1 analysis"
              : "Start Sentinel-1 analysis"}{" "}
            <span>→</span>
          </button>
        </DataPanel>
        <DataPanel title="Detection workflow" eyebrow="GOOGLE EARTH ENGINE">
          <div className="steps">
            <div>
              <b>01</b>
              <span>Use current device location as AOI</span>
            </div>
            <div>
              <b>02</b>
              <span>Compare recent Sentinel-1 acquisitions</span>
            </div>
            <div>
              <b>03</b>
              <span>Submit satellite analysis task</span>
            </div>
          </div>
        </DataPanel>
      </section>
    );
  if (active === "Alerts")
    return (
      <section className="workspace-single">
        <DataPanel title="Alerts center" eyebrow="THRESHOLD MONITORING">
          <div className="alert-list">
            {alerts.map((a, i) => (
              <div className="alert-row" key={i}>
                <div className={`alert-symbol ${a.severity?.toLowerCase()}`}>
                  ≋
                </div>
                <div className="alert-copy">
                  <strong>{a.message}</strong>
                  <span>{a.location} · Just now</span>
                </div>
                <span className={`severity ${a.severity?.toLowerCase()}`}>
                  {a.severity}
                </span>
                <button className="row-arrow">→</button>
              </div>
            ))}
          </div>
        </DataPanel>
      </section>
    );
  if (active === "AI briefing")
    return (
      <section className="workspace-single">
        <DataPanel
          title="Gemini environmental briefing"
          eyebrow="AI INSIGHT · VERIFIED LIVE DATA"
        >
          <div className="ai-briefing">
            {risk?.ai_briefing ? (
              <p>{risk.ai_briefing}</p>
            ) : (
              <>
                <strong>Generate an evidence-based briefing</strong>
                <p>
                  Gemini will explain the latest weather, rainfall, fire,
                  pollution, and risk readings without changing the calculated
                  scores.
                </p>
                {risk?.ai_error && <p className="ai-error">{risk.ai_error}</p>}
                <button
                  className="full-button"
                  onClick={onNavigate.generateBriefing}
                >
                  Generate briefing <span>✦</span>
                </button>
              </>
            )}
          </div>
        </DataPanel>
      </section>
    );
  if (active === "Data health")
    return (
      <section className="workspace-single">
        <DataPanel
          title="Data delivery health"
          eyebrow="WHY RECORDS MAY BE MISSING"
        >
          <p>
            These diagnostics show whether each provider is configured before
            the dashboard requests its records.
          </p>
          <ProviderHealth providers={risk?.provider_status || {}} />
        </DataPanel>
      </section>
    );
  if (active === "Settings")
    return (
      <section className="workspace-single">
        <DataPanel title="Workspace settings" eyebrow="ECOSHIELD CONFIGURATION">
          <div className="settings-form">
            <label>
              Monitoring location
              <select
                value={settings.locationMode}
                onChange={(event) =>
                  onSettingsChange({ locationMode: event.target.value })
                }
              >
                <option value="device">Current device location</option>
                <option value="delhi">New Delhi, India</option>
              </select>
            </label>
            <label>
              Data refresh interval
              <select
                value={settings.refreshMinutes}
                onChange={(event) =>
                  onSettingsChange({ refreshMinutes: event.target.value })
                }
              >
                <option value="1">Every minute</option>
                <option value="5">Every 5 minutes</option>
                <option value="15">Every 15 minutes</option>
              </select>
            </label>
            <label>
              Units
              <select
                value={settings.units}
                onChange={(event) =>
                  onSettingsChange({ units: event.target.value })
                }
              >
                <option value="metric">Metric (°C, km/h, mm)</option>
                <option value="imperial">Imperial (°F, mph, in)</option>
              </select>
            </label>
            <label>
              Appearance
              <select
                value={settings.theme}
                onChange={(event) =>
                  onSettingsChange({ theme: event.target.value })
                }
              >
                <option value="dark">Dark theme</option>
                <option value="light">Light theme</option>
              </select>
            </label>
            <p className="settings-saved">
              Preferences save automatically on this device.
            </p>
          </div>
        </DataPanel>
      </section>
    );
  return (
    <>
      <section className="metrics">
        <div className="metric-card primary">
          <div className="metric-top">
            <span className="metric-icon">
              <Icon name="pulse" />
            </span>
            <span className="trend positive">↗ 4.2%</span>
          </div>
          <small>OVERALL RISK SCORE</small>
          <div className="metric-value">
            {risk?.overall_score ?? 62}
            <span>/100</span>
          </div>
          <div className="metric-bottom">
            <span className="status-dot high" />{" "}
            <b>{risk?.category ?? "HIGH"}</b>
            <span> · vs yesterday</span>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-icon blue">
              <Icon name="cloud" />
            </span>
            <span className="trend positive">↘ 2.1%</span>
          </div>
          <small>LIVE TEMPERATURE</small>
          <div className="metric-value">
            {temp}
            <span>°C</span>
          </div>
          <div className="metric-bottom">
            New Delhi · Feels like {temp + 1}°
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-icon orange">
              <Icon name="wind" />
            </span>
            <span className="trend negative">↗ 8.7%</span>
          </div>
          <small>AIR QUALITY INDEX</small>
          <div className="metric-value">
            {risk?.components?.pollution ?? 76}
            <span>AQI</span>
          </div>
          <div className="metric-bottom">
            <span className="status-dot high" /> <b>Unhealthy</b>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-icon purple">
              <Icon name="flame" />
            </span>
            <span className="trend neutral">— 0.0%</span>
          </div>
          <small>ACTIVE FIRE HOTSPOTS</small>
          <div className="metric-value">
            {hotspots?.length ?? 12}
            <span>events</span>
          </div>
          <div className="metric-bottom">Across India · last 24h</div>
        </div>
      </section>
      <section className="main-grid">
        <IndiaMap
          hotspots={hotspots || []}
          weather={weather}
          onOpenLiveMap={() => onNavigate("Live map")}
        />
        <DataPanel title="Risk breakdown" eyebrow="COMPOSITE ANALYSIS">
          <div className="risk-overview">
            <ScoreRing score={risk?.overall_score ?? 62} />
            <div>
              <strong>Elevated conditions</strong>
              <p>Multiple environmental factors require attention today.</p>
              <span className="updated">
                <i /> Updated 2 min ago
              </span>
            </div>
          </div>
          <div className="bars">
            <RiskBar
              label="Flood risk"
              value={risk?.components?.flood ?? 68}
              color="#5b9cff"
            />
            <RiskBar
              label="Fire risk"
              value={risk?.components?.fire ?? 42}
              color="#ff9c5c"
            />
            <RiskBar
              label="Pollution risk"
              value={risk?.components?.pollution ?? 76}
              color="#b08cff"
            />
          </div>
          <button
            className="full-button"
            onClick={() => onNavigate("Flood risk")}
          >
            View detailed analysis <span>→</span>
          </button>
        </DataPanel>
      </section>
      <section className="bottom-grid">
        <DataPanel
          title={`Recent alerts ${alerts.length}`}
          eyebrow="NEEDS ATTENTION"
        >
          <div className="alert-list">
            {alerts.map((a, i) => (
              <div className="alert-row" key={i}>
                <div className={`alert-symbol ${a.severity?.toLowerCase()}`}>
                  ≋
                </div>
                <div className="alert-copy">
                  <strong>{a.message}</strong>
                  <span>{a.location} · Just now</span>
                </div>
                <span className={`severity ${a.severity?.toLowerCase()}`}>
                  {a.severity}
                </span>
              </div>
            ))}
          </div>
        </DataPanel>
        <DataPanel title="Today’s outlook" eyebrow="NEW DELHI">
          <div className="forecast-main">
            <strong>{temp}°</strong>
            <div>
              <b>Partly cloudy</b>
              <span>
                Feels like {temp + 1}° · {weather?.relative_humidity_2m ?? 64}%
                humidity
              </span>
            </div>
          </div>
          <div className="forecast-strip">
            <div>
              <span>NOW</span>
              <b>{temp}°</b>
              <i>☼</i>
            </div>
            <div>
              <span>3 PM</span>
              <b>30°</b>
              <i>☁</i>
            </div>
            <div>
              <span>6 PM</span>
              <b>27°</b>
              <i>☾</i>
            </div>
          </div>
        </DataPanel>
      </section>
    </>
  );
}

function App() {
  const [active, setActive] = useState("Overview");
  const [location, setLocation] = useState(LOCATION);
  const [weather, setWeather] = useState(demo.weather);
  const [rainfall, setRainfall] = useState(null);
  const [hotspots, setHotspots] = useState(null);
  const [pollution, setPollution] = useState(null);
  const [stateForecasts, setStateForecasts] = useState([]);
  const [risk, setRisk] = useState(demo.risk);
  const [alerts, setAlerts] = useState(demo.alerts);
  const [alertToast, setAlertToast] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [settings, setSettings] = useState(readSettings);
  const lastAlertKey = useRef("");
  const nav = [
    { icon: "grid", label: "Overview" },
    { icon: "layers", label: "Live map" },
    { icon: "cloud", label: "Weather" },
    { icon: "pulse", label: "Rainfall" },
    { icon: "flame", label: "Fire hotspots" },
    { icon: "wind", label: "Pollution" },
    { icon: "layers", label: "State data" },
    { icon: "layers", label: "Flood risk" },
    { icon: "pulse", label: "AI briefing" },
    { icon: "settings", label: "Data health" },
  ];
  const refresh = (selectedLocation = location) => {
    setLoaded(false);
    Promise.all([
      loadLiveData(selectedLocation),
      get("/weather/states"),
      get("/health/providers"),
    ]).then(([data, states, providerStatus]) => {
      const {
        weather: w,
        rainfall: r,
        hotspots: f,
        pollution: p,
        overall: rs,
        alerts: a,
      } = data;
      const currentRisk = rs || risk;
      const localAlerts = buildRiskAlerts(currentRisk, r, f || []);
      if (w?.current)
        setWeather({ ...w.current, hourly: w.hourly, daily: w.daily });
      if (r) setRainfall(r);
      if (f) setHotspots(f);
      if (p) setPollution(p);
      if (states) setStateForecasts(states);
      if (rs)
        setRisk({
          ...rs,
          pollution_data: p || [],
          state_forecasts: states || [],
          provider_status: providerStatus || {},
          location: selectedLocation,
        });
      if (localAlerts.length) {
        const nextAlert = localAlerts[0];
        const alertKey = `${nextAlert.type}:${nextAlert.score}`;
        setAlerts([
          ...localAlerts,
          ...(a || []).filter(
            (item) => !localAlerts.some((alert) => alert.type === item.type),
          ),
        ]);
        if (alertKey !== lastAlertKey.current) {
          lastAlertKey.current = alertKey;
          setAlertToast(nextAlert);
          if (
            typeof Notification !== "undefined" &&
            Notification.permission === "granted"
          )
            new Notification(`EcoShield ${nextAlert.severity} alert`, {
              body: nextAlert.message,
            });
        }
      } else if (a) setAlerts(a);
      setLoaded(true);
    });
  };
  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    localStorage.setItem("ecoshield-settings", JSON.stringify(settings));
  }, [settings]);
  useEffect(() => {
    const useLocation = (position) => {
      const current = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setLocation(current);
      refresh(current);
    };
    if (settings.locationMode === "device" && navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        useLocation,
        () => refresh(LOCATION),
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
      );
    else refresh(LOCATION);
    const timer = setInterval(
      () => refresh(),
      Number(settings.refreshMinutes) * 60000,
    );
    return () => clearInterval(timer);
  }, [settings.locationMode, settings.refreshMinutes]);
  const updateSettings = (changes) => {
    setSettings((current) => ({ ...current, ...changes }));
    if (changes.locationMode === "delhi") {
      setLocation(LOCATION);
      refresh(LOCATION);
    }
  };
  const generateBriefing = () =>
    post("/ai/briefing", {
      location: "Current device location",
      weather,
      rainfall,
      fire: { hotspots: hotspots?.length ?? 0 },
      pollution: pollution?.[0] || {},
      risk,
    }).then((result) => {
      if (result?.briefing)
        setRisk((current) => ({
          ...current,
          ai_briefing: result.briefing,
          ai_error: null,
        }));
      else if (result?.error)
        setRisk((current) => ({ ...current, ai_error: result.error }));
    });
  if (active === "Data health")
    return (
      <section className="workspace-single">
        <DataPanel title="Data delivery health" eyebrow="LIVE PROVIDER CHECKS">
          <p>
            Each status is verified with a live provider request when this
            dashboard refreshes.
          </p>
          <ProviderHealth providers={risk?.provider_status || {}} />
        </DataPanel>
      </section>
    );
  if (active === "Settings")
    return (
      <section className="workspace-single">
        <DataPanel title="Workspace settings" eyebrow="ECOSHIELD CONFIGURATION">
          <div className="settings-form">
            <label>
              Monitoring location
              <input value="Current device location" readOnly />
            </label>
            <label>
              Data refresh interval
              <select defaultValue="5">
                <option value="5">Every 5 minutes</option>
                <option value="15">Every 15 minutes</option>
              </select>
            </label>
            <label>
              Units
              <select defaultValue="metric">
                <option value="metric">Metric (°C, km/h, mm)</option>
              </select>
            </label>
            <button className="full-button">
              Save preferences <span>→</span>
            </button>
          </div>
        </DataPanel>
      </section>
    );
  return (
    <>
      <section className="metrics">
        <div className="metric-card primary">
          <div className="metric-top">
            <span className="metric-icon">
              <Icon name="pulse" />
            </span>
            <span className="trend positive">↗ 4.2%</span>
          </div>
          <small>OVERALL RISK SCORE</small>
          <div className="metric-value">
            {risk?.overall_score ?? 62}
            <span>/100</span>
          </div>
          <div className="metric-bottom">
            <span className="status-dot high" />{" "}
            <b>{risk?.category ?? "HIGH"}</b>
            <span> · vs yesterday</span>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-icon blue">
              <Icon name="cloud" />
            </span>
            <span className="trend positive">↘ 2.1%</span>
          </div>
          <small>LIVE TEMPERATURE</small>
          <div className="metric-value">
            {temp}
            <span>°C</span>
          </div>
          <div className="metric-bottom">
            New Delhi · Feels like {temp + 1}°
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-icon orange">
              <Icon name="wind" />
            </span>
            <span className="trend negative">↗ 8.7%</span>
          </div>
          <small>AIR QUALITY INDEX</small>
          <div className="metric-value">
            {risk?.components?.pollution ?? 76}
            <span>AQI</span>
          </div>
          <div className="metric-bottom">
            <span className="status-dot high" /> <b>Unhealthy</b>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-icon purple">
              <Icon name="flame" />
            </span>
            <span className="trend neutral">— 0.0%</span>
          </div>
          <small>ACTIVE FIRE HOTSPOTS</small>
          <div className="metric-value">
            {hotspots?.length ?? 12}
            <span>events</span>
          </div>
          <div className="metric-bottom">Across India · last 24h</div>
        </div>
      </section>
      <section className="main-grid">
        <IndiaMap />
        <DataPanel title="Risk breakdown" eyebrow="COMPOSITE ANALYSIS">
          <div className="risk-overview">
            <ScoreRing score={risk?.overall_score ?? 62} />
            <div>
              <strong>Elevated conditions</strong>
              <p>Multiple environmental factors require attention today.</p>
              <span className="updated">
                <i /> Updated 2 min ago
              </span>
            </div>
          </div>
          <div className="bars">
            <RiskBar
              label="Flood risk"
              value={risk?.components?.flood ?? 68}
              color="#5b9cff"
            />
            <RiskBar
              label="Fire risk"
              value={risk?.components?.fire ?? 42}
              color="#ff9c5c"
            />
            <RiskBar
              label="Pollution risk"
              value={risk?.components?.pollution ?? 76}
              color="#b08cff"
            />
          </div>
          <button
            className="full-button"
            onClick={() => onNavigate("Flood risk")}
          >
            View detailed analysis <span>→</span>
          </button>
        </DataPanel>
      </section>
      <section className="bottom-grid">
        <DataPanel
          title={`Recent alerts ${alerts.length}`}
          eyebrow="NEEDS ATTENTION"
        >
          <div className="alert-list">
            {alerts.map((a, i) => (
              <div className="alert-row" key={i}>
                <div className={`alert-symbol ${a.severity?.toLowerCase()}`}>
                  ≋
                </div>
                <div className="alert-copy">
                  <strong>{a.message}</strong>
                  <span>{a.location} · Just now</span>
                </div>
                <span className={`severity ${a.severity?.toLowerCase()}`}>
                  {a.severity}
                </span>
              </div>
            ))}
          </div>
        </DataPanel>
        <DataPanel title="Today’s outlook" eyebrow="NEW DELHI">
          <div className="forecast-main">
            <strong>{temp}°</strong>
            <div>
              <b>Partly cloudy</b>
              <span>
                Feels like {temp + 1}° · {weather?.relative_humidity_2m ?? 64}%
                humidity
              </span>
            </div>
          </div>
          <div className="forecast-strip">
            <div>
              <span>NOW</span>
              <b>{temp}°</b>
              <i>☼</i>
            </div>
            <div>
              <span>3 PM</span>
              <b>30°</b>
              <i>☁</i>
            </div>
            <div>
              <span>6 PM</span>
              <b>27°</b>
              <i>☾</i>
            </div>
          </div>
        </DataPanel>
      </section>
    </>
  );
}

function LegacyApp() {
  const [active, setActive] = useState("Overview");
  const [location, setLocation] = useState(LOCATION);
  const [weather, setWeather] = useState(demo.weather);
  const [rainfall, setRainfall] = useState(null);
  const [hotspots, setHotspots] = useState(null);
  const [pollution, setPollution] = useState(null);
  const [stateForecasts, setStateForecasts] = useState([]);
  const [risk, setRisk] = useState(demo.risk);
  const [alerts, setAlerts] = useState(demo.alerts);
  const [loaded, setLoaded] = useState(false);
  const [settings, setSettings] = useState(readSettings);
  const [now, setNow] = useState(() => new Date());
  const nav = [
    { icon: "grid", label: "Overview" },
    { icon: "layers", label: "Live map" },
    { icon: "cloud", label: "Weather" },
    { icon: "pulse", label: "Rainfall" },
    { icon: "flame", label: "Fire hotspots" },
    { icon: "wind", label: "Pollution" },
    { icon: "layers", label: "State data" },
    { icon: "layers", label: "Flood risk" },
    { icon: "pulse", label: "AI briefing" },
    { icon: "settings", label: "Data health" },
  ];
  const refresh = (selectedLocation = location) => {
    setLoaded(false);
    Promise.all([
      loadLiveData(selectedLocation),
      get("/weather/states"),
      get("/health/providers"),
    ]).then(([data, states, providerStatus]) => {
      const {
        weather: w,
        rainfall: r,
        hotspots: f,
        pollution: p,
        overall: rs,
        alerts: a,
      } = data;
      if (w?.current) setWeather(w.current);
      if (r) setRainfall(r);
      if (f) setHotspots(f);
      if (p) setPollution(p);
      if (states) setStateForecasts(states);
      if (rs)
        setRisk({
          ...rs,
          pollution_data: p || [],
          state_forecasts: states || [],
          provider_status: providerStatus || {},
          location: selectedLocation,
        });
      if (a) setAlerts(a);
      setLoaded(true);
    });
  };
  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    localStorage.setItem("ecoshield-settings", JSON.stringify(settings));
  }, [settings]);
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const useLocation = (position) => {
      const current = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setLocation(current);
      refresh(current);
    };
    let watchId;
    if (settings.locationMode === "device" && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        useLocation,
        () => refresh(LOCATION),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
      );
    } else refresh(LOCATION);
    const timer = setInterval(() => refresh(), Number(settings.refreshMinutes) * 60000);
    return () => {
      clearInterval(timer);
      if (watchId !== undefined) navigator.geolocation?.clearWatch(watchId);
    };
  }, [settings.locationMode, settings.refreshMinutes]);
  const updateSettings = (changes) => {
    setSettings((current) => ({ ...current, ...changes }));
    if (changes.locationMode === "delhi") {
      setLocation(LOCATION);
      refresh(LOCATION);
    }
  };
  const dateLabel = now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
  const timeLabel = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "Asia/Kolkata" });
  const dayLabel = now.toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric", timeZone: "Asia/Kolkata" }).toUpperCase();
  const generateBriefing = () =>
    post("/ai/briefing", {
      location,
      weather,
      rainfall,
      fire: { hotspots: hotspots || [] },
      pollution: pollution || [],
      flood: {
        risk: risk?.components?.flood,
        active_areas:
          "No verified active flood-area observations are connected. Only rainfall-based flood risk is available unless an Earth Engine analysis result is supplied.",
        earth_engine_result: risk?.flood_job || null,
      },
      risk,
    }).then((result) => {
      if (result?.briefing)
        setRisk((current) => ({
          ...current,
          ai_briefing: result.briefing,
          ai_error: null,
        }));
      else if (result?.error)
        setRisk((current) => ({ ...current, ai_error: result.error }));
    });
  const startFloodAnalysis = () => {
    const now = new Date();
    const iso = (value) => value.toISOString().slice(0, 10);
    const afterEnd = iso(now);
    const afterStartDate = new Date(now);
    afterStartDate.setDate(now.getDate() - 5);
    const beforeEndDate = new Date(now);
    beforeEndDate.setDate(now.getDate() - 6);
    const beforeStartDate = new Date(now);
    beforeStartDate.setDate(now.getDate() - 11);
    const delta = 0.12;
    const body = {
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [location.longitude - delta, location.latitude - delta],
            [location.longitude + delta, location.latitude - delta],
            [location.longitude + delta, location.latitude + delta],
            [location.longitude - delta, location.latitude + delta],
            [location.longitude - delta, location.latitude - delta],
          ],
        ],
      },
      before_start: iso(beforeStartDate),
      before_end: iso(beforeEndDate),
      after_start: iso(afterStartDate),
      after_end: afterEnd,
      polarization: "VV",
      threshold: 1.25,
    };
    post("/flood/detect", body).then((result) => {
      if (result?.error)
        setRisk((current) => ({
          ...current,
          flood_error: result.error,
          flood_job: null,
        }));
      else
        setRisk((current) => ({
          ...current,
          flood_job: result,
          flood_error: null,
        }));
    });
  };
  const change = (label) => setActive(label);
  const tabs = [
    ...nav,
    { icon: "bell", label: "Alerts" },
    { icon: "settings", label: "Settings" },
  ];
  change.generateBriefing = generateBriefing;
  change.startFloodAnalysis = startFloodAnalysis;
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">✦</div>
          <div>
            <strong>
              Eco<span>Shield</span>
            </strong>
            <small>ENVIRONMENTAL INTELLIGENCE</small>
          </div>
        </div>
        <div className="nav-group">
          <span className="nav-heading">Workspace</span>
          {nav.map((item) => (
            <button
              key={item.label}
              className={active === item.label ? "nav-link active" : "nav-link"}
              onClick={() => change(item.label)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.label === "Fire hotspots" && (
                <b>{hotspots?.length ?? 12}</b>
              )}
            </button>
          ))}
        </div>
        <div className="nav-group secondary">
          <span className="nav-heading">Manage</span>
          {tabs.slice(-2).map((item) => (
            <button
              key={item.label}
              className={active === item.label ? "nav-link active" : "nav-link"}
              onClick={() => change(item.label)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.label === "Alerts" && (
                <b className="alert-count">{alerts.length}</b>
              )}
            </button>
          ))}
        </div>
        <div className="sidebar-footer">
          <div className="user-avatar">AK</div>
          <div>
            <strong>Arjun Kumar</strong>
            <small>Administrator</small>
          </div>
          <span className="more">···</span>
        </div>
      </aside>
      <main className="content">
        <header className="topbar">
          <div className="crumb">
            <span>Workspace</span>
            <b>/</b>
            <strong>{active}</strong>
          </div>
          <div className="top-actions">
            <div className="system-status">
              <i /> All systems operational
            </div>
            <button className="icon-button" onClick={() => change("Alerts")}>
              <Icon name="bell" />
            </button>
            <div className="date-chip">
              {dateLabel} <span>IST</span>
            </div>
          </div>
        </header>
        <div className="page-head">
          <div>
            <div className="eyebrow">
              {dayLabel} · {timeLabel} IST
            </div>
            <h1>
              {active === "Overview" ? (
                <>
                  Good morning, Arjun <span>✦</span>
                </>
              ) : (
                active
              )}
            </h1>
            <p>
              {active === "Overview"
                ? "Here’s the latest environmental picture across India."
                : "Environmental intelligence for India, updated from connected providers."} · Monitoring {location.latitude.toFixed(3)}°N, {location.longitude.toFixed(3)}°E
            </p>
          </div>
          <button className="refresh" onClick={() => window.location.reload()}>
            <span className={loaded ? "" : "spin"}>↻</span> Refresh data
          </button>
        </div>
        <Workspace
          active={active}
          location={location}
          weather={weather}
          rainfall={rainfall}
          hotspots={hotspots}
          pollution={pollution}
          stateForecasts={stateForecasts}
          risk={risk}
          alerts={alerts}
          settings={settings}
          onSettingsChange={updateSettings}
          onNavigate={change}
        />
        <footer>
          <span>
            <i /> Data refreshed from 4 providers
          </span>
          <span>
            EcoShield Intelligence Platform <b>·</b> v1.0.0
          </span>
        </footer>
      </main>
      <AlertToast alert={alertToast} onClose={() => setAlertToast(null)} />
      <AIAssistant
        active={active}
        weather={weather}
        rainfall={rainfall}
        hotspots={hotspots}
        risk={risk}
        alerts={alerts}
      />
    </div>
  );
}

const root = globalThis.__ecoshieldRoot || createRoot(document.getElementById("root"));
globalThis.__ecoshieldRoot = root;
root.render(<LegacyApp />);
