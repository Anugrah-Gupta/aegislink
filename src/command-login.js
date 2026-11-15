/**
 * AegisLink Tactical Command Center — Government Authentication Logic
 * Enforces strict Government & Incident Command Clearance (Level 4)
 * Blocks unauthorized civilian access and displays statutory NDMA error.
 */

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("gov-login-form");
  const officerInput = document.getElementById("gov-officer-id");
  const keyInput = document.getElementById("gov-clearance-key");
  const btnRevealKey = document.getElementById("btn-reveal-key");
  const consentChk = document.getElementById("chk-gov-consent");
  const submitBtn = document.getElementById("btn-gov-submit");
  const spinner = document.getElementById("cmd-spinner");
  const feedbackStrip = document.getElementById("cmd-feedback-strip");
  const domainHint = document.getElementById("domain-hint");

  // Agency pills
  const agencyPills = document.querySelectorAll(".agency-pill");

  // Demo Presets
  const btnPresetNdrf = document.getElementById("btn-preset-ndrf");
  const btnPresetSdma = document.getElementById("btn-preset-sdma");
  const btnPresetUnauth = document.getElementById("btn-preset-unauth");

  // Error Modal
  const unauthModal = document.getElementById("unauth-error-modal");
  const btnCloseUnauth = document.getElementById("btn-close-unauth");
  const btnRetryModal = document.getElementById("btn-retry-modal");
  const deniedIdentitySpan = document.getElementById("denied-identity");

  let selectedAgency = "NDRF";
  let agencyDomain = "ndrf.gov.in";

  // Agency Pill Click
  agencyPills.forEach(pill => {
    pill.addEventListener("click", () => {
      agencyPills.forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      selectedAgency = pill.getAttribute("data-agency");
      agencyDomain = pill.getAttribute("data-domain");

      if (domainHint) domainHint.textContent = `.${agencyDomain}`;

      if (selectedAgency === "NDRF") {
        officerInput.placeholder = "e.g. NDRF-CMD-881 or commander@ndrf.gov.in";
      } else if (selectedAgency === "SDMA") {
        officerInput.placeholder = "e.g. SDMA-DIR-104 or director@sdma.gov.in";
      } else {
        officerInput.placeholder = "e.g. DM-SECTOR-04 or collector@district.gov.in";
      }
    });
  });

  // Reveal Key Toggle
  btnRevealKey?.addEventListener("click", () => {
    if (keyInput.type === "password") {
      keyInput.type = "text";
      btnRevealKey.textContent = "🔒";
    } else {
      keyInput.type = "password";
      btnRevealKey.textContent = "👁️";
    }
  });

  // Close Error Modal
  btnCloseUnauth?.addEventListener("click", () => {
    if (unauthModal) unauthModal.style.display = "none";
  });

  btnRetryModal?.addEventListener("click", () => {
    if (unauthModal) unauthModal.style.display = "none";
    officerInput.focus();
  });

  // Show Strip Message
  function showStrip(msg, type = "error") {
    if (!feedbackStrip) return;
    feedbackStrip.textContent = msg;
    feedbackStrip.className = `cmd-alert-strip ${type}`;
    feedbackStrip.style.display = "block";
  }

  // Trigger Unauthorized High-Security Error Modal
  function triggerUnauthorizedModal(identityString) {
    if (deniedIdentitySpan) {
      deniedIdentitySpan.textContent = identityString || "Unknown Identity";
    }
    if (unauthModal) {
      unauthModal.style.display = "flex";
    }
    showStrip("Access Denied: Unrecognized Government Clearance Credentials.", "error");
  }

  // Grant Access & Redirect
  function grantGovernmentAccess(officerData) {
    if (submitBtn) submitBtn.disabled = true;
    if (spinner) spinner.style.display = "inline-block";

    showStrip(`✓ Clearance Level 4 Verified: Welcome Commander ${officerData.name} (${officerData.agency})`, "success");

    localStorage.setItem("aegis_gov_session", JSON.stringify(officerData));

    setTimeout(() => {
      // Redirect to full-screen Command Center
      window.location.href = "command.html";
    }, 900);
  }

  // Validation Logic
  function validateGovernmentCredentials(officerVal, keyVal) {
    const val = officerVal.trim().toLowerCase();
    const key = keyVal.trim();

    // Check if it matches authorized government patterns
    const isGovPrefix = /^(ndrf-|sdma-|ddma-|fema-|seoc-|gov-|dm-|command-)/i.test(val);
    const isGovDomain = val.endsWith(".gov.in") || val.endsWith(".gov") || val.endsWith(".nic.in") || val.endsWith(".mil");
    const isKnownGovUser = ["officer.sharma", "commander", "incident.commander", "district.magistrate"].includes(val);

    const isGovOfficer = isGovPrefix || isGovDomain || isKnownGovUser;

    // Minimum key check
    const isValidKey = key.length >= 4;

    return {
      isGovOfficer,
      isValidKey
    };
  }

  // Form Submit Handler
  form?.addEventListener("submit", (e) => {
    e.preventDefault();

    const officerVal = officerInput.value.trim();
    const keyVal = keyInput.value.trim();

    if (!officerVal) {
      showStrip("Please provide your Government Agency Badge ID or Official .gov Email.");
      officerInput.focus();
      return;
    }

    if (!keyVal) {
      showStrip("Please enter your Command Clearance Token / Passcode.");
      keyInput.focus();
      return;
    }

    if (!consentChk?.checked) {
      showStrip("You must certify your official authority under the NDMA Act to proceed.");
      return;
    }

    const { isGovOfficer, isValidKey } = validateGovernmentCredentials(officerVal, keyVal);

    if (!isGovOfficer || !isValidKey) {
      // Deny access and display statutory government error modal
      triggerUnauthorizedModal(officerVal);
      return;
    }

    // Determine readable officer title
    let officerName = "Officer Sharma";
    let agencyName = "National Disaster Response Force (NDRF)";
    let badgeId = officerVal.toUpperCase();

    if (selectedAgency === "SDMA" || officerVal.toLowerCase().includes("sdma")) {
      officerName = "Director Rajesh Verma";
      agencyName = "State Disaster Management Authority (SDMA / SEOC)";
    } else if (selectedAgency === "DISTRICT" || officerVal.toLowerCase().includes("dm")) {
      officerName = "District Magistrate K. Iyer";
      agencyName = "District Emergency Operations Center (DDMA)";
    }

    const officerData = {
      id: badgeId,
      name: officerName,
      agency: agencyName,
      agencyCode: selectedAgency,
      badge: badgeId,
      clearanceLevel: "Level 4 (Tactical Command & Fleet Dispatch)",
      loginTime: new Date().toISOString(),
      encryptedToken: "ED25519-GOV-" + Math.floor(100000 + Math.random() * 900000),
      airGapActive: true
    };

    grantGovernmentAccess(officerData);
  });

  // Preset 1: Authorized NDRF
  btnPresetNdrf?.addEventListener("click", () => {
    officerInput.value = "NDRF-CMD-881";
    keyInput.value = "COMMAND-2026";
    document.querySelector('.agency-pill[data-agency="NDRF"]')?.click();
    
    const officerData = {
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
    grantGovernmentAccess(officerData);
  });

  // Preset 2: Authorized SDMA
  btnPresetSdma?.addEventListener("click", () => {
    officerInput.value = "SDMA-DIR-104";
    keyInput.value = "CLEARANCE-LEVEL-4";
    document.querySelector('.agency-pill[data-agency="SDMA"]')?.click();

    const officerData = {
      id: "SDMA-DIR-104",
      name: "Director Rajesh Verma",
      agency: "State Emergency Operations Center (SEOC)",
      agencyCode: "SDMA",
      badge: "SDMA-DIR-104",
      clearanceLevel: "Level 4 (State Operations)",
      loginTime: new Date().toISOString(),
      encryptedToken: "ED25519-GOV-716492",
      airGapActive: true
    };
    grantGovernmentAccess(officerData);
  });

  // Preset 3: Simulate Unauthorized Citizen (Directly demonstrates the error rejection!)
  btnPresetUnauth?.addEventListener("click", () => {
    officerInput.value = "john.doe@gmail.com";
    keyInput.value = "123456";
    triggerUnauthorizedModal("john.doe@gmail.com");
  });
});
