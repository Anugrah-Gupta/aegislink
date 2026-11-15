/**
 * AegisLink Tactical Command Center — Master Terminal Controller
 * Real Leaflet Tactical GIS Map (EPSG:3857) + Real-Time ResQ 2-Way Synchronization
 * Full Incident Control, Responder Dispatch, Tactical Telemetry & AI Crisis Engine
 */

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  getSharedState,
  saveSharedState,
  broadcastSyncEvent,
  subscribeToSync
} from './syncState.js';

// Application State
const state = {
  shared: null,
  activeLayerFilters: {
    sos: true,
    citizen: true,
    hospitals: true,
    shelters: true,
    nodes: true,
    hazards: true,
    responders: true
  },
  currentTileStyle: 'dark',
  selectedIncident: null,
  realMap: null,
  baseTileLayers: {},
  layerGroups: {
    sos: null,
    citizen: null,
    hospitals: null,
    shelters: null,
    nodes: null,
    hazards: null,
    responders: null
  }
};

// ==========================================================================
// INITIALIZATION
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
  // 1. Verify Government Clearance Session (Auto-provision demo session for public evaluation)
  let sessionStr = localStorage.getItem("aegis_gov_session");
  if (!sessionStr) {
    const demoOfficer = {
      id: "NDRF-CMD-881",
      name: "Commander Sharma",
      agency: "NDRF 8th Battalion",
      agencyCode: "NDRF",
      badge: "NDRF-CMD-881",
      clearanceLevel: "Level 4 (Tactical Operations)",
      loginTime: new Date().toISOString(),
      encryptedToken: "ED25519-GOV-982143",
      airGapActive: true
    };
    localStorage.setItem("aegis_gov_session", JSON.stringify(demoOfficer));
    sessionStr = JSON.stringify(demoOfficer);
  }

  const officer = JSON.parse(sessionStr);
  const nameEl = document.getElementById("display-officer-name");
  const agencyEl = document.getElementById("display-officer-agency");

  if (nameEl) nameEl.textContent = officer.name || "Incident Commander";
  if (agencyEl) agencyEl.textContent = `${officer.agency || "NDRF / SDMA"} · Level 4`;

  // Lock Terminal Button
  document.getElementById("btn-lock-terminal")?.addEventListener("click", () => {
    localStorage.removeItem("aegis_gov_session");
    showToast("Terminal locked. Government clearance revoked.", "🔒");
    setTimeout(() => {
      window.location.href = "command-login.html";
    }, 400);
  });

  // 2. Load Shared State from synchronized store
  state.shared = getSharedState();

  // 3. Initialize Tactical GIS Leaflet Map
  initTacticalLeafletMap();

  // 4. Initialize AI Engine & Tabs
  initAIEngine();
  initConsoleTabs();

  // 5. Render Incident Feeds, KPI counters, and Resource Lists
  renderAllFeeds();

  // 6. Subscribe to Real-Time Events from ResQ App
  initSyncSubscription();
});

// Toast Notification
function showToast(message, icon = "ℹ️") {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `<span style="font-size: 1.2rem;">${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3800);
}

// Audio Tactical Alert
function playTacticalBeep(freq = 660, duration = 0.12) {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, audioCtx.currentTime + duration);
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {
    // Audio autoplay restrictions
  }
}

// ==========================================================================
// 1. REAL TACTICAL GIS LEAFLET MAP ENGINE
// ==========================================================================

function initTacticalLeafletMap() {
  const mapContainer = document.getElementById("command-real-map");
  if (!mapContainer) return;

  const centerLat = state.shared.citizenLocation ? state.shared.citizenLocation.lat : 37.7749;
  const centerLng = state.shared.citizenLocation ? state.shared.citizenLocation.lng : -122.4194;

  // Initialize Leaflet Map
  state.realMap = L.map("command-real-map", {
    center: [centerLat, centerLng],
    zoom: 14,
    zoomControl: false,
    attributionControl: false
  });

  // Base Tile Providers
  state.baseTileLayers.dark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    subdomains: 'abcd'
  });

  state.baseTileLayers.satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{x}/{y}', {
    maxZoom: 19
  });

  state.baseTileLayers.streets = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19
  });

  // Add default Tactical Dark Matter
  state.baseTileLayers.dark.addTo(state.realMap);

  // Initialize Layer Groups
  state.layerGroups.hazards = L.layerGroup().addTo(state.realMap);
  state.layerGroups.nodes = L.layerGroup().addTo(state.realMap);
  state.layerGroups.hospitals = L.layerGroup().addTo(state.realMap);
  state.layerGroups.shelters = L.layerGroup().addTo(state.realMap);
  state.layerGroups.responders = L.layerGroup().addTo(state.realMap);
  state.layerGroups.citizen = L.layerGroup().addTo(state.realMap);
  state.layerGroups.sos = L.layerGroup().addTo(state.realMap);

  // Render all map markers and GIS shapes
  renderMapLayers();

  // Wire Map Controls
  initMapControls();

  // Invalidate size after layout calculation
  setTimeout(() => state.realMap.invalidateSize(), 150);
  setTimeout(() => state.realMap.invalidateSize(), 500);
  window.addEventListener("resize", () => state.realMap.invalidateSize());
}

function initMapControls() {
  // Base Tile Switcher Buttons
  document.querySelectorAll(".cmd-tile-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const style = btn.getAttribute("data-style");
      if (!style || !state.baseTileLayers[style]) return;

      document.querySelectorAll(".cmd-tile-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      // Switch base tile
      Object.values(state.baseTileLayers).forEach(layer => state.realMap.removeLayer(layer));
      state.baseTileLayers[style].addTo(state.realMap);
      state.currentTileStyle = style;

      showToast(`Tactical map layer switched to ${style.toUpperCase()}`, "🗺️");
    });
  });

  // Layer Filter Toggles
  document.querySelectorAll(".map-layer-toggles .layer-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const layer = btn.getAttribute("data-layer");
      if (!layer || !state.layerGroups[layer]) return;

      state.activeLayerFilters[layer] = !state.activeLayerFilters[layer];
      btn.classList.toggle("active", state.activeLayerFilters[layer]);

      if (state.activeLayerFilters[layer]) {
        state.realMap.addLayer(state.layerGroups[layer]);
      } else {
        state.realMap.removeLayer(state.layerGroups[layer]);
      }
    });
  });

  // HUD Zoom Controls
  document.getElementById("btn-zoom-in")?.addEventListener("click", () => {
    state.realMap.zoomIn();
  });

  document.getElementById("btn-zoom-out")?.addEventListener("click", () => {
    state.realMap.zoomOut();
  });

  // Recenter on ResQ Citizen GPS
  document.getElementById("btn-recenter-resq")?.addEventListener("click", () => {
    const loc = state.shared.citizenLocation || { lat: 37.7749, lng: -122.4194 };
    state.realMap.flyTo([loc.lat, loc.lng], 16, { duration: 1.2 });
    showToast(`Locked tactical crosshairs onto Citizen Balcony GPS (${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)})`, "📍");
  });

  document.getElementById("btn-reset-view")?.addEventListener("click", () => {
    state.realMap.flyTo([37.7749, -122.4194], 14, { duration: 1 });
  });

  // Drawer Close Button
  document.getElementById("drawer-close-btn")?.addEventListener("click", () => {
    document.getElementById("marker-drawer")?.classList.remove("open");
  });
}

// ==========================================================================
// 2. RENDER MAP LAYERS (SHARED GIS DATA)
// ==========================================================================

function renderMapLayers() {
  if (!state.realMap) return;

  renderCitizenMarker();
  renderSOSMarkers();
  renderShelterMarkers();
  renderHospitalMarkers();
  renderMeshNodeMarkers();
  renderHazardZone();
  renderResponderMarkers();
}

// 2A. Citizen Live Location (Pulsing Cyan Radar Beacon)
function renderCitizenMarker() {
  state.layerGroups.citizen.clearLayers();
  const loc = state.shared.citizenLocation || { lat: 37.7749, lng: -122.4194, label: "Citizen (Balcony)" };

  const citizenIcon = L.divIcon({
    className: 'tactical-leaflet-marker',
    html: `
      <div class="tactical-citizen-beacon">
        <div class="pulse-ring-cit"></div>
        <div class="beacon-core-cit">📍</div>
        <div class="beacon-tag-cit">CITIZEN DEVICE #1 · Balcony</div>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });

  const marker = L.marker([loc.lat, loc.lng], { icon: citizenIcon });
  marker.on('click', () => {
    openCitizenDrawer(loc);
  });

  // Accuracy circle
  const circle = L.circle([loc.lat, loc.lng], {
    radius: 35,
    color: '#38bdf8',
    weight: 1.5,
    dashArray: '3, 4',
    fillColor: '#0284c7',
    fillOpacity: 0.15
  });

  state.layerGroups.citizen.addLayer(marker);
  state.layerGroups.citizen.addLayer(circle);
}

function openCitizenDrawer(loc) {
  const drawer = document.getElementById("marker-drawer");
  const title = document.getElementById("drawer-title");
  const body = document.getElementById("drawer-body");
  const actions = document.getElementById("drawer-actions");
  if (!drawer) return;

  title.textContent = `📍 Citizen Live Telemetry (ResQ Device)`;
  body.innerHTML = `
    <div class="drawer-stat-row">
      <span>Device ID: <strong style="color: #38bdf8;">RESQ-MOB-014</strong></span>
      <span>Battery: <strong style="color: #34d399;">84% (Mesh LoRa Link Active)</strong></span>
    </div>
    <div class="drawer-stat-row">
      <span>Coordinates: <strong>${loc.lat.toFixed(4)}° N, ${loc.lng.toFixed(4)}° W</strong></span>
      <span>Elevation: <strong>+18m (+13.2m above flood wall)</strong></span>
    </div>
    <p style="margin: 10px 0; font-size: 0.8125rem; color: #cbd5e1;">
      <strong>Location Tag:</strong> Sector 4, River Road #42 (2nd Floor Balcony). Citizen reports flood ingress in surrounding ground floor.
    </p>
    <div style="font-size: 0.75rem; color: #fde68a;">
      Nearest Shelter: <strong>West High School Arena (0.8 km north)</strong> · Safe evacuation corridor via 5th Ave.
    </div>
  `;

  actions.innerHTML = `
    <div class="cmd-action-btns-row" style="width: 100%;">
      <button class="btn-cmd-transmit" onclick="window.sendDirectCitizenPing()">
        <span>📡 Ping Citizen Device</span>
      </button>
      <button class="btn-cmd-alert" onclick="window.quickBroadcastToSector('Sector 4')">
        <span>📢 Send Sector Evacuation Directive</span>
      </button>
    </div>
  `;

  drawer.classList.add("open");
}

// 2B. SOS Incidents (Interactive Tactical Beacons with Dispatch Controls)
function renderSOSMarkers() {
  state.layerGroups.sos.clearLayers();
  const incidents = state.shared.incidents || [];

  // Update SOS counter in layer button
  const sosCountEl = document.getElementById("count-layer-sos");
  if (sosCountEl) sosCountEl.textContent = incidents.length;

  incidents.forEach(inc => {
    const isDispatched = inc.status === "Dispatched" || inc.status === "En Route" || inc.status === "On Scene";
    const isResolved = inc.status === "Resolved" || inc.status === "Resolved & Safe";

    let stateClass = "";
    if (isResolved) stateClass = "resolved";
    else if (isDispatched) stateClass = "dispatched";

    const sosIcon = L.divIcon({
      className: 'tactical-leaflet-marker',
      html: `
        <div class="tactical-sos-beacon ${stateClass}">
          <div class="pulse-ring-sos"></div>
          <div class="beacon-core-sos">${isResolved ? '✓' : (isDispatched ? '🛡️' : '🆘')}</div>
          <div class="beacon-tag">#${inc.id} · ${inc.type.split(' ')[0]}</div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const marker = L.marker([inc.lat, inc.lng], { icon: sosIcon });
    marker.on('click', () => {
      openIncidentDrawer(inc);
    });

    state.layerGroups.sos.addLayer(marker);
  });
}

// 2C. Evacuation Shelters
function renderShelterMarkers() {
  state.layerGroups.shelters.clearLayers();
  const shelters = state.shared.shelters || [];

  shelters.forEach(s => {
    const icon = L.divIcon({
      className: 'tactical-leaflet-marker',
      html: `
        <div class="tactical-facility-badge shelter">
          <span>🏠</span>
          <span>${s.name.split(' ')[0]} (${s.occ}/${s.capacity})</span>
        </div>
      `,
      iconSize: [120, 26],
      iconAnchor: [60, 13]
    });

    const marker = L.marker([s.lat, s.lng], { icon });
    marker.on('click', () => {
      openShelterDrawer(s);
    });
    state.layerGroups.shelters.addLayer(marker);
  });
}

// 2D. Hospitals
function renderHospitalMarkers() {
  state.layerGroups.hospitals.clearLayers();
  const hospitals = state.shared.hospitals || [];

  hospitals.forEach(h => {
    const icon = L.divIcon({
      className: 'tactical-leaflet-marker',
      html: `
        <div class="tactical-facility-badge hospital">
          <span>🏥</span>
          <span>${h.name.split(' ')[0]} · ${h.beds} Beds</span>
        </div>
      `,
      iconSize: [110, 26],
      iconAnchor: [55, 13]
    });

    const marker = L.marker([h.lat, h.lng], { icon });
    marker.on('click', () => {
      openHospitalDrawer(h);
    });
    state.layerGroups.hospitals.addLayer(marker);
  });
}

// 2E. Mesh Nodes
function renderMeshNodeMarkers() {
  state.layerGroups.nodes.clearLayers();
  const nodes = state.shared.meshNodes || [];

  // Draw node markers
  nodes.forEach(n => {
    const icon = L.divIcon({
      className: 'tactical-leaflet-marker',
      html: `
        <div class="tactical-facility-badge node">
          <span>📡</span>
          <span>${n.id} (${n.batt})</span>
        </div>
      `,
      iconSize: [95, 24],
      iconAnchor: [47, 12]
    });

    const marker = L.marker([n.lat, n.lng], { icon });
    state.layerGroups.nodes.addLayer(marker);
  });

  // Draw mesh connection lines
  for (let i = 0; i < nodes.length - 1; i++) {
    const polyline = L.polyline([
      [nodes[i].lat, nodes[i].lng],
      [nodes[i + 1].lat, nodes[i + 1].lng]
    ], {
      color: '#10b981',
      weight: 1.5,
      dashArray: '4, 6',
      opacity: 0.4
    });
    state.layerGroups.nodes.addLayer(polyline);
  }
}

// 2F. Hazard / Flood Surge Zone
function renderHazardZone() {
  state.layerGroups.hazards.clearLayers();
  if (state.shared.floodPolygon && state.shared.floodPolygon.length > 0) {
    const poly = L.polygon(state.shared.floodPolygon, {
      color: '#0284c7',
      weight: 2,
      fillColor: '#38bdf8',
      fillOpacity: 0.22,
      dashArray: '6, 6'
    });
    poly.bindTooltip("⚠️ Sector 4 River Basin Flash Inundation (+18cm/h)", {
      permanent: false,
      direction: 'center',
      className: 'tactical-tooltip'
    });
    state.layerGroups.hazards.addLayer(poly);
  }
}

// 2G. Responders
function renderResponderMarkers() {
  state.layerGroups.responders.clearLayers();
  const responders = state.shared.responders || [];

  responders.forEach(r => {
    const icon = L.divIcon({
      className: 'tactical-leaflet-marker',
      html: `
        <div class="tactical-facility-badge responder">
          <span>${r.icon}</span>
          <span>${r.name}</span>
        </div>
      `,
      iconSize: [110, 26],
      iconAnchor: [55, 13]
    });

    const marker = L.marker([r.lat, r.lng], { icon });
    state.layerGroups.responders.addLayer(marker);
  });
}

// ==========================================================================
// 3. INCIDENT CONTROL DRAWER & DISPATCH SYSTEM
// ==========================================================================

function openIncidentDrawer(inc) {
  state.selectedIncident = inc;
  const drawer = document.getElementById("marker-drawer");
  const title = document.getElementById("drawer-title");
  const body = document.getElementById("drawer-body");
  const actions = document.getElementById("drawer-actions");
  if (!drawer || !title || !body || !actions) return;

  const isResolved = inc.status === "Resolved" || inc.status === "Resolved & Safe";

  title.innerHTML = `🚨 Incident #${inc.id} · <span style="color: #38bdf8;">${inc.type}</span>`;
  body.innerHTML = `
    <div class="drawer-stat-row">
      <span>Urgency Triage: <strong style="color: ${inc.urgency.includes('CRITICAL') ? '#f87171' : '#fbbf24'};">${inc.urgency}</strong></span>
      <span>Sector: <strong>${inc.sector || 'Sector 4'}</strong></span>
    </div>
    <div class="drawer-stat-row">
      <span>Victims in Danger: <strong>${inc.people || 1} Persons</strong></span>
      <span>Current Status: <strong style="color: #60a5fa;">${inc.status}</strong></span>
    </div>
    <div class="drawer-stat-row" style="margin-top: 4px;">
      <span>GPS Coordinates: <strong>${inc.lat.toFixed(4)}° N, ${inc.lng.toFixed(4)}° W</strong></span>
      <span>Source: <strong>${inc.source || 'ResQ Citizen Beacon'}</strong></span>
    </div>
    
    <p style="margin: 10px 0 6px; font-size: 0.8125rem; color: #cbd5e1; background: rgba(255, 255, 255, 0.04); padding: 8px 10px; border-radius: 6px; border-left: 3px solid #38bdf8;">
      <strong>Civilian Report:</strong> ${inc.details || 'Immediate search & rescue requested via emergency beacon.'}
    </p>

    <!-- GOVERNMENT TACTICAL DISPATCH CONTROLS -->
    <div class="cmd-drawer-form">
      <div class="cmd-form-row">
        <div class="cmd-form-group">
          <label for="ctrl-status-select">Operational Status</label>
          <select id="ctrl-status-select" class="cmd-select">
            <option value="Dispatched" ${inc.status === 'Dispatched' ? 'selected' : ''}>Dispatched (Orders Issued)</option>
            <option value="En Route" ${inc.status === 'En Route' ? 'selected' : ''}>En Route (Transit)</option>
            <option value="On Scene" ${inc.status === 'On Scene' ? 'selected' : ''}>On Scene (Evacuating)</option>
            <option value="Queued" ${inc.status === 'Queued' ? 'selected' : ''}>Queued (Standby)</option>
            <option value="Resolved & Safe" ${isResolved ? 'selected' : ''}>Resolved & Evacuated</option>
          </select>
        </div>

        <div class="cmd-form-group">
          <label for="ctrl-responder-select">Assigned Rescue Asset</label>
          <select id="ctrl-responder-select" class="cmd-select">
            <option value="Boat Rescue Unit 1" ${inc.responder === 'Boat Rescue Unit 1' ? 'selected' : ''}>🚤 Boat Rescue Unit 1 (Water)</option>
            <option value="Ambulance 04 (ALS)" ${inc.responder === 'Ambulance 04 (ALS)' ? 'selected' : ''}>🚑 Ambulance 04 (Paramedic ALS)</option>
            <option value="USAR Heavy Squad 4" ${inc.responder === 'USAR Heavy Squad 4' ? 'selected' : ''}>🚒 USAR Heavy Squad 4 (Collapse)</option>
            <option value="Search & Recon Drone B" ${inc.responder === 'Search & Recon Drone B' ? 'selected' : ''}>🛸 Search & Recon Drone B (Thermal)</option>
            <option value="NDRF Swiftwater Team 8" ${inc.responder === 'NDRF Swiftwater Team 8' ? 'selected' : ''}>🎖️ NDRF Swiftwater Team 8</option>
          </select>
        </div>
      </div>

      <div class="cmd-form-group">
        <label for="ctrl-directives-text">Government Directive / Instructions to Citizen (ResQ App)</label>
        <input type="text" id="ctrl-directives-text" class="cmd-input" value="${inc.directives || 'Stay on second floor balcony. Rescue craft approaching from south corridor. ETA 4 mins.'}" placeholder="Type emergency directive sent to ResQ app..." />
      </div>
    </div>
  `;

  actions.innerHTML = `
    <div class="cmd-action-btns-row" style="width: 100%;">
      <button class="btn-cmd-transmit" onclick="window.transmitCommandOrders('${inc.id}')">
        <span>⚡ Transmit Government Orders</span>
      </button>
      <button class="btn-cmd-resolve" onclick="window.markIncidentResolved('${inc.id}')">
        <span>✓ Mark Resolved & Safe</span>
      </button>
      <button class="btn-cmd-alert" onclick="window.quickBroadcastToSector('${inc.sector || 'Sector 4'}')">
        <span>📢 Broadcast Sector Alert</span>
      </button>
    </div>
  `;

  drawer.classList.add("open");
}

function openShelterDrawer(s) {
  const drawer = document.getElementById("marker-drawer");
  const title = document.getElementById("drawer-title");
  const body = document.getElementById("drawer-body");
  const actions = document.getElementById("drawer-actions");
  if (!drawer) return;

  title.textContent = `🏠 Evacuation Shelter: ${s.name}`;
  body.innerHTML = `
    <div class="drawer-stat-row">
      <span>Sector: <strong>${s.sector}</strong></span>
      <span>Distance: <strong>${s.dist}</strong></span>
    </div>
    <div class="drawer-stat-row">
      <span>Occupancy: <strong style="color: #fbbf24;">${s.occ} / ${s.capacity} beds</strong> (${Math.round(s.occ / s.capacity * 100)}%)</span>
      <span>Status: <strong style="color: #34d399;">${s.status}</strong></span>
    </div>
    <div class="drawer-stat-row" style="margin-top: 6px;">
      <span>Clean Water Supply: <strong>${s.water}</strong></span>
      <span>Food Rations: <strong>${s.food}</strong></span>
      <span>Emergency Power: <strong>${s.pwr || 'Active'}</strong></span>
    </div>
    <p style="margin: 10px 0; font-size: 0.8125rem; color: #94a3b8;">
      Connected to ResQ Citizen booking network. Citizens in Sector 4 can reserve beds in real-time.
    </p>
  `;

  actions.innerHTML = `
    <div class="cmd-action-btns-row" style="width: 100%;">
      <button class="btn-cmd-transmit" onclick="window.dispatchShelterSupplies('${s.id}')">
        <span>🚚 Dispatch Relief Convoy (Water & Medical)</span>
      </button>
      <button class="btn-cmd-resolve" onclick="window.toggleShelterCapacity('${s.id}')">
        <span>➕ Expand Capacity +100 Beds</span>
      </button>
    </div>
  `;

  drawer.classList.add("open");
}

function openHospitalDrawer(h) {
  const drawer = document.getElementById("marker-drawer");
  const title = document.getElementById("drawer-title");
  const body = document.getElementById("drawer-body");
  const actions = document.getElementById("drawer-actions");
  if (!drawer) return;

  title.textContent = `🏥 Emergency Trauma Center: ${h.name}`;
  body.innerHTML = `
    <div class="drawer-stat-row">
      <span>Available Trauma Beds: <strong style="color: #38bdf8;">${h.beds} Beds</strong></span>
      <span>ICU Capacity: <strong style="color: #f87171;">${h.icu} Units</strong></span>
    </div>
    <div class="drawer-stat-row">
      <span>Blood Bank Supply: <strong>${h.blood}</strong></span>
      <span>Status: <strong style="color: #34d399;">${h.status}</strong></span>
    </div>
  `;

  actions.innerHTML = `
    <div class="cmd-action-btns-row" style="width: 100%;">
      <button class="btn-cmd-transmit" onclick="window.routeAmbulancesToHospital('${h.id}')">
        <span>🚑 Route Primary Ambulance Fleet</span>
      </button>
    </div>
  `;

  drawer.classList.add("open");
}

// ==========================================================================
// 4. GOVERNMENT COMMAND ACTIONS (DISPATCH & CONTROL)
// ==========================================================================

window.transmitCommandOrders = (incidentId) => {
  const statusSelect = document.getElementById("ctrl-status-select");
  const respSelect = document.getElementById("ctrl-responder-select");
  const directInput = document.getElementById("ctrl-directives-text");

  const newStatus = statusSelect ? statusSelect.value : "Dispatched";
  const newResponder = respSelect ? respSelect.value : "Boat Rescue Unit 1";
  const newDirectives = directInput ? directInput.value : "Rescue unit dispatched.";

  const incIndex = state.shared.incidents.findIndex(i => i.id === incidentId);
  if (incIndex !== -1) {
    const inc = state.shared.incidents[incIndex];
    inc.status = newStatus;
    inc.responder = newResponder;
    inc.responderStatus = newStatus === "Resolved & Safe" ? "Mission Complete" : "En Route";
    inc.directives = newDirectives;
    inc.timestamp = "Just now";

    // Save and Broadcast to ResQ App!
    saveSharedState(state.shared);
    broadcastSyncEvent("COMMAND_DISPATCH_UPDATE", {
      incidentId: inc.id,
      status: inc.status,
      responder: inc.responder,
      responderStatus: inc.responderStatus,
      directives: inc.directives,
      type: inc.type
    }, "COMMAND_TERMINAL");

    // Refresh UI
    renderSOSMarkers();
    renderAllFeeds();
    showToast(`Government Dispatch Orders Transmitted for Incident #${incidentId}! ResQ Citizen App notified in real time.`, "🚨");
    playTacticalBeep(880, 0.15);

    document.getElementById("marker-drawer")?.classList.remove("open");
  }
};

window.markIncidentResolved = (incidentId) => {
  const incIndex = state.shared.incidents.findIndex(i => i.id === incidentId);
  if (incIndex !== -1) {
    const inc = state.shared.incidents[incIndex];
    inc.status = "Resolved & Safe";
    inc.responderStatus = "Mission Accomplished";
    inc.directives = "Evacuation and medical stabilization confirmed complete by Incident Commander.";

    saveSharedState(state.shared);
    broadcastSyncEvent("COMMAND_INCIDENT_RESOLVED", {
      incidentId: inc.id,
      type: inc.type
    }, "COMMAND_TERMINAL");

    renderSOSMarkers();
    renderAllFeeds();
    showToast(`Incident #${incidentId} Marked RESOLVED & EVACUATED! ResQ notified.`, "✅");
    document.getElementById("marker-drawer")?.classList.remove("open");
  }
};

window.quickBroadcastToSector = (sector) => {
  const alertMsg = `MANDATORY EVACUATION ORDER: ${sector} flood wall compromised. Move immediately to upper floors or West High School Arena.`;
  
  state.shared.activeDirective = {
    title: `EMERGENCY ALERT: ${sector}`,
    message: alertMsg,
    timestamp: new Date().toLocaleTimeString()
  };
  saveSharedState(state.shared);

  broadcastSyncEvent("COMMAND_BROADCAST_ALERT", {
    sector,
    message: alertMsg,
    title: `GOVERNMENT EMERGENCY DIRECTIVE (${sector})`
  }, "COMMAND_TERMINAL");

  showToast(`Emergency Sector Broadcast transmitted to all ResQ apps in ${sector}!`, "📢");
  document.getElementById("marker-drawer")?.classList.remove("open");
};

window.sendDirectCitizenPing = () => {
  broadcastSyncEvent("COMMAND_PING_CITIZEN", {
    message: "NDRF Command Center telemetry ping. Stay at your location."
  }, "COMMAND_TERMINAL");
  showToast("Ping transmitted to citizen mobile device.", "📡");
};

window.dispatchShelterSupplies = (shelterId) => {
  const s = state.shared.shelters.find(i => i.id === shelterId);
  if (!s) return;
  s.water = "OPTIMAL";
  s.food = "OPTIMAL";
  saveSharedState(state.shared);
  broadcastSyncEvent("COMMAND_SHELTER_UPDATE", s, "COMMAND_TERMINAL");
  showToast(`Relief convoy dispatched to ${s.name}! Water & food supplies updated.`, "🚚");
  document.getElementById("marker-drawer")?.classList.remove("open");
  renderResourceFeeds();
};

window.toggleShelterCapacity = (shelterId) => {
  const s = state.shared.shelters.find(i => i.id === shelterId);
  if (!s) return;
  s.capacity += 100;
  saveSharedState(state.shared);
  broadcastSyncEvent("COMMAND_SHELTER_UPDATE", s, "COMMAND_TERMINAL");
  showToast(`Capacity expanded by 100 beds at ${s.name}!`, "➕");
  document.getElementById("marker-drawer")?.classList.remove("open");
  renderShelterMarkers();
  renderResourceFeeds();
};

window.routeAmbulancesToHospital = (hospId) => {
  showToast(`Hospital #${hospId} designated as Primary Trauma Hub. All ALS units routed.`, "🚑");
  document.getElementById("marker-drawer")?.classList.remove("open");
};

// ==========================================================================
// 5. REAL-TIME EVENT SUBSCRIPTION (LISTENING TO RESQ APP)
// ==========================================================================

function initSyncSubscription() {
  subscribeToSync((event) => {
    // If sent by this terminal itself, ignore
    if (event.sender === "COMMAND_TERMINAL") return;

    if (event.type === "RESQ_NEW_SOS") {
      // Citizen created SOS in ResQ!
      const newInc = event.payload;
      playTacticalBeep(520, 0.25);
      showToast(`🚨 NEW SOS FROM RESQ: ${newInc.type} (${newInc.people || 1} Persons) at ${newInc.sector || 'Sector 4'}!`, "🆘");

      // Reload shared state
      state.shared = getSharedState();

      // Pan/Zoom to new incident location on Command Tactical Map
      if (state.realMap && newInc.lat && newInc.lng) {
        state.realMap.flyTo([newInc.lat, newInc.lng], 16, { duration: 1.2 });
      }

      renderSOSMarkers();
      renderAllFeeds();
    }
    else if (event.type === "RESQ_LOCATION_CHANGE") {
      state.shared = getSharedState();
      renderCitizenMarker();
      showToast(`Citizen GPS updated via ResQ: ${event.payload.lat.toFixed(4)}, ${event.payload.lng.toFixed(4)}`, "📍");
    }
    else if (event.type === "RESQ_SHELTER_RESERVE" || event.type === "RESQ_SHELTER_UPDATE") {
      state.shared = getSharedState();
      renderShelterMarkers();
      renderResourceFeeds();
      showToast(`Shelter Bed Reserved via ResQ Citizen App!`, "🏠");
    }
    else if (event.type === "RESQ_FAMILY_SAFE") {
      showToast(`Citizen marked family members as SAFE via ResQ App!`, "👨‍👩‍👧‍👦");
    }
    else if (event.type === "STATE_STORAGE_CHANGE") {
      state.shared = getSharedState();
      renderMapLayers();
      renderAllFeeds();
    }
  });
}

// ==========================================================================
// 6. FEEDS & KPI RENDERING
// ==========================================================================

function renderAllFeeds() {
  renderIncidentFeeds();
  renderResourceFeeds();
  updateKPICounters();
}

function updateKPICounters() {
  const incidents = state.shared.incidents || [];
  const activeCount = incidents.filter(i => i.status !== "Resolved" && i.status !== "Resolved & Safe").length;
  const critCount = incidents.filter(i => i.urgency.includes("CRITICAL")).length;

  const activeEl = document.getElementById("kpi-active-count");
  const critEl = document.getElementById("kpi-crit-count");
  if (activeEl) activeEl.textContent = activeCount;
  if (critEl) critEl.textContent = `${critCount} Critical Triage`;

  // Shelters KPI
  const shelters = state.shared.shelters || [];
  const totalOcc = shelters.reduce((acc, s) => acc + s.occ, 0);
  const totalCap = shelters.reduce((acc, s) => acc + s.capacity, 0);
  const pct = Math.round(totalOcc / (totalCap || 1) * 100);

  const occEl = document.getElementById("kpi-shelters-occ");
  const pctEl = document.getElementById("kpi-shelters-pct");
  if (occEl) occEl.textContent = `${totalOcc.toLocaleString()} / ${totalCap.toLocaleString()}`;
  if (pctEl) pctEl.textContent = `${pct}%`;
}

function renderIncidentFeeds() {
  const list = document.getElementById("incident-list");
  const tabCount = document.getElementById("tab-incident-count");
  if (!list) return;

  const incidents = state.shared.incidents || [];
  if (tabCount) tabCount.textContent = incidents.length;

  list.innerHTML = incidents.map(inc => {
    const isResolved = inc.status === "Resolved" || inc.status === "Resolved & Safe";
    const badgeColor = isResolved ? "rgba(16, 185, 129, 0.2)" : (inc.urgency.includes("CRITICAL") ? "rgba(239, 68, 68, 0.2)" : "rgba(245, 158, 11, 0.2)");
    const textColor = isResolved ? "#34d399" : (inc.urgency.includes("CRITICAL") ? "#f87171" : "#fbbf24");

    return `
      <div class="incident-item-card" onclick="window.zoomToIncident('${inc.id}')">
        <div class="inc-card-head">
          <span class="inc-id">#${inc.id}</span>
          <span class="inc-badge-urgent" style="background: ${badgeColor}; color: ${textColor};">${inc.status} · ${inc.urgency.split(' ')[0]}</span>
        </div>
        <div class="inc-title">${inc.type} · ${inc.people || 1} Victims</div>
        <div class="inc-meta">
          <span>📍 ${inc.sector || 'Sector 4'}</span>
          <span>🚑 ${inc.responder || 'Unassigned'}</span>
        </div>
      </div>
    `;
  }).join("");
}

window.zoomToIncident = (id) => {
  const inc = state.shared.incidents.find(i => i.id === id);
  if (!inc) return;

  if (state.realMap && inc.lat && inc.lng) {
    state.realMap.flyTo([inc.lat, inc.lng], 16, { duration: 1 });
  }
  openIncidentDrawer(inc);
};

function renderResourceFeeds() {
  const hospList = document.getElementById("hospital-list");
  const shelList = document.getElementById("shelter-list");

  if (hospList) {
    hospList.innerHTML = (state.shared.hospitals || []).map(h => `
      <div class="res-item-card" onclick="window.zoomToHospital('${h.id}')" style="cursor: pointer;">
        <div class="res-name">
          <span>${h.name}</span>
          <span style="font-size: 0.75rem; color: #34d399;">${h.status}</span>
        </div>
        <div class="res-detail-row">
          <span>Beds: <strong>${h.beds}</strong></span>
          <span>ICU: <strong>${h.icu}</strong></span>
          <span>Blood: <strong>${h.blood}</strong></span>
        </div>
      </div>
    `).join("");
  }

  if (shelList) {
    shelList.innerHTML = (state.shared.shelters || []).map(s => `
      <div class="res-item-card" onclick="window.zoomToShelter('${s.id}')" style="cursor: pointer;">
        <div class="res-name">
          <span>${s.name}</span>
          <span style="font-size: 0.75rem; color: #fbbf24;">${s.occ}/${s.capacity}</span>
        </div>
        <div class="res-detail-row">
          <span>Water: <strong>${s.water}</strong></span>
          <span>Food: <strong>${s.food}</strong></span>
          <span>Power: <strong>${s.pwr || 'Active'}</strong></span>
        </div>
      </div>
    `).join("");
  }
}

window.zoomToHospital = (id) => {
  const h = state.shared.hospitals.find(i => i.id === id);
  if (!h || !state.realMap) return;
  state.realMap.flyTo([h.lat, h.lng], 16, { duration: 1 });
  openHospitalDrawer(h);
};

window.zoomToShelter = (id) => {
  const s = state.shared.shelters.find(i => i.id === id);
  if (!s || !state.realMap) return;
  state.realMap.flyTo([s.lat, s.lng], 16, { duration: 1 });
  openShelterDrawer(s);
};

// Console Sidebar Tabs
function initConsoleTabs() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      const tab = btn.getAttribute("data-tab");
      document.getElementById(`pane-${tab}`)?.classList.add("active");
    });
  });

  // Search filter
  document.getElementById("search-incidents")?.addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase();
    const cards = document.querySelectorAll("#incident-list .incident-item-card");
    cards.forEach(card => {
      card.style.display = card.textContent.toLowerCase().includes(q) ? "block" : "none";
    });
  });
}

// AI Situational Intelligence Engine
function initAIEngine() {
  const btnRun = document.getElementById("btn-run-ai");
  const input = document.getElementById("ai-input-text");

  btnRun?.addEventListener("click", () => {
    const text = input.value.trim();
    if (!text) return;
    runAIClassification(text);
  });

  document.querySelectorAll(".sample-pill").forEach(p => {
    p.addEventListener("click", () => {
      input.value = p.getAttribute("data-msg");
      runAIClassification(input.value);
    });
  });
}

function runAIClassification(text) {
  const lower = text.toLowerCase();
  let urgency = "MEDIUM (P3)";
  let category = "General Relief Alert";
  let people = "1-2 Reported";
  let location = "Sector 4 (River Basin)";
  let recommendation = "Dispatch standard civil defense reconnaissance patrol.";
  let dedupeCount = 1;

  if (lower.includes("trap") || lower.includes("flood") || lower.includes("water") || lower.includes("rising")) {
    urgency = "CRITICAL (P1)";
    category = "Water Rescue & Evacuation";
    people = "3+ Trapped Citizens";
    location = "Sector 4 (River Road 42)";
    recommendation = "Deploy Boat Rescue Unit 1 & high-clearance amphibious carrier immediately.";
    dedupeCount = 14;
  } else if (lower.includes("bridge") || lower.includes("crack") || lower.includes("wire") || lower.includes("power")) {
    urgency = "HIGH (P2)";
    category = "Infrastructure & Electrical Hazard";
    people = "Public Roadway Blocked";
    location = "Sector 4 Bridge Corridor";
    recommendation = "Deploy traffic barrier units and notify grid authorities of live sparking cables.";
    dedupeCount = 87;
  } else if (lower.includes("shelter") || lower.includes("fuel") || lower.includes("water") || lower.includes("elderly")) {
    urgency = "HIGH (P2)";
    category = "Critical Shelter Logistics Deficit";
    people = "120+ Shelter Occupants";
    location = "Sector 4 High School Shelter";
    recommendation = "Dispatch 500L emergency potable water trailer and mobile diesel generator.";
    dedupeCount = 6;
  }

  const tagsRow = document.getElementById("ai-tags-row");
  const summaryText = document.getElementById("ai-summary-text");
  const dedupeNote = document.getElementById("ai-dedupe-note");

  if (tagsRow) {
    tagsRow.innerHTML = `
      <span class="ai-tag tag-urgent">${urgency}</span>
      <span class="ai-tag tag-cat">${category}</span>
      <span class="ai-tag tag-people">${people}</span>
      <span class="ai-tag tag-loc">${location}</span>
    `;
  }
  if (summaryText) summaryText.innerHTML = `<strong>Recommended Action:</strong> ${recommendation}`;
  if (dedupeNote) {
    dedupeNote.innerHTML = `
      <span class="dedupe-icon">🔍</span>
      <span><strong>AI Duplicate Detector:</strong> Grouped <strong>${dedupeCount} incoming distress reports</strong> in a 300m radius into this single incident record.</span>
    `;
  }

  showToast(`AI classified as ${urgency} — Action plan ready for tactical dispatch`, "✨");
}
