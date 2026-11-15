/**
 * ResQ Emergency Portal — Login Logic & Session Manager
 * Saves verified session to localStorage and redirects to resq.html
 */

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("resq-login-form");
  const identifierInput = document.getElementById("user-identifier");
  const pinInput = document.getElementById("user-pin");
  const btnTogglePin = document.getElementById("btn-toggle-pin");
  const submitBtn = document.getElementById("btn-submit-login");
  const spinner = document.getElementById("login-spinner");
  const feedback = document.getElementById("login-feedback");
  const rolePills = document.querySelectorAll(".role-pill");

  // Demo buttons
  const btnDemoCitizen = document.getElementById("btn-demo-citizen");
  const btnDemoResponder = document.getElementById("btn-demo-responder");
  const btnInstantGuest = document.getElementById("btn-instant-sos-guest");
  const quickBypassTop = document.getElementById("quick-bypass-top");
  const btnForgotPin = document.getElementById("btn-forgot-pin");

  let selectedRole = "Citizen";
  let selectedRoleName = "Citizen Resident";

  // Role Pill Selection
  rolePills.forEach(pill => {
    pill.addEventListener("click", () => {
      rolePills.forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      selectedRole = pill.getAttribute("data-role");
      selectedRoleName = pill.getAttribute("data-name");

      if (selectedRole === "First Responder") {
        identifierInput.value = "NDRF-UNIT-402";
        identifierInput.placeholder = "Responder Badge ID (e.g. NDRF-402)";
      } else if (selectedRole === "Medical Personnel") {
        identifierInput.value = "MED-METRO-08";
        identifierInput.placeholder = "Hospital / Paramedic License ID";
      } else {
        identifierInput.value = "+91 98765 43210";
        identifierInput.placeholder = "e.g. +91 98765 43210 or citizen@aegislink.org";
      }
    });
  });

  // Toggle Password / PIN visibility
  btnTogglePin?.addEventListener("click", () => {
    if (pinInput.type === "password") {
      pinInput.type = "text";
      btnTogglePin.textContent = "🔒";
    } else {
      pinInput.type = "password";
      btnTogglePin.textContent = "👁️";
    }
  });

  // Show Feedback Message
  function showFeedback(message, type = "error") {
    if (!feedback) return;
    feedback.textContent = message;
    feedback.className = `login-alert-box ${type}`;
    feedback.style.display = "block";
    setTimeout(() => {
      feedback.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 100);
  }

  // Authorize & Redirect
  function authorizeSession(userData) {
    if (submitBtn) submitBtn.disabled = true;
    if (spinner) spinner.style.display = "inline-block";
    
    showFeedback(`✓ Authenticated as ${userData.name}. Connecting to Aegis mesh...`, "success");

    localStorage.setItem("resq_session", JSON.stringify(userData));

    setTimeout(() => {
      window.location.href = "resq.html";
    }, 800);
  }

  // Handle Form Submission
  form?.addEventListener("submit", (e) => {
    e.preventDefault();

    const idVal = identifierInput.value.trim();
    const pinVal = pinInput.value.trim();

    if (!idVal) {
      showFeedback("Please enter your Citizen ID, Mobile number, or Email.");
      identifierInput.focus();
      return;
    }

    if (!pinVal || pinVal.length < 4) {
      showFeedback("Please enter a valid Emergency Access PIN (minimum 4 digits).");
      pinInput.focus();
      return;
    }

    // Determine readable user display name
    let displayName = idVal;
    if (idVal.startsWith("+") || !isNaN(idVal.replace(/\s+/g, ""))) {
      displayName = `Citizen (${idVal.slice(-4)})`;
    } else if (idVal.includes("@")) {
      displayName = idVal.split("@")[0];
    }

    const userData = {
      id: "RESQ-" + Math.floor(1000 + Math.random() * 9000),
      identifier: idVal,
      name: displayName,
      role: selectedRole,
      roleDescription: selectedRoleName,
      loginTimestamp: new Date().toISOString(),
      offlineMeshCached: true,
      batteryLevel: "98%"
    };

    authorizeSession(userData);
  });

  // Demo: Citizen One-Click
  btnDemoCitizen?.addEventListener("click", () => {
    identifierInput.value = "+91 98765 43210";
    pinInput.value = "8920";
    document.querySelector('.role-pill[data-role="Citizen"]')?.click();
    
    const demoUser = {
      id: "RESQ-IND-9021",
      identifier: "+91 98765 43210",
      name: "Anugrah (Citizen)",
      role: "Citizen",
      roleDescription: "Civilian Resident",
      loginTimestamp: new Date().toISOString(),
      offlineMeshCached: true,
      batteryLevel: "96%"
    };
    authorizeSession(demoUser);
  });

  // Demo: Responder One-Click
  btnDemoResponder?.addEventListener("click", () => {
    identifierInput.value = "NDRF-SQUAD-USAR-01";
    pinInput.value = "9941";
    document.querySelector('.role-pill[data-role="First Responder"]')?.click();

    const demoUser = {
      id: "RESP-NDRF-402",
      identifier: "NDRF-SQUAD-USAR-01",
      name: "Captain Sharma (NDRF)",
      role: "First Responder",
      roleDescription: "USAR Boat Commander",
      loginTimestamp: new Date().toISOString(),
      offlineMeshCached: true,
      batteryLevel: "100%"
    };
    authorizeSession(demoUser);
  });

  // Instant Guest Emergency Bypass
  btnInstantGuest?.addEventListener("click", () => {
    const guestUser = {
      id: "GUEST-EMERGENCY-" + Math.floor(100 + Math.random() * 899),
      identifier: "Emergency Guest Beacon",
      name: "Guest Civilian (SOS Priority)",
      role: "Citizen",
      roleDescription: "Emergency SOS Bypass Mode",
      loginTimestamp: new Date().toISOString(),
      offlineMeshCached: true,
      batteryLevel: "92%"
    };
    authorizeSession(guestUser);
  });

  // Top quick bypass button
  quickBypassTop?.addEventListener("click", (e) => {
    e.preventDefault();
    btnInstantGuest.click();
  });

  // Forgot PIN helper
  btnForgotPin?.addEventListener("click", () => {
    showFeedback("ℹ️ In a disaster blackout, any 4-digit PIN is accepted locally. Or click 'Instant SOS' below for zero-credential emergency access.", "success");
  });
});
