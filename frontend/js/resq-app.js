/**
 * ResQ Citizen App Logic — Real-Time Leaflet Map, Python FastAPI Integration, WebSockets & iOS UI
 */

const API_BASE = window.location.origin;

const appState = {
  isOnline: true,
  offlineQueue: JSON.parse(localStorage.getItem("resq_offline_queue") || "[]"),
  userLocation: [37.7749, -122.4194],
  map: null,
  layerGroups: {
    quakes: null,
    sos: null,
    shelters: null,
    floods: null,
    nodes: null
  },
  activeLayers: {
    quakes: true,
    sos: true,
    shelters: true,
    floods: true,
    nodes: true
  },
  countdownTimer: null,
  sirenAudioCtx: null,
  sirenOsc: null,
  isSirenPlaying: false,
  ws: null
};

document.addEventListener("DOMContentLoaded", () => {
  initRealtimeMap();
  initWebSocket();
  loadLiveDisasters();
  loadIncidents();
  loadShelters();
  loadAlerts();
  initSosHandlers();
  initOfflineMode();
  initEmergencyTools();
  initAITriage();
  initRightPaneTabs();
  updateOfflineQueueCard();
});

// Toast Helper (iOS Dark Pill Style)
function showToast(message, icon = "ℹ️") {
  const container = document.getElementById("toast-wrapper");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = "ios-toast";
  toast.innerHTML = `<span style="font-size: 1.15rem;">${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-10px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ==========================================================================
// 1. REAL-TIME LEAFLET DISASTER MAP (CartoDB Light Tiles)
// ==========================================================================

function initRealtimeMap() {
  const mapEl = document.getElementById("disaster-leaflet-map");
  if (!mapEl) return;

  // Initialize map centered on user
  appState.map = L.map("disaster-leaflet-map", {
    center: appState.userLocation,
    zoom: 13,
    zoomControl: false
  });

  // iOS-style Zoom Control at bottom right
  L.control.zoom({ position: "bottomright" }).addTo(appState.map);

  // CartoDB Positron Light Tiles (Crisp, modern, high-contrast light theme)
  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> | AegisLink Emergency Grid',
    maxZoom: 19
  }).addTo(appState.map);

  // Layer groups for toggle filtering
  appState.layerGroups.quakes = L.layerGroup().addTo(appState.map);
  appState.layerGroups.sos = L.layerGroup().addTo(appState.map);
  appState.layerGroups.shelters = L.layerGroup().addTo(appState.map);
  appState.layerGroups.floods = L.layerGroup().addTo(appState.map);
  appState.layerGroups.nodes = L.layerGroup().addTo(appState.map);

  // User "You Are Here" Marker (Pulsing Apple Blue Dot)
  const userIcon = L.divIcon({
    className: "user-gps-marker",
    html: `
      <div style="position: relative; width: 22px; height: 22px;">
        <div style="position: absolute; width: 22px; height: 22px; border-radius: 50%; background: rgba(0, 122, 255, 0.3); animation: user-pulse 2s infinite;"></div>
        <div style="position: absolute; top: 4px; left: 4px; width: 14px; height: 14px; border-radius: 50%; background: #007aff; border: 2px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  });
  L.marker(appState.userLocation, { icon: userIcon })
    .addTo(appState.map)
    .bindPopup("<strong>You Are Here</strong><br/>Sector 4 River Road Balcony<br/>GPS Accuracy ±4m");

  // Add Flood Surge Hazard Polygon
  const floodPoly = L.polygon([
    [37.7780, -122.4280],
    [37.7820, -122.4140],
    [37.7720, -122.4080],
    [37.7660, -122.4180]
  ], {
    color: "#ff3b30",
    fillColor: "#ff3b30",
    fillOpacity: 0.15,
    weight: 2,
    dashArray: "6, 6"
  });
  floodPoly.bindPopup("<strong>⚠️ River Basin Flood Inundation Zone</strong><br/>Water level: 4.82m (+18 cm/hr). Mandatory evacuation in effect.");
  appState.layerGroups.floods.addLayer(floodPoly);

  // Layer filter button handlers
  document.querySelectorAll(".map-layer-pill").forEach(pill => {
    pill.addEventListener("click", () => {
      const layerKey = pill.getAttribute("data-layer");
      appState.activeLayers[layerKey] = !appState.activeLayers[layerKey];
      pill.classList.toggle("active", appState.activeLayers[layerKey]);

      if (appState.activeLayers[layerKey]) {
        appState.map.addLayer(appState.layerGroups[layerKey]);
      } else {
        appState.map.removeLayer(appState.layerGroups[layerKey]);
      }
    });
  });

  // Recenter button
  document.getElementById("btn-recenter-map")?.addEventListener("click", () => {
    appState.map.setView(appState.userLocation, 14, { animate: true });
    showToast("Map re-centered on your GPS position", "📍");
  });

  // Close Drawer
  document.getElementById("btn-close-drawer")?.addEventListener("click", () => {
    document.getElementById("map-drawer")?.classList.remove("open");
  });
}

function openDrawer(headline, description, actionsHtml = "") {
  const drawer = document.getElementById("map-drawer");
  const headEl = document.getElementById("drawer-headline");
  const descEl = document.getElementById("drawer-description");
  const actEl = document.getElementById("drawer-action-buttons");
  if (!drawer || !headEl || !descEl) return;

  headEl.innerHTML = headline;
  descEl.innerHTML = description;
  if (actEl) actEl.innerHTML = actionsHtml;

  drawer.classList.add("open");
}

// ==========================================================================
// 2. REAL-TIME DATA LOADERS (PYTHON FASTAPI + USGS API)
// ==========================================================================

async function loadLiveDisasters() {
  try {
    const res = await fetch(`${API_BASE}/api/disasters/live`);
    const data = await res.json();
    const countEl = document.getElementById("quake-count-text");
    if (countEl) countEl.textContent = `USGS: ${data.count} Live Events`;

    appState.layerGroups.quakes.clearLayers();

    data.disasters.forEach(d => {
      const isQuake = d.type === "Earthquake";
      const icon = L.divIcon({
        className: "quake-marker",
        html: `
          <div style="background-color: ${isQuake ? '#ff3b30' : '#ff9500'}; color: #ffffff; font-weight: 800; font-size: 10px; border-radius: 12px; padding: 2px 6px; box-shadow: 0 2px 6px rgba(0,0,0,0.3); border: 1.5px solid #ffffff; white-space: nowrap;">
            ${isQuake ? `M ${d.mag}` : '⚠️ Surge'}
          </div>
        `,
        iconAnchor: [16, 10]
      });

      const marker = L.marker([d.lat, d.lng], { icon: icon });
      marker.on("click", () => {
        openDrawer(
          `<span style="color: #ff3b30;">🌋 ${d.title}</span>`,
          `<strong>Source:</strong> ${d.source}<br/><strong>Coordinates:</strong> ${d.lat.toFixed(4)}°, ${d.lng.toFixed(4)}°<br/><strong>Depth:</strong> ${d.depth_km} km<br/><strong>Reported:</strong> ${new Date(d.time).toLocaleTimeString()}`,
          `<button class="ios-pill-btn primary" onclick="showToast('Civil defense alert pushed for this region', '📢')">Notify Sector</button>`
        );
      });
      appState.layerGroups.quakes.addLayer(marker);
    });
  } catch (err) {
    console.warn("Live disasters fetch fallback:", err);
  }
}

async function loadIncidents() {
  try {
    const res = await fetch(`${API_BASE}/api/incidents`);
    const data = await res.json();
    renderIncidents(data.incidents);
  } catch (err) {
    console.error(err);
  }
}

function renderIncidents(incidents) {
  const countEl = document.getElementById("count-incidents");
  const listEl = document.getElementById("incident-feed-list");
  if (countEl) countEl.textContent = incidents.length;

  appState.layerGroups.sos.clearLayers();

  if (listEl) {
    listEl.innerHTML = incidents.map(inc => `
      <div class="incident-row-card" onclick="zoomToCoord(${inc.lat}, ${inc.lng}, '${inc.id}')">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <strong style="font-size: 0.85rem; color: #1c1c1e;">#${inc.id}</strong>
          <span class="${inc.urgency.includes('P1') ? 'inc-badge-p1' : 'inc-badge-p2'}">${inc.urgency}</span>
        </div>
        <div style="font-size: 0.8125rem; font-weight: 700; color: #1c1c1e; margin-bottom: 2px;">${inc.type}</div>
        <div style="font-size: 0.72rem; color: #636366; margin-bottom: 4px;">📍 ${inc.location_name || 'Sector 4'} · ${inc.people} Victims Trapped</div>
        <div style="font-size: 0.72rem; color: #007aff; font-weight: 600;">🚑 ${inc.responder} (${inc.responder_status})</div>
      </div>
    `).join("");
  }

  // Add pins to Leaflet Map
  incidents.forEach(inc => {
    const sosIcon = L.divIcon({
      className: "sos-beacon-marker",
      html: `
        <div style="position: relative; width: 24px; height: 24px;">
          <div style="position: absolute; width: 24px; height: 24px; border-radius: 50%; background: rgba(255, 59, 48, 0.4); animation: apple-pulse 1.8s infinite;"></div>
          <div style="position: absolute; top: 4px; left: 4px; width: 16px; height: 16px; border-radius: 50%; background: #ff3b30; color: white; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: 900; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">SOS</div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    const marker = L.marker([inc.lat, inc.lng], { icon: sosIcon });
    marker.on("click", () => {
      openDrawer(
        `🚨 Incident #${inc.id} — ${inc.type}`,
        `<strong>Urgency:</strong> <span style="color:#ff3b30; font-weight:700;">${inc.urgency}</span><br/><strong>Location:</strong> ${inc.location_name}<br/><strong>Victims:</strong> ${inc.people} People Trapped<br/><strong>Details:</strong> ${inc.details}<br/><strong>Assigned Fleet:</strong> ${inc.responder} (${inc.responder_status})`,
        `<button class="ios-pill-btn primary" onclick="updateIncident('${inc.id}', 'On Scene')">Mark On-Scene</button>
         <button class="ios-pill-btn" onclick="updateIncident('${inc.id}', 'Resolved')">Mark Resolved</button>`
      );
    });
    appState.layerGroups.sos.addLayer(marker);
  });
}

window.zoomToCoord = (lat, lng, incId) => {
  appState.map.setView([lat, lng], 15, { animate: true });
  showToast(`Focused on Incident #${incId}`, "🔍");
};

async function updateIncident(incidentId, newStatus) {
  try {
    await fetch(`${API_BASE}/api/incidents/${incidentId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: newStatus,
        responder_status: newStatus === "Resolved" ? "Standing By" : "On-Scene"
      })
    });
    document.getElementById("map-drawer")?.classList.remove("open");
    showToast(`Incident #${incidentId} status updated to: ${newStatus}`, "✅");
    loadIncidents();
  } catch (err) {
    showToast("Failed to update status", "⚠️");
  }
}

async function loadShelters() {
  try {
    const res = await fetch(`${API_BASE}/api/shelters`);
    const data = await res.json();
    renderShelters(data.shelters);
  } catch (err) {
    console.error(err);
  }
}

function renderShelters(shelters) {
  const feedEl = document.getElementById("shelter-feed-list");
  if (!feedEl) return;

  appState.layerGroups.shelters.clearLayers();

  feedEl.innerHTML = shelters.map(s => {
    const pct = Math.round((s.occupancy / s.capacity) * 100);
    const color = pct >= 85 ? "#ff3b30" : (pct >= 70 ? "#ff9500" : "#34c759");

    return `
      <div class="shelter-row-item">
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
          <strong style="font-size: 0.85rem; color: #1c1c1e;">${s.name}</strong>
          <span style="font-size: 0.72rem; color: ${color}; font-weight: 700;">${s.occupancy}/${s.capacity} (${pct}%)</span>
        </div>
        <div style="font-size: 0.72rem; color: #636366;">${s.sector} · ${s.status}</div>
        <div class="shelter-meter">
          <div class="meter-fill" style="width: ${pct}%; background-color: ${color};"></div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
          <span style="font-size: 0.72rem; color: #34c759; font-weight: 600;">💧 Water: ${s.water_level} · 🍚 Food: ${s.food_level}</span>
          <button class="ios-pill-btn" style="padding: 4px 10px; font-size: 0.72rem;" onclick="reserveBed('${s.id}')">Reserve Bed</button>
        </div>
      </div>
    `;
  }).join("");

  // Add shelter markers to map
  shelters.forEach(s => {
    const sIcon = L.divIcon({
      className: "shelter-pin",
      html: `
        <div style="background-color: #34c759; color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px; font-weight: 800; border: 1.5px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.25); white-space: nowrap;">
          🏠 ${s.name.split(' ')[0]}
        </div>
      `,
      iconAnchor: [20, 10]
    });

    const marker = L.marker([s.lat, s.lng], { icon: sIcon });
    marker.on("click", () => {
      const pct = Math.round((s.occupancy / s.capacity) * 100);
      openDrawer(
        `🏠 ${s.name} (${s.sector})`,
        `<strong>Capacity:</strong> ${s.occupancy} / ${s.capacity} (${pct}% Occupancy)<br/><strong>Water Rations:</strong> ${s.water_level}<br/><strong>Food Supply:</strong> ${s.food_level}<br/><strong>Medical Team:</strong> ${s.medical_available ? 'Available' : 'None'}<br/><strong>Status:</strong> ${s.status}`,
        `<button class="ios-pill-btn primary" onclick="reserveBed('${s.id}')">Reserve Evacuation Bed</button>`
      );
    });
    appState.layerGroups.shelters.addLayer(marker);
  });
}

window.reserveBed = async (shelterId) => {
  try {
    const res = await fetch(`${API_BASE}/api/shelters/${shelterId}/reserve?count=2`, { method: "POST" });
    if (res.ok) {
      showToast("Evacuation bed reserved for 2 people", "🏠");
      loadShelters();
    }
  } catch (err) {
    showToast("Reservation failed", "⚠️");
  }
};

async function loadAlerts() {
  try {
    const res = await fetch(`${API_BASE}/api/alerts`);
    const data = await res.json();
    const listEl = document.getElementById("alerts-preview-list");
    if (listEl) {
      listEl.innerHTML = data.alerts.map(a => `
        <div style="background: #ffffff; border: 1px solid var(--ios-border); border-radius: 8px; padding: 8px 10px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
            <strong style="color: #ff3b30; font-size: 0.75rem;">${a.tier}</strong>
            <span style="color: #8e8e93; font-size: 0.68rem;">${a.timestamp}</span>
          </div>
          <p style="color: #1c1c1e; margin: 0; line-height: 1.3;">${a.title}</p>
        </div>
      `).join("");
    }
  } catch (err) {}
}

// ==========================================================================
// 3. WEBSOCKET REAL-TIME SYNC
// ==========================================================================

function initWebSocket() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws/live`;

  try {
    appState.ws = new WebSocket(wsUrl);
    appState.ws.onopen = () => {
      console.log("WebSocket connected to AegisLink live channel");
    };
    appState.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.event === "NEW_SOS") {
        showToast(`🚨 NEW EMERGENCY DISTRESS BEACON: ${msg.data.category} in ${msg.data.location}`, "🆘");
        loadIncidents();
      } else if (msg.event === "INCIDENT_UPDATED") {
        loadIncidents();
      } else if (msg.event === "SHELTER_UPDATED") {
        loadShelters();
      }
    };
    appState.ws.onclose = () => {
      setTimeout(initWebSocket, 3000);
    };
  } catch (e) {
    console.warn("WebSocket init error:", e);
  }
}

// ==========================================================================
// 4. SOS EMERGENCY TRANSMISSION & COUNTDOWN
// ==========================================================================

function initSosHandlers() {
  const btnSos = document.getElementById("btn-master-sos");
  const modalCountdown = document.getElementById("sos-countdown-modal");
  const digitEl = document.getElementById("countdown-digit");
  const btnAbort = document.getElementById("btn-abort-countdown");

  btnSos?.addEventListener("click", () => {
    modalCountdown.style.display = "flex";
    let count = 3;
    digitEl.textContent = "3";
    playBeep(440, 0.1);

    appState.countdownTimer = setInterval(() => {
      count--;
      if (count > 0) {
        digitEl.textContent = String(count);
        playBeep(440 + (3 - count) * 200, 0.1);
      } else {
        clearInterval(appState.countdownTimer);
        modalCountdown.style.display = "none";
        dispatchSOS({
          category: "Master 1-Tap SOS",
          lat: appState.userLocation[0],
          lng: appState.userLocation[1],
          location_name: "Sector 4 (River Road Balcony)",
          people: 2,
          hazard: "Flash Flood Surge (+18cm/h)",
          details: "Master 1-Tap distress beacon broadcasted by citizen.",
          injuries: "Potential Trauma"
        });
      }
    }, 1000);
  });

  btnAbort?.addEventListener("click", () => {
    clearInterval(appState.countdownTimer);
    modalCountdown.style.display = "none";
    showToast("SOS Beacon Cancelled (False Alarm)", "🛑");
  });

  // Category buttons trigger specific dialog
  document.querySelectorAll(".cat-button").forEach(btn => {
    btn.addEventListener("click", () => {
      const cat = btn.getAttribute("data-cat");
      openReportDialog(cat);
    });
  });

  // Modal Dialog Form
  const dialog = document.getElementById("sos-report-dialog");
  document.getElementById("btn-close-modal")?.addEventListener("click", () => dialog.style.display = "none");
  document.getElementById("btn-cancel-modal")?.addEventListener("click", () => dialog.style.display = "none");

  document.getElementById("form-submit-sos")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const cat = document.getElementById("field-category")?.value;
    const people = parseInt(document.getElementById("field-people")?.value || "1");
    const injuries = document.getElementById("field-injuries")?.value;
    const location = document.getElementById("field-location")?.value;
    const details = document.getElementById("field-details")?.value;

    dispatchSOS({
      category: cat,
      lat: appState.userLocation[0] + (Math.random() - 0.5) * 0.005,
      lng: appState.userLocation[1] + (Math.random() - 0.5) * 0.005,
      location_name: location,
      people: people,
      hazard: "Environmental Disaster",
      details: details,
      injuries: injuries
    });

    dialog.style.display = "none";
  });

  // "I Am Safe" Button
  const btnSafe = document.getElementById("btn-iam-safe");
  btnSafe?.addEventListener("click", async () => {
    btnSafe.textContent = "✓ SAFE BROADCASTED";
    btnSafe.style.backgroundColor = "#15803d";
    document.getElementById("fam-status-text").textContent = "3 Verified Safe · 0 Unknown";
    showToast("Safety beacon broadcasted across cloud and LoRa mesh to family!", "👨‍👩‍👧‍👦");
    try {
      await fetch(`${API_BASE}/api/family/FAM-01/safe`, { method: "POST" });
    } catch (e) {}
  });

  // Checklists
  document.querySelectorAll(".kit-chk").forEach(chk => {
    chk.addEventListener("change", () => {
      const total = document.querySelectorAll(".kit-chk").length;
      const checked = document.querySelectorAll(".kit-chk:checked").length;
      document.getElementById("chk-progress").textContent = `${checked} / ${total} Ready`;
    });
  });
}

function openReportDialog(categoryName) {
  const dialog = document.getElementById("sos-report-dialog");
  const title = document.getElementById("modal-title-text");
  const select = document.getElementById("field-category");
  if (!dialog) return;

  if (title) title.textContent = `🚨 Report: ${categoryName}`;
  if (select && categoryName) select.value = categoryName;

  dialog.style.display = "flex";
}

async function dispatchSOS(payload) {
  if (appState.isOnline) {
    try {
      const res = await fetch(`${API_BASE}/api/sos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      showToast(`🆘 EMERGENCY BROADCAST TRANSMITTED! Unit assigned to #${data.incident_id}`, "🚨");
      loadIncidents();
    } catch (e) {
      queueOffline(payload);
    }
  } else {
    queueOffline(payload);
  }
}

function queueOffline(payload) {
  payload.id = `OFFLINE-${intTimestamp()}`;
  payload.offline_sync = true;
  appState.offlineQueue.push(payload);
  localStorage.setItem("resq_offline_queue", JSON.stringify(appState.offlineQueue));
  updateOfflineQueueCard();
  showToast("⚠️ Stored locally in phone storage. Relaying via Aegis Node #014 LoRa Mesh...", "📴");
}

function intTimestamp() {
  return Math.floor(Date.now() / 1000) % 10000;
}

// ==========================================================================
// 5. OFFLINE EMERGENCY MESH SWITCHER
// ==========================================================================

function initOfflineMode() {
  const btnToggle = document.getElementById("btn-net-toggle");
  const label = document.getElementById("net-badge-label");
  const banner = document.getElementById("mesh-offline-banner");
  const btnRestore = document.getElementById("btn-restore-net");
  const btnSync = document.getElementById("btn-sync-offline-now");

  btnToggle?.addEventListener("click", () => toggleNetwork());
  btnRestore?.addEventListener("click", () => toggleNetwork(true));
  btnSync?.addEventListener("click", () => syncOffline());
}

function toggleNetwork(forceOnline = false) {
  const btnToggle = document.getElementById("btn-net-toggle");
  const label = document.getElementById("net-badge-label");
  const banner = document.getElementById("mesh-offline-banner");

  appState.isOnline = forceOnline ? true : !appState.isOnline;

  if (appState.isOnline) {
    btnToggle.className = "net-status-badge online";
    label.textContent = "Online";
    banner.style.display = "none";
    showToast("Internet restored. Central backend connected.", "📶");
    if (appState.offlineQueue.length > 0) syncOffline();
  } else {
    btnToggle.className = "net-status-badge offline";
    label.textContent = "LoRa Mesh";
    banner.style.display = "flex";
    showToast("Cellular off! ResQ switched to Autonomous BLE/LoRa Mesh Mode.", "⚠️");
  }
}

async function syncOffline() {
  if (appState.offlineQueue.length === 0) return;
  const count = appState.offlineQueue.length;
  showToast(`Syncing ${count} offline reports to Python backend...`, "🔄");

  try {
    const res = await fetch(`${API_BASE}/api/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reports: appState.offlineQueue })
    });
    if (res.ok) {
      appState.offlineQueue = [];
      localStorage.removeItem("resq_offline_queue");
      updateOfflineQueueCard();
      showToast(`✓ All ${count} offline reports synchronized!`, "✅");
      loadIncidents();
    }
  } catch (err) {
    showToast("Sync failed: Backend unreachable", "⚠️");
  }
}

function updateOfflineQueueCard() {
  const card = document.getElementById("offline-queue-card");
  const text = document.getElementById("queue-count-text");
  if (!card || !text) return;

  const count = appState.offlineQueue.length;
  if (count > 0) {
    card.style.display = "block";
    text.textContent = `${count} Emergency Report${count > 1 ? 's' : ''} Queued in Phone`;
  } else {
    card.style.display = "none";
  }
}

// ==========================================================================
// 6. EMERGENCY ACOUSTIC SIREN (Web Audio API) & STROBE
// ==========================================================================

function initEmergencyTools() {
  const btnSiren = document.getElementById("btn-siren-tool");
  const btnStrobe = document.getElementById("btn-strobe-tool");
  const strobeScreen = document.getElementById("strobe-screen");
  const btnStopStrobe = document.getElementById("btn-stop-strobe");

  btnSiren?.addEventListener("click", () => toggleSiren());

  btnStrobe?.addEventListener("click", () => {
    strobeScreen.style.display = "flex";
    runStrobeAnimation();
  });

  btnStopStrobe?.addEventListener("click", () => {
    strobeScreen.style.display = "none";
  });
}

function toggleSiren() {
  const btnSiren = document.getElementById("btn-siren-tool");
  if (appState.isSirenPlaying) {
    if (appState.sirenOsc) {
      appState.sirenOsc.stop();
      appState.sirenOsc.disconnect();
      appState.sirenOsc = null;
    }
    appState.isSirenPlaying = false;
    btnSiren.classList.remove("active-danger");
    btnSiren.innerHTML = `<span>🚨 Siren</span>`;
    showToast("Emergency siren silenced", "🔇");
  } else {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!appState.sirenAudioCtx) appState.sirenAudioCtx = new AudioCtx();
      if (appState.sirenAudioCtx.state === "suspended") appState.sirenAudioCtx.resume();

      const ctx = appState.sirenAudioCtx;
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

      appState.sirenOsc = osc;
      appState.isSirenPlaying = true;
      btnSiren.classList.add("active-danger");
      btnSiren.innerHTML = `<span>🛑 Stop Siren</span>`;
      showToast("Loud oscillating rescue siren active!", "🚨");
    } catch (e) {
      showToast("Browser blocked audio", "⚠️");
    }
  }
}

function runStrobeAnimation() {
  const screen = document.getElementById("strobe-screen");
  if (!screen || screen.style.display === "none") return;
  const isWhite = screen.style.backgroundColor === "rgb(255, 255, 255)";
  screen.style.backgroundColor = isWhite ? "#000000" : "#ffffff";
  screen.style.color = isWhite ? "#ffffff" : "#000000";
  setTimeout(runStrobeAnimation, 120);
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
// 7. PYTHON AI NLP TRIAGE CONSOLE
// ==========================================================================

function initAITriage() {
  const btnRun = document.getElementById("btn-run-nlp");
  const input = document.getElementById("ai-test-input");
  const output = document.getElementById("ai-nlp-output");

  btnRun?.addEventListener("click", async () => {
    const text = input?.value.trim();
    if (!text) {
      showToast("Please enter a distress message to analyze", "⚠️");
      return;
    }

    btnRun.textContent = "Analyzing with Python NLP...";
    try {
      const res = await fetch(`${API_BASE}/api/ai/triage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text, lat: appState.userLocation[0], lng: appState.userLocation[1] })
      });
      const data = await res.json();
      btnRun.textContent = "Analyze with Python AI Engine";

      if (output) {
        output.style.display = "block";
        const a = data.analysis;
        const d = data.duplicate_detection;
        output.innerHTML = `
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <strong style="color: #007aff;">${a.category}</strong>
            <span style="background: rgba(255, 59, 48, 0.12); color: #ff3b30; font-weight: 800; padding: 2px 6px; border-radius: 4px;">${a.urgency}</span>
          </div>
          <div style="margin-bottom: 4px;"><strong>Victims:</strong> ${a.estimated_victims} · <strong>Hazard:</strong> ${a.hazard_type}</div>
          <div style="margin-bottom: 6px;"><strong>Action Plan:</strong> ${a.action_plan}</div>
          <div style="background: #fff7ed; border: 1px solid #fed7aa; color: #9a3412; padding: 6px; border-radius: 6px; font-size: 0.72rem;">
            <strong>Duplicate Detection:</strong> ${d.recommendation} (${d.duplicate_count} cluster reports)
          </div>
        `;
      }
      showToast("Python AI Triage & Duplicate analysis complete", "✨");
    } catch (e) {
      btnRun.textContent = "Analyze with Python AI Engine";
      showToast("AI Service error", "⚠️");
    }
  });
}

function initRightPaneTabs() {
  document.querySelectorAll(".segment-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".segment-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".right-tab-pane").forEach(p => p.style.display = "none");
      btn.classList.add("active");
      const target = btn.getAttribute("data-pane");
      const targetPane = document.getElementById(target);
      if (targetPane) targetPane.style.display = "block";
    });
  });
}
