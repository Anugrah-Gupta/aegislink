/**
 * AegisLink & ResQ — Unified Real-Time State Synchronization Engine
 * BroadcastChannel API (0ms zero-latency inter-tab messaging) + LocalStorage persistence
 */

export const SYNC_STORAGE_KEY = "aegislink_shared_state";
export const SYNC_CHANNEL_NAME = "aegislink_sync_channel";

export const DEFAULT_SHARED_STATE = {
  incidents: [
    {
      id: "SOS-182",
      type: "Medical + Water Trap",
      urgency: "CRITICAL (P1)",
      sector: "Sector 4 (River Rd)",
      lat: 37.7760,
      lng: -122.4150,
      people: 3,
      status: "In Progress",
      details: "Elderly female with compound fracture, 2 trapped on 2nd floor, water rising at +18cm/h.",
      responder: "Boat Rescue Unit 1",
      responderStatus: "En Route (ETA: 4 min)",
      directives: "Stay on second floor balcony. Rescue boat approaching from south.",
      timestamp: "10 mins ago",
      source: "ResQ App"
    },
    {
      id: "SOS-183",
      type: "Structural Collapse",
      urgency: "CRITICAL (P1)",
      sector: "Sector 2 (Warehouse B)",
      lat: 37.7720,
      lng: -122.4260,
      people: 5,
      status: "Dispatched",
      details: "Roof partially caved in. Acoustic sensors detect tapping on pipes.",
      responder: "USAR Heavy Squad 4",
      responderStatus: "En Route",
      directives: "Heavy rescue squad moving into Sector 2. Avoid structural load-bearing walls.",
      timestamp: "18 mins ago",
      source: "ResQ App"
    },
    {
      id: "SOS-184",
      type: "Fire & Smoke Hazard",
      urgency: "HIGH (P2)",
      sector: "Sector 6 (Industrial Ave)",
      lat: 37.7690,
      lng: -122.4080,
      people: 1,
      status: "On Scene",
      details: "Substation transformer explosion with spreading chemical smoke.",
      responder: "Hazmat Engine 12",
      responderStatus: "Suppressing",
      directives: "Evacuate 500m downwind. Shelter in place with closed windows.",
      timestamp: "25 mins ago",
      source: "ResQ App"
    },
    {
      id: "SOS-185",
      type: "Relief Supplies Deficit",
      urgency: "MEDIUM (P3)",
      sector: "Sector 3 (Elderly Home)",
      lat: 37.7820,
      lng: -122.4020,
      people: 38,
      status: "Queued",
      details: "Need 200L clean drinking water and baby formula. Power restored via solar.",
      responder: "Red Cross Van 02",
      responderStatus: "Staged",
      directives: "Water delivery convoy scheduled for 11:00 AM.",
      timestamp: "42 mins ago",
      source: "ResQ App"
    }
  ],
  shelters: [
    {
      id: "SHEL-01",
      name: "West High School Arena",
      sector: "Sector 4",
      dist: "0.8 km",
      lat: 37.7833,
      lng: -122.4167,
      capacity: 500,
      occ: 427,
      water: "LOW",
      food: "MED",
      medical: true,
      power: true,
      pwr: "Solar Gen",
      status: "Approaching Capacity"
    },
    {
      id: "SHEL-02",
      name: "Civic Community Center",
      sector: "Sector 2",
      dist: "1.9 km",
      lat: 37.7790,
      lng: -122.4290,
      capacity: 750,
      occ: 610,
      water: "GOOD",
      food: "GOOD",
      medical: true,
      power: true,
      pwr: "Grid Active",
      status: "Open (Ample Space)"
    },
    {
      id: "SHEL-03",
      name: "North Pavilion Sports Hall",
      sector: "Sector 1",
      dist: "2.4 km",
      lat: 37.7885,
      lng: -122.4080,
      capacity: 400,
      occ: 215,
      water: "GOOD",
      food: "GOOD",
      medical: false,
      power: true,
      pwr: "Battery",
      status: "Open"
    },
    {
      id: "SHEL-04",
      name: "Harbor Maritime Terminal",
      sector: "Sector 8",
      dist: "3.5 km",
      lat: 37.7950,
      lng: -122.3950,
      capacity: 1200,
      occ: 950,
      water: "MED",
      food: "LOW",
      medical: true,
      power: true,
      pwr: "Generator",
      status: "Open"
    }
  ],
  hospitals: [
    { id: "HOSP-01", name: "Metro General Hospital", sector: "Sector 1", lat: 37.7850, lng: -122.4350, beds: 14, icu: 3, blood: "O- Low", status: "Operational" },
    { id: "HOSP-02", name: "St. Jude Trauma Center", sector: "Sector 5", lat: 37.7650, lng: -122.4100, beds: 6, icu: 1, blood: "Stable", status: "Critical Surge" },
    { id: "HOSP-03", name: "Mercy Field Clinic", sector: "Sector 7", lat: 37.7580, lng: -122.4250, beds: 28, icu: 5, blood: "Optimal", status: "Operational" }
  ],
  meshNodes: [
    { id: "NODE-014", name: "Aegis M-1 #014", sector: "Sector 4", lat: 37.7770, lng: -122.4120, batt: "94%", meshHop: "Gateway Direct", rssi: "-72 dBm" },
    { id: "NODE-022", name: "Aegis M-1 #022", sector: "Sector 3", lat: 37.7810, lng: -122.4220, batt: "88%", meshHop: "2 Hops", rssi: "-81 dBm" },
    { id: "NODE-031", name: "Aegis M-1 #031", sector: "Sector 2", lat: 37.7710, lng: -122.4300, batt: "99%", meshHop: "1 Hop", rssi: "-68 dBm" },
    { id: "NODE-042", name: "Aegis M-1 #042", sector: "Sector 6", lat: 37.7680, lng: -122.4050, batt: "91%", meshHop: "1 Hop", rssi: "-74 dBm" },
    { id: "NODE-050", name: "Aegis M-1 #050", sector: "Sector 7", lat: 37.7850, lng: -122.4000, batt: "86%", meshHop: "3 Hops", rssi: "-84 dBm" }
  ],
  hazards: [
    { id: "HAZ-01", name: "Flash River Inundation", sector: "Sector 4", lat: 37.7750, lng: -122.4140, severity: "High Surge", desc: "River cresting +18cm/h over flood wall" }
  ],
  floodPolygon: [
    [37.7710, -122.4280],
    [37.7735, -122.4200],
    [37.7760, -122.4140],
    [37.7790, -122.4080],
    [37.7830, -122.4020],
    [37.7800, -122.4000],
    [37.7750, -122.4090],
    [37.7720, -122.4170],
    [37.7690, -122.4250]
  ],
  responders: [
    { id: "RESP-01", name: "Boat Rescue Unit 1", lat: 37.7765, lng: -122.4135, status: "En Route to SOS-182", icon: "🚤" },
    { id: "RESP-02", name: "Ambulance 04 (ALS)", lat: 37.7810, lng: -122.4300, status: "Transporting to Metro Gen", icon: "🚑" },
    { id: "RESP-03", name: "USAR Heavy Squad 4", lat: 37.7730, lng: -122.4220, status: "Arriving Warehouse B", icon: "🚒" },
    { id: "RESP-04", name: "Search & Recon Drone B", lat: 37.7780, lng: -122.4180, status: "Aerial Thermal Scan", icon: "🛸" }
  ],
  citizenLocation: {
    lat: 37.7749,
    lng: -122.4194,
    label: "Citizen Device (Sector 4 Balcony)",
    updatedAt: Date.now()
  },
  activeDirective: null,
  familySafe: false
};

// Internal broadcast channel instance
let broadcastChannel = null;
try {
  if (typeof window !== "undefined" && window.BroadcastChannel) {
    broadcastChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
  }
} catch (e) {
  console.warn("BroadcastChannel not supported, falling back to storage events:", e);
}

/**
 * Retrieve the current synchronized state from localStorage, or initialize with defaults.
 */
export function getSharedState() {
  try {
    const raw = localStorage.getItem(SYNC_STORAGE_KEY);
    if (!raw) {
      saveSharedState(DEFAULT_SHARED_STATE);
      return JSON.parse(JSON.stringify(DEFAULT_SHARED_STATE));
    }
    const parsed = JSON.parse(raw);
    // Ensure all critical arrays exist
    if (!parsed.incidents || !Array.isArray(parsed.incidents)) parsed.incidents = DEFAULT_SHARED_STATE.incidents;
    if (!parsed.shelters || !Array.isArray(parsed.shelters)) parsed.shelters = DEFAULT_SHARED_STATE.shelters;
    if (!parsed.citizenLocation) parsed.citizenLocation = DEFAULT_SHARED_STATE.citizenLocation;
    return parsed;
  } catch (err) {
    console.error("Error reading shared state:", err);
    return JSON.parse(JSON.stringify(DEFAULT_SHARED_STATE));
  }
}

/**
 * Persist the updated shared state into localStorage.
 */
export function saveSharedState(state) {
  try {
    state.lastUpdated = Date.now();
    localStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error("Error saving shared state:", err);
  }
}

/**
 * Emit an event across all open tabs/windows via BroadcastChannel.
 */
export function broadcastSyncEvent(type, payload = {}, sender = "UNKNOWN") {
  const event = {
    type,
    payload,
    sender,
    timestamp: Date.now()
  };

  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(event);
    } catch (e) {
      console.warn("Broadcast postMessage error:", e);
    }
  }

  // Also trigger a custom local event for the current window if needed
  window.dispatchEvent(new CustomEvent("aegis_local_sync", { detail: event }));
}

/**
 * Subscribe to real-time events from other tabs.
 */
export function subscribeToSync(handler) {
  if (broadcastChannel) {
    broadcastChannel.onmessage = (msgEvent) => {
      if (msgEvent && msgEvent.data) {
        handler(msgEvent.data);
      }
    };
  }

  // Storage event listener for cross-tab fallback
  window.addEventListener("storage", (storageEvent) => {
    if (storageEvent.key === SYNC_STORAGE_KEY && storageEvent.newValue) {
      try {
        const updatedState = JSON.parse(storageEvent.newValue);
        handler({
          type: "STATE_STORAGE_CHANGE",
          payload: updatedState,
          sender: "STORAGE_EVENT",
          timestamp: Date.now()
        });
      } catch (err) {
        console.error("Storage change parse error:", err);
      }
    }
  });

  // Local window event listener
  window.addEventListener("aegis_local_sync", (customEvent) => {
    handler(customEvent.detail);
  });
}
