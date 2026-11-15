/**
 * AegisLink — Master Application Logic & Interactive Engines
 * Features:
 *  1. Interactive Tactical GIS Disaster Map (Canvas engine with layer filters, markers, popups)
 *  2. AI Incident Intelligence & Deduplication Classifier
 *  3. ResQ Citizen Mobile Simulator (Offline Mesh vs Online mode, local storage queuing, 1-tap SOS)
 *  4. Deployable Aegis Node Packet Hop Visualizer
 *  5. Disaster Lifecycle Tabs & Resource Balancers
 */

// Application State
const state = {
  isOnline: true,
  offlineQueue: [],
  activeLayerFilters: {
    sos: true,
    hospitals: true,
    shelters: true,
    nodes: true,
    hazards: true,
    responders: true
  },
  mapZoom: 1,
  mapOffset: { x: 0, y: 0 },
  selectedMarker: null,
  activeIncidents: [
    {
      id: "SOS-182",
      type: "Medical + Water Trap",
      urgency: "CRITICAL (P1)",
      sector: "Sector 4 (River Rd)",
      lat: 0.35,
      lng: 0.42,
      people: 3,
      status: "In Progress",
      details: "Elderly female with compound fracture, 2 trapped on 2nd floor, water rising at +18cm/h.",
      responder: "Boat Rescue Unit 1",
      responderStatus: "En Route (ETA: 4 min)"
    },
    {
      id: "SOS-183",
      type: "Structural Collapse",
      urgency: "CRITICAL (P1)",
      sector: "Sector 2 (Warehouse B)",
      lat: 0.22,
      lng: 0.65,
      people: 5,
      status: "Dispatched",
      details: "Roof partially caved in. Acoustic sensors detect tapping on pipes.",
      responder: "USAR Heavy Squad 4",
      responderStatus: "En Route"
    },
    {
      id: "SOS-184",
      type: "Fire Hazard",
      urgency: "HIGH (P2)",
      sector: "Sector 6 (Industrial Ave)",
      lat: 0.68,
      lng: 0.28,
      people: 0,
      status: "On Scene",
      details: "Substation transformer explosion with spreading chemical smoke.",
      responder: "Hazmat Engine 12",
      responderStatus: "Suppressing"
    },
    {
      id: "SOS-185",
      type: "Relief Supply Request",
      urgency: "MEDIUM (P3)",
      sector: "Sector 3 (Elderly Home)",
      lat: 0.52,
      lng: 0.78,
      people: 38,
      status: "Queued",
      details: "Need 200L clean drinking water and baby formula. Power restored via solar.",
      responder: "Red Cross Van 02",
      responderStatus: "Staged"
    }
  ],
  hospitals: [
    { id: "HOSP-01", name: "Metro General Hospital", sector: "Sector 1", lat: 0.18, lng: 0.25, beds: 14, icu: 3, blood: "O- Low", status: "Operational" },
    { id: "HOSP-02", name: "St. Jude Trauma Center", sector: "Sector 5", lat: 0.72, lng: 0.55, beds: 6, icu: 1, blood: "Stable", status: "Critical Surge" },
    { id: "HOSP-03", name: "Mercy Field Clinic", sector: "Sector 7", lat: 0.82, lng: 0.82, beds: 28, icu: 5, blood: "Optimal", status: "Operational" }
  ],
  shelters: [
    { id: "SHEL-01", name: "West High School Arena", sector: "Sector 4", lat: 0.42, lng: 0.32, capacity: 500, occ: 427, water: "LOW", food: "MED", pwr: "Solar Gen" },
    { id: "SHEL-02", name: "Civic Community Center", sector: "Sector 2", lat: 0.28, lng: 0.78, capacity: 750, occ: 610, water: "GOOD", food: "GOOD", pwr: "Grid Active" },
    { id: "SHEL-03", name: "North Pavilion Sports Hall", sector: "Sector 1", lat: 0.12, lng: 0.45, capacity: 400, occ: 215, water: "GOOD", food: "GOOD", pwr: "Battery" },
    { id: "SHEL-04", name: "Harbor Maritime Terminal", sector: "Sector 8", lat: 0.88, lng: 0.35, capacity: 1200, occ: 950, water: "MED", food: "LOW", pwr: "Generator" }
  ],
  meshNodes: [
    { id: "NODE-014", name: "Aegis M-1 #014", sector: "Sector 4", lat: 0.38, lng: 0.39, batt: "94%", meshHop: "Gateway Direct", rssi: "-72 dBm" },
    { id: "NODE-022", name: "Aegis M-1 #022", sector: "Sector 3", lat: 0.48, lng: 0.62, batt: "88%", meshHop: "2 Hops", rssi: "-81 dBm" },
    { id: "NODE-031", name: "Aegis M-1 #031", sector: "Sector 2", lat: 0.25, lng: 0.68, batt: "99%", meshHop: "1 Hop", rssi: "-68 dBm" },
    { id: "NODE-042", name: "Aegis M-1 #042", sector: "Sector 6", lat: 0.65, lng: 0.35, batt: "91%", meshHop: "1 Hop", rssi: "-74 dBm" },
    { id: "NODE-050", name: "Aegis M-1 #050", sector: "Sector 7", lat: 0.75, lng: 0.75, batt: "86%", meshHop: "3 Hops", rssi: "-84 dBm" }
  ],
  hazards: [
    { id: "HAZ-01", name: "Flash River Inundation", sector: "Sector 4", lat: 0.36, lng: 0.45, radius: 45, severity: "High Surge" },
    { id: "HAZ-02", name: "Bridge Collapse & Live Lines", sector: "Sector 2", lat: 0.26, lng: 0.62, radius: 25, severity: "Blocked Route" }
  ],
  responders: [
    { id: "RESP-01", name: "Boat Rescue Unit 1", lat: 0.37, lng: 0.40, status: "En Route to SOS-182", icon: "🚤" },
    { id: "RESP-02", name: "Ambulance 04 (ALS)", lat: 0.22, lng: 0.30, status: "Transporting to Metro Gen", icon: "🚑" },
    { id: "RESP-03", name: "USAR Heavy Squad 4", lat: 0.24, lng: 0.60, status: "Arriving Warehouse B", icon: "🚒" },
    { id: "RESP-04", name: "Search & Recon Drone B", lat: 0.45, lng: 0.48, status: "Aerial Thermal Scan", icon: "🛸" }
  ]
};

// ==========================================================================
// INITIALIZATION
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
  initGovernmentGate();
  initClock();
  initTacticalMap();
  initAIEngine();
  initResQSimulator();
  initMeshVisualizer();
  initLifecycleTabs();
  initModalAndForms();
  renderIncidentFeeds();
  renderResourceFeeds();
});

// Government Incident Command Gate Manager
function initGovernmentGate() {
  const sessionStr = localStorage.getItem("aegis_gov_session");
  const lockedState = document.getElementById("gov-locked-state");
  const unlockedState = document.getElementById("gov-unlocked-state");
  const lockOverlay = document.getElementById("console-airgap-lock");
  const officerNameEl = document.getElementById("landing-officer-display");
  const navCmdBtn = document.getElementById("nav-command-btn");
  const heroCmdBtn = document.getElementById("hero-command-btn");

  if (sessionStr) {
    try {
      const officer = JSON.parse(sessionStr);
      if (lockedState) lockedState.style.display = "none";
      if (unlockedState) unlockedState.style.display = "flex";
      if (lockOverlay) lockOverlay.style.display = "none";
      if (officerNameEl) officerNameEl.textContent = `${officer.name} (${officer.agency})`;
      if (navCmdBtn) {
        navCmdBtn.href = "command.html";
        navCmdBtn.innerHTML = `Command Room ↗`;
      }
      if (heroCmdBtn) heroCmdBtn.href = "command.html";
    } catch (e) {
      localStorage.removeItem("aegis_gov_session");
    }
  } else {
    if (lockedState) lockedState.style.display = "flex";
    if (unlockedState) unlockedState.style.display = "none";
    if (lockOverlay) lockOverlay.style.display = "flex";
    if (navCmdBtn) {
      navCmdBtn.href = "command-login.html";
      navCmdBtn.innerHTML = `Command Center 🔒`;
    }
    if (heroCmdBtn) heroCmdBtn.href = "command.html";
  }

  // Quick Instant Demo Unlock on Landing Page
  document.getElementById("btn-quick-unlock-map")?.addEventListener("click", () => {
    const demoOfficer = {
      id: "NDRF-CMD-881",
      name: "Commander Sharma",
      agency: "NDRF 8th Battalion",
      agencyCode: "NDRF",
      badge: "NDRF-CMD-881",
      clearanceLevel: "Level 4 (Tactical Operations)"
    };
    localStorage.setItem("aegis_gov_session", JSON.stringify(demoOfficer));
    initGovernmentGate();
    showToast("Tactical GIS Map Unlocked for Live Demo", "🔓");
  });

  document.getElementById("btn-lock-landing-console")?.addEventListener("click", () => {
    localStorage.removeItem("aegis_gov_session");
    showToast("Command Console Air-Gapped & Locked. Public mode re-engaged.", "🔒");
    initGovernmentGate();
  });
}

// Update phone clock
function initClock() {
  const clockEl = document.getElementById("phone-clock");
  if (!clockEl) return;
  const update = () => {
    const now = new Date();
    const hrs = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    clockEl.textContent = `${hrs}:${mins}`;
  };
  update();
  setInterval(update, 10000);
}

// Toast helper
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
  }, 4000);
}

// ==========================================================================
// 1. TACTICAL GIS DISASTER MAP (Canvas Engine)
// ==========================================================================

let mapCanvas, ctx;
let isDragging = false;
let dragStart = { x: 0, y: 0 };
let animFrameId;

function initTacticalMap() {
  mapCanvas = document.getElementById("tactical-canvas");
  if (!mapCanvas) return;
  ctx = mapCanvas.getContext("2d");

  // Resize canvas according to device pixel ratio
  function resize() {
    const rect = mapCanvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    mapCanvas.width = rect.width * dpr;
    mapCanvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    renderTacticalMap();
  }
  window.addEventListener("resize", resize);
  resize();

  // Layer filter buttons
  document.querySelectorAll(".layer-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const layer = btn.getAttribute("data-layer");
      state.activeLayerFilters[layer] = !state.activeLayerFilters[layer];
      btn.classList.toggle("active", state.activeLayerFilters[layer]);
      renderTacticalMap();
    });
  });

  // Zoom controls
  document.getElementById("btn-zoom-in")?.addEventListener("click", () => {
    state.mapZoom = Math.min(state.mapZoom + 0.2, 2.5);
    renderTacticalMap();
  });
  document.getElementById("btn-zoom-out")?.addEventListener("click", () => {
    state.mapZoom = Math.max(state.mapZoom - 0.2, 0.7);
    renderTacticalMap();
  });
  document.getElementById("btn-reset-view")?.addEventListener("click", () => {
    state.mapZoom = 1;
    state.mapOffset = { x: 0, y: 0 };
    renderTacticalMap();
  });

  // Canvas Mouse Dragging
  mapCanvas.addEventListener("mousedown", (e) => {
    isDragging = true;
    dragStart = { x: e.clientX - state.mapOffset.x, y: e.clientY - state.mapOffset.y };
  });
  window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    state.mapOffset.x = e.clientX - dragStart.x;
    state.mapOffset.y = e.clientY - dragStart.y;
    renderTacticalMap();
  });
  window.addEventListener("mouseup", () => isDragging = false);

  // Canvas Click Detection on Markers
  mapCanvas.addEventListener("click", (e) => {
    const rect = mapCanvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    checkMarkerClick(clickX, clickY, rect.width, rect.height);
  });

  // Close drawer
  document.getElementById("drawer-close-btn")?.addEventListener("click", () => {
    document.getElementById("marker-drawer")?.classList.remove("open");
  });

  // Start radar wave pulse loop
  function loop() {
    renderTacticalMap();
    animFrameId = requestAnimationFrame(loop);
  }
  loop();
}

function renderTacticalMap() {
  if (!ctx || !mapCanvas) return;
  const width = mapCanvas.parentElement.clientWidth;
  const height = mapCanvas.parentElement.clientHeight;

  ctx.save();
  ctx.clearRect(0, 0, width, height);

  // Apply map pan and zoom
  ctx.translate(state.mapOffset.x, state.mapOffset.y);
  ctx.translate(width / 2, height / 2);
  ctx.scale(state.mapZoom, state.mapZoom);
  ctx.translate(-width / 2, -height / 2);

  // 1. Draw Map Background & Grid Lines
  ctx.fillStyle = "#070b13";
  ctx.fillRect(0, 0, width, height);

  // Grid
  ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
  ctx.lineWidth = 1;
  const gridSize = 60;
  for (let x = 0; x < width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // 2. Draw Simulated River Basin & Topography
  ctx.strokeStyle = "rgba(59, 130, 246, 0.25)";
  ctx.lineWidth = 26;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, height * 0.3);
  ctx.bezierCurveTo(width * 0.3, height * 0.25, width * 0.45, height * 0.55, width, height * 0.45);
  ctx.stroke();

  // River Centerline
  ctx.strokeStyle = "rgba(96, 165, 250, 0.4)";
  ctx.lineWidth = 6;
  ctx.stroke();

  // Sector Labels
  ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
  ctx.font = "600 12px Inter";
  for (let i = 1; i <= 8; i++) {
    const sx = ((i - 1) % 4) * (width / 4) + 16;
    const sy = Math.floor((i - 1) / 4) * (height / 2) + 24;
    ctx.fillText(`SECTOR ${i}`, sx, sy);
  }

  // 3. Draw Mesh Network Radio Links
  if (state.activeLayerFilters.nodes) {
    ctx.strokeStyle = "rgba(16, 185, 129, 0.3)";
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.5;
    for (let i = 0; i < state.meshNodes.length - 1; i++) {
      const n1 = state.meshNodes[i];
      const n2 = state.meshNodes[i + 1];
      ctx.beginPath();
      ctx.moveTo(n1.lng * width, n1.lat * height);
      ctx.lineTo(n2.lng * width, n2.lat * height);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  // 4. Draw Hazard Impact Polygons
  if (state.activeLayerFilters.hazards) {
    state.hazards.forEach(haz => {
      const hx = haz.lng * width;
      const hy = haz.lat * height;

      ctx.fillStyle = "rgba(239, 68, 68, 0.14)";
      ctx.strokeStyle = "rgba(239, 68, 68, 0.5)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(hx, hy, haz.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#fca5a5";
      ctx.font = "bold 10px Inter";
      ctx.fillText(haz.name, hx - 30, hy - haz.radius - 6);
    });
  }

  // Time for pulsating animation
  const pulseTime = Date.now() / 400;

  // 5. Draw SOS Incidents
  if (state.activeLayerFilters.sos) {
    state.activeIncidents.forEach((inc) => {
      const ix = inc.lng * width;
      const iy = inc.lat * height;

      // Pulse ring
      const ringRadius = 12 + Math.sin(pulseTime) * 6;
      ctx.strokeStyle = "rgba(239, 68, 68, 0.5)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(ix, iy, ringRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Center Pin
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(ix, iy, 7, 0, Math.PI * 2);
      ctx.fill();

      // Label
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px Inter";
      ctx.fillText(`SOS ${inc.id}`, ix + 10, iy + 4);
    });
  }

  // 6. Draw Hospitals
  if (state.activeLayerFilters.hospitals) {
    state.hospitals.forEach(hosp => {
      const hx = hosp.lng * width;
      const hy = hosp.lat * height;

      ctx.fillStyle = "#3b82f6";
      ctx.beginPath();
      ctx.arc(hx, hy, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#93c5fd";
      ctx.font = "600 10px Inter";
      ctx.fillText(`🏥 ${hosp.name}`, hx + 10, hy + 4);
    });
  }

  // 7. Draw Shelters
  if (state.activeLayerFilters.shelters) {
    state.shelters.forEach(shel => {
      const sx = shel.lng * width;
      const sy = shel.lat * height;

      ctx.fillStyle = "#f59e0b";
      ctx.beginPath();
      ctx.rect(sx - 5, sy - 5, 10, 10);
      ctx.fill();

      ctx.fillStyle = "#fde68a";
      ctx.font = "600 10px Inter";
      ctx.fillText(`🏠 ${shel.name} (${Math.round((shel.occ / shel.capacity) * 100)}%)`, sx + 10, sy + 4);
    });
  }

  // 8. Draw Mesh Nodes
  if (state.activeLayerFilters.nodes) {
    state.meshNodes.forEach(node => {
      const nx = node.lng * width;
      const ny = node.lat * height;

      ctx.fillStyle = "#10b981";
      ctx.beginPath();
      ctx.arc(nx, ny, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#6ee7b7";
      ctx.font = "500 9px JetBrains Mono";
      ctx.fillText(`📡 ${node.id}`, nx + 8, ny + 3);
    });
  }

  // 9. Draw Responders / Fleet
  if (state.activeLayerFilters.responders) {
    state.responders.forEach(resp => {
      const rx = resp.lng * width;
      const ry = resp.lat * height;

      ctx.fillStyle = "#06b6d4";
      ctx.beginPath();
      ctx.arc(rx, ry, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#a5f3fc";
      ctx.font = "600 10px Inter";
      ctx.fillText(`${resp.icon} ${resp.name}`, rx + 10, ry + 4);
    });
  }

  ctx.restore();
}

function checkMarkerClick(clientX, clientY, width, height) {
  // Translate click point back with zoom & offset
  const invX = (clientX - state.mapOffset.x - width / 2) / state.mapZoom + width / 2;
  const invY = (clientY - state.mapOffset.y - height / 2) / state.mapZoom + height / 2;

  // Check SOS
  for (const inc of state.activeIncidents) {
    const ix = inc.lng * width;
    const iy = inc.lat * height;
    const dist = Math.hypot(invX - ix, invY - iy);
    if (dist < 18) {
      openMarkerDrawer("SOS", inc);
      return;
    }
  }

  // Check Hospitals
  for (const hosp of state.hospitals) {
    const hx = hosp.lng * width;
    const hy = hosp.lat * height;
    if (Math.hypot(invX - hx, invY - hy) < 16) {
      openMarkerDrawer("HOSPITAL", hosp);
      return;
    }
  }

  // Check Shelters
  for (const shel of state.shelters) {
    const sx = shel.lng * width;
    const sy = shel.lat * height;
    if (Math.hypot(invX - sx, invY - sy) < 16) {
      openMarkerDrawer("SHELTER", shel);
      return;
    }
  }

  // Check Mesh Nodes
  for (const node of state.meshNodes) {
    const nx = node.lng * width;
    const ny = node.lat * height;
    if (Math.hypot(invX - nx, invY - ny) < 16) {
      openMarkerDrawer("NODE", node);
      return;
    }
  }
}

function openMarkerDrawer(type, item) {
  const drawer = document.getElementById("marker-drawer");
  const title = document.getElementById("drawer-title");
  const body = document.getElementById("drawer-body");
  const actions = document.getElementById("drawer-actions");
  if (!drawer || !title || !body || !actions) return;

  state.selectedMarker = { type, item };

  if (type === "SOS") {
    title.innerHTML = `<span style="color: #ef4444;">🆘 Incident #${item.id}</span> — ${item.type}`;
    body.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
        <div><strong>Priority:</strong> <span style="color: #f87171;">${item.urgency}</span></div>
        <div><strong>Location:</strong> ${item.sector}</div>
        <div><strong>Victims:</strong> ${item.people} People Trapped</div>
        <div><strong>Status:</strong> ${item.status}</div>
      </div>
      <p style="margin-bottom: 6px;"><strong>Details:</strong> ${item.details}</p>
      <p><strong>Assigned Unit:</strong> ${item.responder} (${item.responderStatus})</p>
    `;
    actions.innerHTML = `
      <button class="btn-pill btn-pill-danger btn-sm" onclick="window.dispatchUnit('${item.id}')">Dispatch Additional Unit</button>
      <button class="btn-pill btn-pill-ghost btn-sm" onclick="window.markResolved('${item.id}')">Mark Resolved</button>
    `;
  } else if (type === "HOSPITAL") {
    title.innerHTML = `🏥 ${item.name} (${item.sector})`;
    body.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
        <div><strong>Trauma Beds:</strong> ${item.beds} Available</div>
        <div><strong>ICU Units:</strong> ${item.icu} Open</div>
        <div><strong>Blood Bank:</strong> ${item.blood}</div>
        <div><strong>Status:</strong> <span style="color: #60a5fa;">${item.status}</span></div>
      </div>
    `;
    actions.innerHTML = `
      <button class="btn-pill btn-pill-dark btn-sm" onclick="showToast('Rerouting non-critical ambulances to Mercy Field Clinic', '🚑')">Divert Ambulances</button>
    `;
  } else if (type === "SHELTER") {
    title.innerHTML = `🏠 ${item.name} (${item.sector})`;
    const pct = Math.round((item.occ / item.capacity) * 100);
    body.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
        <div><strong>Occupancy:</strong> ${item.occ} / ${item.capacity} (${pct}%)</div>
        <div><strong>Drinking Water:</strong> <span style="color:${item.water === 'LOW' ? '#ef4444' : '#10b981'}">${item.water}</span></div>
        <div><strong>Rations:</strong> ${item.food}</div>
        <div><strong>Aux Power:</strong> ${item.pwr}</div>
      </div>
    `;
    actions.innerHTML = `
      <button class="btn-pill btn-pill-dark btn-sm" onclick="showToast('Dispatched 1,000L Emergency Water Rations to ${item.name}', '💧')">Dispatch Water Truck</button>
    `;
  } else if (type === "NODE") {
    title.innerHTML = `📡 Aegis Edge Node ${item.id} (${item.sector})`;
    body.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
        <div><strong>Battery:</strong> ${item.batt} (Solar Charging)</div>
        <div><strong>Mesh Route:</strong> ${item.meshHop}</div>
        <div><strong>Signal (RSSI):</strong> ${item.rssi}</div>
        <div><strong>Uplink Status:</strong> <span style="color: #34d399;">Active LoRa Relay</span></div>
      </div>
    `;
    actions.innerHTML = `
      <button class="btn-pill btn-pill-dark btn-sm" onclick="showToast('Diagnostic ping sent to Node ${item.id}: Ack 14ms', '📡')">Ping Node Diagnostic</button>
    `;
  }

  drawer.classList.add("open");
}

// Global actions exposed for drawer buttons
window.dispatchUnit = (incidentId) => {
  showToast(`Additional Fast-Response Water Unit dispatched to #${incidentId}`, "🚤");
  document.getElementById("marker-drawer")?.classList.remove("open");
};

window.markResolved = (incidentId) => {
  state.activeIncidents = state.activeIncidents.filter(i => i.id !== incidentId);
  renderIncidentFeeds();
  renderTacticalMap();
  showToast(`Incident #${incidentId} marked RESOLVED. Responders standing by.`, "✅");
  document.getElementById("marker-drawer")?.classList.remove("open");
};

// ==========================================================================
// 2. AI INCIDENT INTELLIGENCE & DEDUPLICATION ENGINE
// ==========================================================================

function initAIEngine() {
  const btnRun = document.getElementById("btn-run-ai");
  const input = document.getElementById("ai-input-text");
  const samplePills = document.querySelectorAll(".sample-pill");
  const btnRefreshDigest = document.getElementById("btn-refresh-digest");

  samplePills.forEach(pill => {
    pill.addEventListener("click", () => {
      const msg = pill.getAttribute("data-msg");
      if (input) input.value = msg;
      runAIClassification(msg);
    });
  });

  btnRun?.addEventListener("click", () => {
    const text = input?.value.trim();
    if (!text) {
      showToast("Please enter or select a citizen distress message", "⚠️");
      return;
    }
    runAIClassification(text);
  });

  btnRefreshDigest?.addEventListener("click", () => {
    const digest = document.getElementById("digest-content");
    if (!digest) return;
    digest.innerHTML = `<em>Refreshing situational NLP digest across all 8 sectors...</em>`;
    setTimeout(() => {
      digest.innerHTML = `
        • <strong>Total Calls:</strong> 104 distress calls consolidated into 14 verified incidents.<br/>
        • <strong>Flood Status:</strong> Sector 4 river peak projected in 45 min (+22 cm/hr).<br/>
        • <strong>Cluster Alert:</strong> Bridge near Sector 4 confirmed impassable; 92 duplicate calls resolved.<br/>
        • <strong>Shelter Status:</strong> West High School approaching 90%; auto-rerouting to North Pavilion.
      `;
      showToast("Sector Situational Digest refreshed from real-time stream", "✨");
    }, 600);
  });

  // Tab switching in sidebar
  document.querySelectorAll(".sidebar-tabs .tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".sidebar-tabs .tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      const target = btn.getAttribute("data-tab");
      document.getElementById(`pane-${target}`)?.classList.add("active");
    });
  });
}

function runAIClassification(text) {
  const card = document.getElementById("ai-result-card");
  const tagsRow = document.getElementById("ai-tags-row");
  const summaryText = document.getElementById("ai-summary-text");
  const dedupeNote = document.getElementById("ai-dedupe-note");
  if (!card || !tagsRow || !summaryText || !dedupeNote) return;

  const lower = text.toLowerCase();

  // Basic intelligent rule-based triage simulation
  let category = "General Emergency";
  let urgency = "MEDIUM (P2)";
  let people = "1+";
  let location = "Sector 4";
  let recommendation = "Dispatch ground patrol to confirm situation.";
  let dedupeCount = 1;

  if (lower.includes("trapped") || lower.includes("water") || lower.includes("injured") || lower.includes("asthma")) {
    category = "Medical + Water Rescue";
    urgency = "CRITICAL (P1)";
    people = "2+ Trapped";
    location = "Sector 4 (River Basin)";
    recommendation = "Immediate dispatch of shallow-draft rescue boat and ALS paramedic unit. Hazard: Rapid water rise.";
    dedupeCount = 4;
  } else if (lower.includes("bridge") || lower.includes("blocked") || lower.includes("cracked")) {
    category = "Infrastructure Hazard";
    urgency = "HIGH (P2)";
    people = "Public Hazard";
    location = "Sector 4 (Bridge Junction)";
    recommendation = "Deploy traffic barrier units and notify grid authorities of live sparking cables.";
    dedupeCount = 87;
  } else if (lower.includes("shelter") || lower.includes("water") || lower.includes("fuel")) {
    category = "Critical Supply Deficit";
    urgency = "HIGH (P2)";
    people = "30+ Vulnerable";
    location = "Sector 3 (Pine Street)";
    recommendation = "Dispatch 500L mobile tanker and emergency diesel generator fuel transport.";
    dedupeCount = 3;
  }

  tagsRow.innerHTML = `
    <span class="ai-tag tag-urgent">${urgency}</span>
    <span class="ai-tag tag-cat">${category}</span>
    <span class="ai-tag tag-people">${people}</span>
    <span class="ai-tag tag-loc">${location}</span>
  `;

  summaryText.innerHTML = `<strong>Recommended Action:</strong> ${recommendation}`;
  dedupeNote.innerHTML = `
    <span class="dedupe-icon">🔍</span>
    <span><strong>AI Duplicate Detector:</strong> Grouped <strong>${dedupeCount} similar incoming reports</strong> in a 250m radius into this single incident record.</span>
  `;

  showToast(`AI classified as ${urgency} — Action plan generated`, "✨");
}

function renderIncidentFeeds() {
  const list = document.getElementById("incident-list");
  const countEl = document.getElementById("tab-incident-count");
  const kpiCount = document.getElementById("kpi-active-count");
  if (!list) return;

  if (countEl) countEl.textContent = state.activeIncidents.length;
  if (kpiCount) kpiCount.textContent = 180 + state.activeIncidents.length;

  list.innerHTML = state.activeIncidents.map(inc => `
    <div class="incident-item-card" onclick="window.zoomToIncident('${inc.id}')">
      <div class="inc-card-head">
        <span class="inc-id">#${inc.id}</span>
        <span class="inc-badge-urgent" style="background: rgba(239, 68, 68, 0.2); color: #f87171;">${inc.urgency}</span>
      </div>
      <div class="inc-title">${inc.type} · ${inc.people} Victims</div>
      <div class="inc-meta">
        <span>📍 ${inc.sector}</span>
        <span>🚑 ${inc.responder}</span>
      </div>
    </div>
  `).join("");
}

window.zoomToIncident = (id) => {
  const inc = state.activeIncidents.find(i => i.id === id);
  if (!inc) return;
  openMarkerDrawer("SOS", inc);
};

function renderResourceFeeds() {
  const hospList = document.getElementById("hospital-list");
  const shelList = document.getElementById("shelter-list");

  if (hospList) {
    hospList.innerHTML = state.hospitals.map(h => `
      <div class="res-item-card">
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
    shelList.innerHTML = state.shelters.map(s => `
      <div class="res-item-card">
        <div class="res-name">
          <span>${s.name}</span>
          <span style="font-size: 0.75rem; color: #fbbf24;">${s.occ}/${s.capacity}</span>
        </div>
        <div class="res-detail-row">
          <span>Water: <strong>${s.water}</strong></span>
          <span>Food: <strong>${s.food}</strong></span>
          <span>Power: <strong>${s.pwr}</strong></span>
        </div>
      </div>
    `).join("");
  }
}

// ==========================================================================
// 3. CITIZEN RESQ MOBILE SIMULATOR (Offline Mesh vs Online)
// ==========================================================================

function initResQSimulator() {
  const btnToggleNet = document.getElementById("btn-toggle-network");
  const banner = document.getElementById("resq-offline-banner");
  const phonePill = document.getElementById("phone-mode-pill");
  const modalNetBadge = document.getElementById("modal-net-badge");
  const netStatusText = document.getElementById("net-status-text");

  // Toggle Network Online / Offline simulation
  btnToggleNet?.addEventListener("click", () => {
    state.isOnline = !state.isOnline;

    if (state.isOnline) {
      btnToggleNet.className = "toggle-net-btn online";
      if (netStatusText) netStatusText.textContent = "🟢 Online (Cellular Active)";
      if (banner) banner.style.display = "none";
      if (phonePill) phonePill.textContent = "LTE 5G";
      if (modalNetBadge) {
        modalNetBadge.textContent = "🟢 Sending via Internet / Cellular";
        modalNetBadge.style.backgroundColor = "rgba(16, 185, 129, 0.15)";
        modalNetBadge.style.color = "#34d399";
      }
      showToast("Cellular connection restored. Ready to sync queued reports.", "📶");

      // Auto-prompt sync if items exist
      if (state.offlineQueue.length > 0) {
        syncOfflineReports();
      }
    } else {
      btnToggleNet.className = "toggle-net-btn offline";
      if (netStatusText) netStatusText.textContent = "⚠️ Offline (Simulating Blackout)";
      if (banner) banner.style.display = "flex";
      if (phonePill) phonePill.textContent = "LoRa MESH";
      if (modalNetBadge) {
        modalNetBadge.textContent = "⚠️ Storing locally / Relaying via LoRa Mesh";
        modalNetBadge.style.backgroundColor = "rgba(245, 158, 11, 0.2)";
        modalNetBadge.style.color = "#fbbf24";
      }
      showToast("Internet disconnected! ResQ switched to Autonomous BLE/LoRa Mesh Mode.", "📴");
    }
  });

  // Master SOS Button in Phone
  const btnSos = document.getElementById("btn-master-sos");
  btnSos?.addEventListener("click", () => {
    openEmergencyModal("General SOS Alert");
  });

  // Category Buttons in Phone
  document.querySelectorAll(".cat-card").forEach(card => {
    card.addEventListener("click", () => {
      const cat = card.getAttribute("data-cat");
      openEmergencyModal(cat);
    });
  });

  // "I Am Safe" Button
  const btnSafe = document.getElementById("btn-i-am-safe");
  btnSafe?.addEventListener("click", () => {
    btnSafe.textContent = "✓ SAFE CONFIRMED";
    btnSafe.style.backgroundColor = "#059669";
    showToast("Safety beacon broadcasted to family circle & emergency network!", "👨‍👩‍👧‍👦");
  });

  // Sync Now Button
  document.getElementById("btn-sync-now")?.addEventListener("click", () => {
    syncOfflineReports();
  });

  // External trigger buttons
  document.getElementById("hero-resq-btn")?.addEventListener("click", () => {
    document.getElementById("resq-section")?.scrollIntoView({ behavior: "smooth" });
    openEmergencyModal("Hero Citizen SOS");
  });



  // Checklist counter
  document.querySelectorAll(".chk-input").forEach(chk => {
    chk.addEventListener("change", updateChecklistCount);
  });
}

function updateChecklistCount() {
  const inputs = document.querySelectorAll(".chk-input");
  const checked = document.querySelectorAll(".chk-input:checked").length;
  const progText = document.getElementById("chk-prog-text");
  if (progText) {
    progText.textContent = `${checked}/${inputs.length} Packed`;
  }
}

function syncOfflineReports() {
  if (state.offlineQueue.length === 0) return;
  const count = state.offlineQueue.length;

  // Transfer offline items to active incidents
  state.offlineQueue.forEach(item => {
    state.activeIncidents.unshift(item);
  });
  state.offlineQueue = [];

  const queueCard = document.getElementById("offline-queue-card");
  if (queueCard) queueCard.style.display = "none";

  renderIncidentFeeds();
  renderTacticalMap();
  showToast(`✓ All ${count} offline reports successfully synced to Command Center!`, "🔄");
}

// ==========================================================================
// 4. AEGIS NODE MESH HOP SIMULATOR
// ==========================================================================

function initMeshVisualizer() {
  const btnSim = document.getElementById("btn-simulate-packet");
  btnSim?.addEventListener("click", () => {
    simulatePacketPropagation();
  });
}

function simulatePacketPropagation() {
  const nodes = [
    document.getElementById("node-origin"),
    document.getElementById("node-hop-1"),
    document.getElementById("node-hop-2"),
    document.getElementById("node-gateway"),
    document.getElementById("node-dest")
  ];
  const links = [
    document.querySelector(".link-1"),
    document.querySelector(".link-2"),
    document.querySelector(".link-3"),
    document.querySelector(".link-4")
  ];
  const logBox = document.getElementById("packet-log");

  if (!nodes[0] || !logBox) return;

  const btnSim = document.getElementById("btn-simulate-packet");
  if (btnSim) btnSim.disabled = true;

  logBox.innerHTML = "";
  let step = 0;

  function nextStep() {
    // Clear previous
    nodes.forEach(n => n?.classList.remove("active-packet"));
    links.forEach(l => l?.classList.remove("active"));

    if (step < nodes.length) {
      nodes[step]?.classList.add("active-packet");
      if (step > 0 && links[step - 1]) {
        links[step - 1].classList.add("active");
      }

      const timestamp = new Date().toISOString().substring(11, 19);
      let desc = "";

      if (step === 0) desc = "Packet created: [SOS #BLE-892] from Smartphone (No Internet)";
      else if (step === 1) desc = "Hop 1: Received by Aegis Node #014 (Sector 4) · RSSI: -74dBm · Store & Forward";
      else if (step === 2) desc = "Hop 2: Relayed via LoRa 868MHz to Hilltop Node #022 · Distance: 3.2km";
      else if (step === 3) desc = "Hop 3: Starlink Uplink Gateway reached · Packet injected to Regional Cloud";
      else if (step === 4) desc = "Delivered to Command Center in 240ms · Status: ACK Received by Incident Commander";

      logBox.innerHTML += `
        <div class="telemetry-item">
          <span class="tel-time">[${timestamp}]</span>
          <span class="tel-msg">${desc}</span>
        </div>
      `;
      logBox.scrollTop = logBox.scrollHeight;

      step++;
      setTimeout(nextStep, 650);
    } else {
      setTimeout(() => {
        nodes.forEach(n => n?.classList.remove("active-packet"));
        links.forEach(l => l?.classList.remove("active"));
        if (btnSim) btnSim.disabled = false;
        showToast("Mesh transmission completed: 0 packets lost across 4 hops.", "📡");
      }, 1000);
    }
  }

  nextStep();
}

// ==========================================================================
// 5. DISASTER LIFECYCLE TABS
// ==========================================================================

function initLifecycleTabs() {
  document.querySelectorAll(".cycle-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".cycle-tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".cycle-pane").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      const cycle = btn.getAttribute("data-cycle");
      document.getElementById(`cycle-${cycle}`)?.classList.add("active");
    });
  });
}

// ==========================================================================
// 6. MODAL & EMERGENCY REPORT FORM
// ==========================================================================

function initModalAndForms() {
  const modal = document.getElementById("sos-modal");
  const btnClose = document.getElementById("btn-close-modal");
  const btnCancel = document.getElementById("btn-cancel-modal");
  const form = document.getElementById("emergency-report-form");

  btnClose?.addEventListener("click", () => modal.style.display = "none");
  btnCancel?.addEventListener("click", () => modal.style.display = "none");

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const cat = document.getElementById("report-category")?.value || "General Emergency";
    const people = parseInt(document.getElementById("report-people")?.value || "1");
    const details = document.getElementById("report-details")?.value.trim() || "Immediate assistance requested.";

    const newId = `SOS-${Math.floor(186 + Math.random() * 800)}`;
    const newIncident = {
      id: newId,
      type: cat,
      urgency: "CRITICAL (P1)",
      sector: "Sector 4 (Citizen Beacon)",
      lat: 0.38 + (Math.random() - 0.5) * 0.1,
      lng: 0.40 + (Math.random() - 0.5) * 0.1,
      people: people,
      status: state.isOnline ? "Dispatched" : "Queued (Offline Mesh)",
      details: details,
      responder: "Paramedic Unit 07",
      responderStatus: "En Route"
    };

    if (state.isOnline) {
      state.activeIncidents.unshift(newIncident);
      renderIncidentFeeds();
      renderTacticalMap();
      showToast(`Emergency Broadcast Sent! Responders assigned to #${newId}`, "🚨");
    } else {
      state.offlineQueue.push(newIncident);
      const queueCard = document.getElementById("offline-queue-card");
      const queueCount = document.getElementById("queue-count-text");
      if (queueCard) queueCard.style.display = "flex";
      if (queueCount) queueCount.textContent = `${state.offlineQueue.length} Reports Waiting`;
      showToast(`⚠️ Stored locally in phone storage. Relaying through nearby Aegis Node #014...`, "📴");
    }

    modal.style.display = "none";
    form.reset();
  });
}

function openEmergencyModal(categoryPreselect) {
  const modal = document.getElementById("sos-modal");
  if (!modal) return;
  modal.style.display = "flex";
}
