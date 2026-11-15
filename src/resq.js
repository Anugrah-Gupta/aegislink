/**
 * ResQ Citizen Application Logic — Minimal Light Blue & White Theme
 * Real Geographic Map (Leaflet GIS: CartoDB Positron / Satellite / Streets)
 * Master One-Tap SOS, Offline Mesh Simulation, Emergency Tools & Health ID
 * Real-Time 2-Way Synchronization with AegisLink Command Center Terminal
 */

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  getSharedState,
  saveSharedState,
  broadcastSyncEvent,
  subscribeToSync
} from './syncState.js';

const resqState = {
  isOnline: true,
  isBatterySaver: false,
  offlineQueue: JSON.parse(localStorage.getItem("resq_local_reports") || "[]"),
  userLocation: { lat: 37.7749, lng: -122.4194, label: "YOU (Balcony)" },
  activeMapLayers: {
    shelters: true,
    hazards: true,
    nodes: true,
    responders: true
  },
  currentTileStyle: 'positron',
  countdownTimer: null,
  countdownSeconds: 3,
  sirenAudioCtx: null,
  sirenOsc: null,
  isSirenPlaying: false,
  isWhistlePlaying: false,
  shelters: [],
  activeBeacons: [],
  nodes: [
    { id: "NODE-014", name: "Aegis M-1 #014", lat: 37.7770, lng: -122.4120, type: "LoRa 868MHz Relay" },
    { id: "NODE-022", name: "Aegis M-1 #022", lat: 37.7810, lng: -122.4220, type: "LoRa Gateway" },
    { id: "NODE-031", name: "Aegis M-1 #031", lat: 37.7710, lng: -122.4300, type: "LoRa Relay" }
  ],
  responders: []
};

// Map instances & layer holders
let realMap = null;
let baseTileLayers = {};
let layerGroups = {
  shelters: null,
  hazards: null,
  nodes: null,
  beacons: null,
  user: null,
  responders: null
};

// ==========================================================================
// INITIALIZATION
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
  if (!initUserSession()) return;

  // Initialize shared state
  initSharedData();

  // Setup UI components
  initRealGeographicMap();
  initMasterSosFlow();
  initEmergencyTools();
  initWhistleAndBatterySaver();
  initOfflineMeshMode();
  initSheltersList();
  initFamilyAndChecklist();
  updateOfflineQueueBadge();

  // Setup Real-time 2-Way Sync with Command Center
  initCommandSyncSubscription();
});

function initSharedData() {
  const shared = getSharedState();
  resqState.shelters = shared.shelters || [];
  resqState.activeBeacons = shared.incidents || [];
  if (shared.citizenLocation) {
    resqState.userLocation = shared.citizenLocation;
  }
  resqState.responders = shared.responders || [];
}

function initUserSession() {
  const urlParams = new URLSearchParams(window.location.search);
  const isGuestQuery = urlParams.get("guest") === "true";
  let session = null;

  try {
    session = JSON.parse(localStorage.getItem("resq_session"));
  } catch (err) {
    session = null;
  }

  // If no session, automatically establish guest session so map loads directly
  if (!session) {
    session = {
      id: "GUEST-SOS-001",
      identifier: "Emergency Guest Access",
      name: "Emergency Guest",
      role: "Citizen",
      roleDescription: "Civilian Guest SOS Mode",
      loginTimestamp: new Date().toISOString()
    };
    localStorage.setItem("resq_session", JSON.stringify(session));
  }

  // Update UI with user info
  const nameEl = document.getElementById("session-user-name");
  const roleEl = document.getElementById("session-user-role");
  const btnLogout = document.getElementById("btn-logout");

  if (nameEl && session.name) {
    nameEl.textContent = session.name;
  }
  if (roleEl && session.role) {
    roleEl.textContent = session.role;
  }

  btnLogout?.addEventListener("click", () => {
    localStorage.removeItem("resq_session");
    showToast("Signed out from ResQ. Returning to login...", "👋");
    setTimeout(() => {
      window.location.href = "login.html";
    }, 400);
  });

  return true;
}

// Toast Notification
function showToast(message, icon = "ℹ️") {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = "toast-pill";
  toast.innerHTML = `<span style="font-size: 1.15rem;">${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-10px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3800);
}

// ==========================================================================
// 1. REAL GEOGRAPHIC DISASTER MAP (Leaflet GIS Engine)
// ==========================================================================

function initRealGeographicMap() {
  const mapContainer = document.getElementById("resq-real-map");
  if (!mapContainer) return;

  // Initialize Leaflet map centered at user coordinates
  realMap = L.map("resq-real-map", {
    center: [resqState.userLocation.lat, resqState.userLocation.lng],
    zoom: 14,
    zoomControl: false,
    attributionControl: true
  });

  // Custom Light Zoom Control
  L.control.zoom({ position: 'topright' }).addTo(realMap);

  // 1. Setup Base Tile Providers
  baseTileLayers.positron = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    subdomains: 'abcd',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OSM'
  });

  baseTileLayers.satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{x}/{y}', {
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri'
  });

  baseTileLayers.streets = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  });

  // Add default Light Positron
  baseTileLayers.positron.addTo(realMap);

  // 2. Setup Layer Groups
  layerGroups.user = L.layerGroup().addTo(realMap);
  layerGroups.hazards = L.layerGroup().addTo(realMap);
  layerGroups.shelters = L.layerGroup().addTo(realMap);
  layerGroups.nodes = L.layerGroup().addTo(realMap);
  layerGroups.responders = L.layerGroup().addTo(realMap);
  layerGroups.beacons = L.layerGroup().addTo(realMap);

  // 3. Render all GIS Features
  renderUserLocationMarker();
  renderShelterMarkers();
  renderFloodSurgeHazardZone();
  renderMeshNodeMarkers();
  renderResponderMarkers();
  renderDistressBeaconMarkers();

  // 4. Interactive Map Click (Report emergency at clicked coordinates or relocate GPS)
  realMap.on('click', (e) => {
    const { lat, lng } = e.latlng;
    openDrawer(
      `📍 Selected Map Coordinates`,
      `<strong>GPS:</strong> ${lat.toFixed(4)}° N, ${lng.toFixed(4)}° W<br/>` +
      `You can report a local emergency at this exact pin or relocate your citizen device.`,
      `
        <button class="btn-danger-submit" onclick="window.reportAtMapLocation(${lat}, ${lng})">🚨 Report Emergency Here</button>
        <button class="btn-cancel" onclick="window.setMyCustomLocation(${lat}, ${lng})">📌 Set as My Location</button>
      `
    );
  });

  // Invalidate size after mount
  setTimeout(() => realMap.invalidateSize(), 150);
  setTimeout(() => realMap.invalidateSize(), 450);
  window.addEventListener("resize", () => realMap.invalidateSize());

  // Wire Map Controls
  initMapControls();
}

function initMapControls() {
  // Tile Style Switcher
  document.querySelectorAll(".tile-switch-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const style = btn.getAttribute("data-style");
      if (!style || !baseTileLayers[style]) return;

      document.querySelectorAll(".tile-switch-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      // Switch base layer
      Object.values(baseTileLayers).forEach(layer => realMap.removeLayer(layer));
      baseTileLayers[style].addTo(realMap);
      resqState.currentTileStyle = style;

      const badge = document.getElementById("map-tile-badge");
      if (badge) {
        badge.textContent = style === "satellite" ? "GIS Satellite" : (style === "streets" ? "OSM Streets" : "GIS Light");
      }

      showToast(`Map switched to ${style.toUpperCase()} view`, "🗺️");
    });
  });

  // Layer Filter Toggles
  document.querySelectorAll(".layer-pill-btn").forEach(pill => {
    pill.addEventListener("click", () => {
      const layerKey = pill.getAttribute("data-layer");
      if (!layerKey || !layerGroups[layerKey]) return;

      const isCurrentlyActive = resqState.activeMapLayers[layerKey];
      resqState.activeMapLayers[layerKey] = !isCurrentlyActive;
      pill.classList.toggle("active", resqState.activeMapLayers[layerKey]);

      if (resqState.activeMapLayers[layerKey]) {
        realMap.addLayer(layerGroups[layerKey]);
      } else {
        realMap.removeLayer(layerGroups[layerKey]);
      }
    });
  });

  // Recenter GPS Button
  const btnRecenter = document.getElementById("btn-recenter-map");
  btnRecenter?.addEventListener("click", () => {
    if (navigator.geolocation) {
      btnRecenter.textContent = "⏳ Locating...";
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          btnRecenter.textContent = "📍 My Location";
          resqState.userLocation.lat = pos.coords.latitude;
          resqState.userLocation.lng = pos.coords.longitude;
          renderUserLocationMarker();
          realMap.flyTo([pos.coords.latitude, pos.coords.longitude], 15, { duration: 1.2 });

          const coordsTxt = document.getElementById("map-live-coords");
          if (coordsTxt) {
            coordsTxt.textContent = `GPS: ${pos.coords.latitude.toFixed(4)}° N, ${pos.coords.longitude.toFixed(4)}° W (Accurate)`;
          }

          // Sync location to Command Center
          const shared = getSharedState();
          shared.citizenLocation = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            label: "Citizen Device (Live GPS)",
            updatedAt: Date.now()
          };
          saveSharedState(shared);
          broadcastSyncEvent("RESQ_LOCATION_CHANGE", shared.citizenLocation, "RESQ_APP");

          showToast(`GPS position locked and synced to Command Center!`, "🎯");
        },
        () => {
          btnRecenter.textContent = "📍 My Location";
          realMap.flyTo([resqState.userLocation.lat, resqState.userLocation.lng], 15);
          showToast("Centered on preset Sector 4 Balcony location", "📍");
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      realMap.flyTo([resqState.userLocation.lat, resqState.userLocation.lng], 15);
      showToast("Centered on preset citizen GPS", "📍");
    }
  });

  // Close Drawer
  document.getElementById("btn-close-drawer")?.addEventListener("click", () => {
    document.getElementById("resq-drawer")?.classList.remove("open");
  });
}

// 1A. User Location Marker (Pulsing Light Blue GPS Pin)
function renderUserLocationMarker() {
  layerGroups.user.clearLayers();

  const userIcon = L.divIcon({
    className: 'resq-custom-leaflet-icon',
    html: `
      <div class="user-gps-pulse-beacon">
        <div class="user-beacon-ring"></div>
        <div class="user-beacon-dot"></div>
        <div class="user-beacon-label">${resqState.userLocation.label || 'YOU (Balcony)'}</div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

  const marker = L.marker([resqState.userLocation.lat, resqState.userLocation.lng], { icon: userIcon });
  marker.on('click', () => {
    openDrawer(
      `📍 Your Current Location`,
      `<strong>GPS:</strong> ${resqState.userLocation.lat.toFixed(4)}° N, ${resqState.userLocation.lng.toFixed(4)}° W<br/>` +
      `<strong>Elevation:</strong> 18m (+13.2m above flood crest)<br/>` +
      `<strong>Nearest Shelter:</strong> West High School Arena (0.8 km north via 5th Ave).<br/>` +
      `<strong>Command Status:</strong> Synced with NDRF Sector 4 Command Center.`
    );
  });

  // GPS Accuracy Circle
  const circle = L.circle([resqState.userLocation.lat, resqState.userLocation.lng], {
    radius: 40,
    color: '#0284c7',
    weight: 1.5,
    fillColor: '#38bdf8',
    fillOpacity: 0.12,
    dashArray: '3, 4'
  });

  layerGroups.user.addLayer(marker);
  layerGroups.user.addLayer(circle);
}

// 1B. Evacuation Shelters
function renderShelterMarkers() {
  layerGroups.shelters.clearLayers();

  resqState.shelters.forEach(s => {
    const isFull = (s.occ / s.capacity) >= 0.85;
    const shelterIcon = L.divIcon({
      className: 'resq-custom-leaflet-icon',
      html: `
        <div class="shelter-map-pin ${isFull ? 'full' : ''}">
          <span class="shelter-pin-icon">🏠</span>
          <span class="shelter-pin-name">${s.name.split(' ')[0]} (${s.occ}/${s.capacity})</span>
        </div>
      `,
      iconSize: [110, 26],
      iconAnchor: [55, 13]
    });

    const marker = L.marker([s.lat, s.lng], { icon: shelterIcon });
    marker.on('click', () => {
      openDrawer(
        `🏠 ${s.name}`,
        `<strong>Sector:</strong> ${s.sector}<br/>` +
        `<strong>Distance:</strong> ${s.dist} from your location<br/>` +
        `<strong>Capacity:</strong> ${s.occ} / ${s.capacity} beds (${Math.round(s.occ / s.capacity * 100)}%)<br/>` +
        `<strong>Supplies:</strong> Water: ${s.water} · Food: ${s.food} · Power: Active<br/>` +
        `<strong>Medical Clinic:</strong> ${s.medical ? 'Doctor On Site' : 'Basic First Aid'}`,
        `<button class="btn-cancel" onclick="showToast('Walking Route: Follow 5th Ave North (Safe high elevation)', '🧭')">Directions</button>
         <button class="btn-danger-submit" onclick="reserveShelterBed('${s.id}')">Reserve Bed</button>`
      );
    });

    layerGroups.shelters.addLayer(marker);
  });
}

// 1C. River Basin Flood Surge Hazard
function renderFloodSurgeHazardZone() {
  layerGroups.hazards.clearLayers();

  const floodPoints = [
    [37.7710, -122.4280],
    [37.7735, -122.4200],
    [37.7760, -122.4140],
    [37.7790, -122.4080],
    [37.7830, -122.4020],
    [37.7800, -122.4000],
    [37.7750, -122.4090],
    [37.7720, -122.4170],
    [37.7690, -122.4250]
  ];

  const floodPolygon = L.polygon(floodPoints, {
    color: '#0284c7',
    weight: 2,
    fillColor: '#0ea5e9',
    fillOpacity: 0.22,
    dashArray: '5, 5'
  });

  floodPolygon.bindTooltip("⚠️ Sector 4 River Flood Inundation Zone (+18cm/h)", {
    permanent: false,
    direction: 'center',
    className: 'resq-leaflet-tooltip'
  });

  layerGroups.hazards.addLayer(floodPolygon);
}

// 1D. Mesh Relay Nodes
function renderMeshNodeMarkers() {
  layerGroups.nodes.clearLayers();

  resqState.nodes.forEach(n => {
    const nodeIcon = L.divIcon({
      className: 'resq-custom-leaflet-icon',
      html: `
        <div class="node-map-pin">
          <span>📡</span>
          <span>${n.id}</span>
        </div>
      `,
      iconSize: [95, 26],
      iconAnchor: [47, 13]
    });

    const marker = L.marker([n.lat, n.lng], { icon: nodeIcon });
    marker.on('click', () => {
      openDrawer(
        `📡 ${n.name}`,
        `<strong>Type:</strong> ${n.type}<br/>` +
        `<strong>Signal Frequency:</strong> LoRa 868MHz / BLE 5.3 Long-Range<br/>` +
        `<strong>Relay Status:</strong> Autonomous Battery 98% · 24 Peers Connected`
      );
    });

    layerGroups.nodes.addLayer(marker);
  });
}

// 1E. Responder Fleet Units (Boats, Ambulances, USAR Squads)
function renderResponderMarkers() {
  layerGroups.responders.clearLayers();

  resqState.responders.forEach(r => {
    const respIcon = L.divIcon({
      className: 'resq-custom-leaflet-icon',
      html: `
        <div class="node-map-pin" style="border-color: #06b6d4; color: #0284c7;">
          <span>${r.icon}</span>
          <span>${r.name}</span>
        </div>
      `,
      iconSize: [110, 26],
      iconAnchor: [55, 13]
    });

    const marker = L.marker([r.lat, r.lng], { icon: respIcon });
    marker.on('click', () => {
      openDrawer(
        `${r.icon} ${r.name}`,
        `<strong>Status:</strong> ${r.status}<br/>` +
        `<strong>Task Force:</strong> Disaster Incident Response Fleet<br/>` +
        `<strong>Direct Telemetry:</strong> Dispatched by NDRF Command Center.`
      );
    });

    layerGroups.responders.addLayer(marker);
  });
}

// 1F. Distress Beacons (Synchronized with Command Center)
function renderDistressBeaconMarkers() {
  layerGroups.beacons.clearLayers();

  resqState.activeBeacons.forEach(b => {
    const isDispatched = b.status === "Dispatched" || b.status === "En Route" || b.status === "On Scene";
    const isResolved = b.status === "Resolved" || b.status === "Resolved & Safe";

    let iconSymbol = "🆘";
    let statusLabel = "";
    if (isResolved) {
      iconSymbol = "✓";
      statusLabel = "Safe";
    } else if (isDispatched) {
      iconSymbol = "🛡️";
      statusLabel = b.status;
    }

    const beaconIcon = L.divIcon({
      className: 'resq-custom-leaflet-icon',
      html: `
        <div class="sos-map-beacon ${isResolved ? 'resolved-beacon' : (isDispatched ? 'dispatched-beacon' : '')}">
          <span>${iconSymbol}</span>
          <span>${b.id} ${statusLabel ? `(${statusLabel})` : ''}</span>
        </div>
      `,
      iconSize: [95, 26],
      iconAnchor: [47, 13]
    });

    const marker = L.marker([b.lat, b.lng], { icon: beaconIcon });
    marker.on('click', () => {
      let dispatchInfo = "";
      if (b.responder && b.responder !== "Pending Command Dispatch") {
        dispatchInfo = `
          <div style="margin-top: 8px; padding: 8px; background: rgba(2, 132, 199, 0.08); border-radius: 6px; border-left: 3px solid #0284c7;">
            <strong style="color: #0369a1;">📢 Command Center Dispatch:</strong><br/>
            <strong>Unit:</strong> ${b.responder} (${b.responderStatus || 'En Route'})<br/>
            <strong>Directives:</strong> ${b.directives || 'Standby for rescue team arrival.'}
          </div>
        `;
      }

      openDrawer(
        `🆘 Distress Beacon #${b.id}`,
        `<strong>Emergency Type:</strong> ${b.type}<br/>` +
        `<strong>Urgency:</strong> <span style="color: ${b.urgency && b.urgency.includes('CRITICAL') ? '#ef4444' : '#f59e0b'}; font-weight:700;">${b.urgency || 'HIGH (P2)'}</span><br/>` +
        `<strong>People in Danger:</strong> ${b.people || 1} Persons<br/>` +
        `<strong>Status:</strong> <strong>${b.status || 'Queued'}</strong><br/>` +
        `<strong>Report Details:</strong> ${b.details || 'Immediate search & rescue requested.'}` +
        dispatchInfo,
        `<button class="btn-cancel" onclick="showToast('Beacon coordinates re-verified with mesh network.', '📡')">Ping Beacon</button>`
      );
    });

    layerGroups.beacons.addLayer(marker);
  });
}

function openDrawer(title, desc, actionsHtml = "") {
  const drawer = document.getElementById("resq-drawer");
  const titleEl = document.getElementById("drawer-title-text");
  const descEl = document.getElementById("drawer-desc-text");
  const actionsEl = document.getElementById("drawer-buttons-row");
  if (!drawer || !titleEl || !descEl) return;

  titleEl.innerHTML = title;
  descEl.innerHTML = desc;
  if (actionsEl) actionsEl.innerHTML = actionsHtml;

  drawer.classList.add("open");
}

// Custom location from map click
window.reportAtMapLocation = (lat, lng) => {
  openEmergencyModal("Reported Map Location");
  const locInput = document.getElementById("modal-loc-val");
  if (locInput) locInput.value = `Map Coordinates: ${lat.toFixed(4)}° N, ${lng.toFixed(4)}° W`;
  resqState.tempCoords = { lat, lng };
  document.getElementById("resq-drawer")?.classList.remove("open");
};

window.setMyCustomLocation = (lat, lng) => {
  resqState.userLocation.lat = lat;
  resqState.userLocation.lng = lng;
  resqState.userLocation.label = "YOU (Updated Location)";
  renderUserLocationMarker();

  // Save to shared state & broadcast to Command Center!
  const shared = getSharedState();
  shared.citizenLocation = {
    lat,
    lng,
    label: "Citizen Device (Updated Position)",
    updatedAt: Date.now()
  };
  saveSharedState(shared);
  broadcastSyncEvent("RESQ_LOCATION_CHANGE", shared.citizenLocation, "RESQ_APP");

  showToast(`GPS position updated and synced to Command Center!`, "🎯");
  document.getElementById("resq-drawer")?.classList.remove("open");
};

window.reserveShelterBed = (id) => {
  const shared = getSharedState();
  const s = shared.shelters.find(item => item.id === id);
  if (!s) return;
  s.occ = Math.min(s.occ + 2, s.capacity);
  saveSharedState(shared);

  // Broadcast bed reservation to Command Center!
  broadcastSyncEvent("RESQ_SHELTER_RESERVE", { shelterId: id, occ: s.occ }, "RESQ_APP");

  resqState.shelters = shared.shelters;
  initSheltersList();
  renderShelterMarkers();
  showToast(`Bed reserved for 2 people at ${s.name}! Synced with Command Center.`, "🏠");
  document.getElementById("resq-drawer")?.classList.remove("open");
};

// ==========================================================================
// 2. MASTER SOS FLOW (3-Second Abort Countdown & Audio Beeps)
// ==========================================================================

function initMasterSosFlow() {
  const btnSos = document.getElementById("btn-master-sos");
  const sheet = document.getElementById("sos-countdown-sheet");
  const valEl = document.getElementById("countdown-val");
  const btnAbort = document.getElementById("btn-abort-sos");

  btnSos?.addEventListener("click", () => {
    if (!sheet) return;
    sheet.style.display = "flex";
    resqState.countdownSeconds = 3;
    if (valEl) valEl.textContent = "3";
    playBeep(440, 0.1);

    resqState.countdownTimer = setInterval(() => {
      resqState.countdownSeconds--;
      if (resqState.countdownSeconds > 0) {
        if (valEl) valEl.textContent = String(resqState.countdownSeconds);
        playBeep(440 + (3 - resqState.countdownSeconds) * 200, 0.1);
      } else {
        clearInterval(resqState.countdownTimer);
        sheet.style.display = "none";
        triggerSOSBeacon({
          id: `SOS-${Math.floor(186 + Math.random() * 800)}`,
          type: "Master Emergency SOS",
          people: 2,
          details: "Instant 1-Tap distress beacon broadcasted by citizen from Sector 4 Balcony.",
          lat: resqState.userLocation.lat,
          lng: resqState.userLocation.lng,
          sector: "Sector 4 (River Rd)"
        });
      }
    }, 1000);
  });

  btnAbort?.addEventListener("click", () => {
    clearInterval(resqState.countdownTimer);
    if (sheet) sheet.style.display = "none";
    showToast("Emergency SOS Cancelled (False Alarm)", "🛑");
  });

  // Disaster Categories Tiles
  document.querySelectorAll(".category-tile-btn, .disaster-tile").forEach(tile => {
    tile.addEventListener("click", () => {
      const cat = tile.getAttribute("data-cat");
      if (cat) openEmergencyModal(cat);
    });
  });

  // Modal actions
  const modal = document.getElementById("report-modal");
  document.getElementById("btn-close-modal")?.addEventListener("click", () => modal.style.display = "none");
  document.getElementById("btn-cancel-modal")?.addEventListener("click", () => modal.style.display = "none");

  document.getElementById("emergency-report-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const cat = document.getElementById("modal-select-cat")?.value || "General Emergency";
    const people = parseInt(document.getElementById("modal-people-val")?.value || "1");
    const details = document.getElementById("modal-details-val")?.value || "Immediate assistance requested.";
    const locName = document.getElementById("modal-loc-val")?.value || "Sector 4";

    const reportCoords = resqState.tempCoords || {
      lat: resqState.userLocation.lat + (Math.random() - 0.5) * 0.005,
      lng: resqState.userLocation.lng + (Math.random() - 0.5) * 0.005
    };
    resqState.tempCoords = null;

    triggerSOSBeacon({
      id: `SOS-${Math.floor(200 + Math.random() * 800)}`,
      type: cat,
      people: people,
      details: `${details} (Location: ${locName})`,
      lat: reportCoords.lat,
      lng: reportCoords.lng,
      sector: locName.includes("Sector") ? locName.split(',')[0] : "Sector 4"
    });

    if (modal) modal.style.display = "none";
  });
}

function openEmergencyModal(category) {
  const modal = document.getElementById("report-modal");
  const heading = document.getElementById("modal-cat-heading");
  const select = document.getElementById("modal-select-cat");
  if (!modal) return;

  if (heading) heading.textContent = `🚨 Report: ${category}`;
  if (select && category) select.value = category;

  modal.style.display = "flex";
}

function triggerSOSBeacon(report) {
  // Ensure default metadata
  report.sector = report.sector || "Sector 4 (River Rd)";
  report.urgency = report.urgency || (report.people > 2 ? "CRITICAL (P1)" : "HIGH (P2)");
  report.status = "Queued";
  report.responder = "Pending Command Dispatch";
  report.responderStatus = "Standby";
  report.directives = "Beacon broadcasted. Awaiting Incident Commander dispatch orders.";
  report.timestamp = "Just now";
  report.source = "ResQ Citizen App";

  if (resqState.isOnline) {
    // Save to shared state
    const shared = getSharedState();
    shared.incidents.unshift(report);
    saveSharedState(shared);

    // Broadcast to Command Center!
    broadcastSyncEvent("RESQ_NEW_SOS", report, "RESQ_APP");

    resqState.activeBeacons = shared.incidents;
    renderDistressBeaconMarkers();
    if (realMap) {
      realMap.flyTo([report.lat, report.lng], 16, { duration: 1.2 });
    }
    showToast(`🆘 EMERGENCY BROADCAST TRANSMITTED! Synced to Command Center as #${report.id}`, "🚨");
  } else {
    // Queue offline
    resqState.offlineQueue.push(report);
    localStorage.setItem("resq_local_reports", JSON.stringify(resqState.offlineQueue));
    updateOfflineQueueBadge();
    showToast(`⚠️ Internet down! Report stored in local phone storage & relaying via LoRa Node #014`, "📴");
  }
}

// ==========================================================================
// 3. OFFLINE EMERGENCY MESH SWITCHER
// ==========================================================================

function initOfflineMeshMode() {
  const btnToggle = document.getElementById("btn-net-toggle");
  const banner = document.getElementById("mesh-offline-banner");
  const btnRestore = document.getElementById("btn-restore-net");
  const btnSync = document.getElementById("btn-sync-queue");

  btnToggle?.addEventListener("click", () => toggleNetwork());
  btnRestore?.addEventListener("click", () => toggleNetwork(true));
  btnSync?.addEventListener("click", () => syncOfflineQueue());
}

function toggleNetwork(forceOnline = false) {
  const btnToggle = document.getElementById("btn-net-toggle");
  const label = document.getElementById("net-pill-label");
  const banner = document.getElementById("mesh-offline-banner");

  resqState.isOnline = forceOnline ? true : !resqState.isOnline;

  if (resqState.isOnline) {
    if (btnToggle) btnToggle.className = "net-status-pill online";
    if (label) label.textContent = "Online (Cellular)";
    if (banner) banner.style.display = "none";
    showToast("Internet restored. Connected to central emergency network.", "📶");

    if (resqState.offlineQueue.length > 0) {
      syncOfflineQueue();
    }
  } else {
    if (btnToggle) btnToggle.className = "net-status-pill offline";
    if (label) label.textContent = "LoRa Mesh";
    if (banner) banner.style.display = "flex";
    showToast("⚠️ Switched to Autonomous BLE/LoRa Mesh Mode (GIS Vector Cache Active)", "📴");
  }
}

function syncOfflineQueue() {
  const count = resqState.offlineQueue.length;
  if (count === 0) return;

  const shared = getSharedState();
  resqState.offlineQueue.forEach(item => {
    item.source = "ResQ Offline Mesh (Synced)";
    shared.incidents.unshift(item);
    broadcastSyncEvent("RESQ_NEW_SOS", item, "RESQ_APP");
  });
  saveSharedState(shared);

  resqState.activeBeacons = shared.incidents;
  resqState.offlineQueue = [];
  localStorage.removeItem("resq_local_reports");

  updateOfflineQueueBadge();
  renderDistressBeaconMarkers();
  showToast(`✓ All ${count} offline reports synchronized to Command Center!`, "✅");
}

function updateOfflineQueueBadge() {
  const bar = document.getElementById("offline-queue-bar");
  const countEl = document.getElementById("queue-count-text");
  if (!bar || !countEl) return;

  const count = resqState.offlineQueue.length;
  if (count > 0) {
    bar.style.display = "flex";
    countEl.textContent = `${count} Report${count > 1 ? 's' : ''} Stored in Phone`;
  } else {
    bar.style.display = "none";
  }
}

// ==========================================================================
// 4. REAL-TIME 2-WAY SYNC SUBSCRIPTION (RECEIVING FROM COMMAND CENTER)
// ==========================================================================

function initCommandSyncSubscription() {
  // Acknowledge Directive Ribbon Button
  document.getElementById("btn-ack-directive")?.addEventListener("click", () => {
    const banner = document.getElementById("command-directive-banner");
    if (banner) banner.style.display = "none";
    showToast("Government command directive acknowledged.", "👍");
  });

  // Check if an active directive already exists
  const shared = getSharedState();
  if (shared.activeDirective) {
    showCommandDirectiveBanner(
      shared.activeDirective.title,
      shared.activeDirective.message,
      shared.activeDirective.timestamp
    );
  }

  // Subscribe to real-time events
  subscribeToSync((event) => {
    if (event.sender === "RESQ_APP") return;

    if (event.type === "COMMAND_DISPATCH_UPDATE") {
      const { incidentId, status, responder, responderStatus, directives } = event.payload;

      playDirectiveChime();
      showToast(`📢 COMMAND UPDATE on #${incidentId}: Status '${status}'. ${responder} ${responderStatus}!`, "🛡️");

      showCommandDirectiveBanner(
        `GOVERNMENT COMMAND DIRECTIVE (Incident #${incidentId})`,
        `${responder} (${responderStatus}): "${directives || 'Orders transmitted by Commander.'}"`
      );

      // Refresh beacons and render
      const updatedShared = getSharedState();
      resqState.activeBeacons = updatedShared.incidents;
      renderDistressBeaconMarkers();
    }
    else if (event.type === "COMMAND_INCIDENT_RESOLVED") {
      const { incidentId } = event.payload;
      showToast(`✅ Incident #${incidentId} Marked RESOLVED by Incident Commander! Evacuation complete.`, "🎉");

      const banner = document.getElementById("command-directive-banner");
      if (banner) banner.style.display = "none";

      const updatedShared = getSharedState();
      resqState.activeBeacons = updatedShared.incidents;
      renderDistressBeaconMarkers();
    }
    else if (event.type === "COMMAND_BROADCAST_ALERT") {
      const { title, message } = event.payload;
      playDirectiveChime();
      showCommandDirectiveBanner(title || "GOVERNMENT EMERGENCY ALERT", message);
      showToast(`🚨 HIGH PRIORITY ALERT: ${message}`, "⚠️");
    }
    else if (event.type === "COMMAND_SHELTER_UPDATE") {
      const updatedShared = getSharedState();
      resqState.shelters = updatedShared.shelters;
      initSheltersList();
      renderShelterMarkers();
      showToast(`Shelter supplies & capacity updated by Command Center!`, "🏠");
    }
    else if (event.type === "COMMAND_PING_CITIZEN") {
      playDirectiveChime();
      showToast(`📡 Ping received from NDRF Incident Command Center. Telemetry verified.`, "📍");
    }
    else if (event.type === "STATE_STORAGE_CHANGE") {
      const updatedShared = getSharedState();
      resqState.activeBeacons = updatedShared.incidents;
      resqState.shelters = updatedShared.shelters;
      renderDistressBeaconMarkers();
      renderShelterMarkers();
    }
  });
}

function showCommandDirectiveBanner(title, body, time = "Just now") {
  const banner = document.getElementById("command-directive-banner");
  const titleEl = document.getElementById("directive-banner-title");
  const bodyEl = document.getElementById("directive-banner-body");
  const timeEl = document.getElementById("directive-banner-time");
  if (!banner) return;

  if (titleEl) titleEl.textContent = title;
  if (bodyEl) bodyEl.textContent = body;
  if (timeEl) timeEl.textContent = time;

  banner.style.display = "flex";
}

function playDirectiveChime() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
    osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
    osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2); // G5
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.45);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.45);
  } catch (e) {}
}

// ==========================================================================
// 5. EMERGENCY RESCUE TOOLS (SIREN, STROBE, SOS WHISTLE & BATTERY SAVER)
// ==========================================================================

function initEmergencyTools() {
  const btnSiren = document.getElementById("btn-siren-toggle");
  const btnStrobe = document.getElementById("btn-strobe-toggle");
  const strobeScreen = document.getElementById("strobe-screen");
  const btnStopStrobe = document.getElementById("btn-stop-strobe");

  btnSiren?.addEventListener("click", () => toggleSiren());

  btnStrobe?.addEventListener("click", () => {
    if (strobeScreen) {
      strobeScreen.style.display = "flex";
      runStrobeFlashing();
    }
  });

  btnStopStrobe?.addEventListener("click", () => {
    if (strobeScreen) strobeScreen.style.display = "none";
  });
}

function initWhistleAndBatterySaver() {
  // SOS Whistle Button
  const btnWhistle = document.getElementById("btn-whistle-toggle");
  btnWhistle?.addEventListener("click", () => {
    playMorseSOSWhistle();
  });

  // Battery Saver Button
  const btnBattery = document.getElementById("btn-battery-saver");
  btnBattery?.addEventListener("click", () => {
    resqState.isBatterySaver = !resqState.isBatterySaver;
    document.body.classList.toggle("battery-saver-active", resqState.isBatterySaver);
    btnBattery.classList.toggle("active", resqState.isBatterySaver);

    if (resqState.isBatterySaver) {
      showToast("🔋 Disaster Low Power Mode: Animations paused, conserving phone battery for rescue.", "⚡");
    } else {
      showToast("Standard power mode restored.", "🔋");
    }
  });
}

// SOS Morse Code Whistle ( · · · — — — · · · )
function playMorseSOSWhistle() {
  if (resqState.isWhistlePlaying) return;
  resqState.isWhistlePlaying = true;
  showToast("📢 Sounding SOS Morse Whistle (... --- ...)", "📢");

  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const morsePattern = [
      { d: 0.12, p: 0.1 }, { d: 0.12, p: 0.1 }, { d: 0.12, p: 0.25 },
      { d: 0.36, p: 0.1 }, { d: 0.36, p: 0.1 }, { d: 0.36, p: 0.25 },
      { d: 0.12, p: 0.1 }, { d: 0.12, p: 0.1 }, { d: 0.12, p: 0.4 }
    ];

    let t = ctx.currentTime;
    morsePattern.forEach(item => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 1100;
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.setValueAtTime(0, t + item.d);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + item.d);
      t += item.d + item.p;
    });

    setTimeout(() => {
      resqState.isWhistlePlaying = false;
    }, (t - ctx.currentTime) * 1000 + 200);

  } catch (e) {
    resqState.isWhistlePlaying = false;
    showToast("Whistle audio unavailable in browser", "⚠️");
  }
}

function toggleSiren() {
  const btn = document.getElementById("btn-siren-toggle");
  if (resqState.isSirenPlaying) {
    if (resqState.sirenOsc) {
      resqState.sirenOsc.stop();
      resqState.sirenOsc.disconnect();
      resqState.sirenOsc = null;
    }
    resqState.isSirenPlaying = false;
    btn?.classList.remove("active");
    if (btn) btn.innerHTML = `<span class="tool-icon">🚨</span><span class="tool-txt">Siren</span>`;
    showToast("Emergency siren silenced", "🔇");
  } else {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!resqState.sirenAudioCtx) resqState.sirenAudioCtx = new AudioCtx();
      if (resqState.sirenAudioCtx.state === "suspended") resqState.sirenAudioCtx.resume();

      const ctx = resqState.sirenAudioCtx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sawtooth";
      gain.gain.setValueAtTime(0.25, ctx.currentTime);

      const now = ctx.currentTime;
      for (let i = 0; i < 30; i++) {
        osc.frequency.setValueAtTime(550, now + i * 1.0);
        osc.frequency.linearRampToValueAtTime(1050, now + i * 1.0 + 0.5);
        osc.frequency.linearRampToValueAtTime(550, now + i * 1.0 + 1.0);
      }

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      resqState.sirenOsc = osc;
      resqState.isSirenPlaying = true;
      btn?.classList.add("active");
      if (btn) btn.innerHTML = `<span class="tool-icon">🛑</span><span class="tool-txt">Stop Siren</span>`;
      showToast("Loud rescue siren sounding!", "🚨");
    } catch (e) {
      showToast("Audio unavailable in this browser", "⚠️");
    }
  }
}

function runStrobeFlashing() {
  const screen = document.getElementById("strobe-screen");
  if (!screen || screen.style.display === "none") return;
  const isWhite = screen.style.backgroundColor === "rgb(255, 255, 255)";
  screen.style.backgroundColor = isWhite ? "#000000" : "#ffffff";
  screen.style.color = isWhite ? "#ffffff" : "#000000";
  setTimeout(runStrobeFlashing, 110);
}

function playBeep(freq, duration) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    gain.gain.value = 0.2;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {}
}

// ==========================================================================
// 6. SHELTERS DIRECTORY
// ==========================================================================

function initSheltersList() {
  renderSheltersList("all");

  document.querySelectorAll(".chip-filter, .s-filter-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".chip-filter, .s-filter-chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      const f = chip.getAttribute("data-filter");
      renderSheltersList(f);
    });
  });
}

function renderSheltersList(filter) {
  const container = document.getElementById("shelters-container");
  if (!container) return;

  let items = resqState.shelters;
  if (filter === "water") items = items.filter(s => s.water === "GOOD" || s.water === "OPTIMAL");
  else if (filter === "medical") items = items.filter(s => s.medical);
  else if (filter === "space") items = items.filter(s => (s.occ / s.capacity) < 0.8);

  container.innerHTML = items.map(s => {
    const pct = Math.round((s.occ / s.capacity) * 100);
    const fillClass = pct >= 85 ? "fill-crit" : (pct >= 70 ? "fill-warn" : "fill-safe");

    return `
      <div class="shelter-item-card">
        <div class="shelter-item-top">
          <div>
            <strong>${s.name}</strong>
            <div style="font-size: 0.72rem; color: #64748b;">${s.sector} · ${s.status}</div>
          </div>
          <span class="shelter-item-dist">📍 ${s.dist}</span>
        </div>

        <div style="display: flex; justify-content: space-between; font-size: 0.72rem; margin-bottom: 2px;">
          <span style="color: #64748b;">Occupancy</span>
          <span style="font-weight: 700; color: ${pct >= 85 ? '#ef4444' : '#059669'};">${s.occ}/${s.capacity} (${pct}%)</span>
        </div>
        <div class="shelter-occ-bar-track">
          <div class="shelter-occ-fill ${fillClass}" style="width: ${pct}%;"></div>
        </div>

        <div class="shelter-item-badges">
          <span class="mini-badge ${s.water === 'GOOD' || s.water === 'OPTIMAL' ? 'ok' : 'low'}">💧 Water: ${s.water}</span>
          <span class="mini-badge ${s.food === 'GOOD' || s.food === 'OPTIMAL' ? 'ok' : 'low'}">🍚 Rations: ${s.food}</span>
          ${s.medical ? '<span class="mini-badge ok">🏥 Medical</span>' : ''}
          ${s.power ? '<span class="mini-badge ok">⚡ Power</span>' : ''}
        </div>

        <div class="shelter-item-actions">
          <button class="btn-cancel" onclick="focusShelterOnMap('${s.id}')">
            View on Map
          </button>
          <button class="btn-danger-submit" onclick="reserveShelterBed('${s.id}')">
            Reserve Bed
          </button>
        </div>
      </div>
    `;
  }).join("");
}

window.focusShelterOnMap = (id) => {
  const s = resqState.shelters.find(item => item.id === id);
  if (!s || !realMap) return;
  realMap.flyTo([s.lat, s.lng], 16, { duration: 1 });
  openDrawer(
    `🏠 ${s.name} (${s.sector})`,
    `<strong>Distance:</strong> ${s.dist} away<br/>` +
    `<strong>Capacity:</strong> ${s.occ}/${s.capacity} beds<br/>` +
    `<strong>Supplies:</strong> Water: ${s.water} · Food: ${s.food}`,
    `<button class="btn-cancel" onclick="showToast('Walking Route: Follow 5th Ave North (Elevation 18m)', '🧭')">Directions</button>
     <button class="btn-danger-submit" onclick="reserveShelterBed('${s.id}')">Reserve Bed</button>`
  );
};

// ==========================================================================
// 7. FAMILY SAFETY & CHECKLIST
// ==========================================================================

function initFamilyAndChecklist() {
  const btnSafe = document.getElementById("btn-safe-confirm");
  btnSafe?.addEventListener("click", () => {
    btnSafe.textContent = "✓ SAFE BROADCASTED";
    btnSafe.style.backgroundColor = "#059669";
    const famStatus = document.getElementById("fam-status-sub");
    if (famStatus) famStatus.textContent = "Sarah (Safe) · David (Safe) · Maya (Safe) · Command Center Notified";

    // Broadcast to Command Center!
    const shared = getSharedState();
    shared.familySafe = true;
    saveSharedState(shared);
    broadcastSyncEvent("RESQ_FAMILY_SAFE", { timestamp: Date.now() }, "RESQ_APP");

    showToast("Safety status broadcasted across cloud and LoRa mesh to all family members and Command Center!", "👨‍👩‍👧‍👦");
  });

  document.querySelectorAll(".kit-chk").forEach(chk => {
    chk.addEventListener("change", () => {
      const all = document.querySelectorAll(".kit-chk");
      const checked = document.querySelectorAll(".kit-chk:checked").length;
      const lbl = document.getElementById("chk-progress-label");
      if (lbl) lbl.textContent = `${checked} of ${all.length} Ready`;
    });
  });
}
