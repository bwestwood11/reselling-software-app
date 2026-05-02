const loginSection = document.getElementById("login-section");
const statusSection = document.getElementById("status-section");
const loginForm = document.getElementById("login-form");
const loginBtn = document.getElementById("login-btn");
const loginError = document.getElementById("login-error");
const logoutBtn = document.getElementById("logout-btn");
const queueCount = document.getElementById("queue-count");
const activeJob = document.getElementById("active-job");
const mercariIcon = document.getElementById("mercari-icon");
const mercariAccount = document.getElementById("mercari-account");
const mercariConnectBtn = document.getElementById("mercari-connect-btn");
const mercariError = document.getElementById("mercari-error");

function showLogin() {
  loginSection.classList.remove("hidden");
  statusSection.classList.add("hidden");
}

function showStatus() {
  loginSection.classList.add("hidden");
  statusSection.classList.remove("hidden");
}

function setError(msg) {
  loginError.textContent = msg;
  loginError.classList.toggle("hidden", !msg);
}

async function refreshStatus() {
  const res = await sendMessage({ type: "GET_STATUS" });
  if (!res.authenticated) {
    showLogin();
    return;
  }

  showStatus();

  // Job queue count
  try {
    const pendingRes = await sendMessage({ type: "GET_PENDING_COUNT" });
    queueCount.textContent = pendingRes.count != null ? `${pendingRes.count} pending` : "Unknown";
  } catch {
    queueCount.textContent = "Unknown";
  }

  activeJob.textContent = res.activeJobId ? `Processing ${res.activeJobId.slice(0, 8)}…` : "None";

  // Mercari connection status
  refreshMercariStatus();
}

async function refreshMercariStatus() {
  mercariError.classList.add("hidden");
  mercariAccount.textContent = "Checking…";

  try {
    const status = await sendMessage({ type: "GET_MERCARI_STATUS" });
    if (status.connected) {
      mercariAccount.textContent = status.accountName ?? "Connected";
      mercariIcon.style.background = "#f0fdf4";
      mercariIcon.style.color = "#22c55e";
      mercariConnectBtn.classList.add("hidden");
    } else {
      mercariAccount.textContent = "Not connected";
      mercariIcon.style.background = "#fff1f2";
      mercariIcon.style.color = "#e11d48";
      mercariConnectBtn.classList.remove("hidden");
    }
  } catch {
    mercariAccount.textContent = "Unknown";
    mercariConnectBtn.classList.remove("hidden");
  }
}

mercariConnectBtn.addEventListener("click", async () => {
  mercariError.classList.add("hidden");
  mercariConnectBtn.disabled = true;
  mercariConnectBtn.textContent = "Opening Mercari…";
  mercariAccount.textContent = "Waiting for login…";

  const res = await sendMessage({ type: "CONNECT_MERCARI" });

  mercariConnectBtn.disabled = false;
  mercariConnectBtn.textContent = "Connect Mercari Account";

  if (res.ok) {
    await refreshMercariStatus();
  } else {
    mercariAccount.textContent = "Not connected";
    mercariError.textContent = res.error ?? "Connection failed. Please try again.";
    mercariError.classList.remove("hidden");
  }
});

function sendMessage(msg) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(msg, (res) => {
      if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
      resolve(res ?? {});
    });
  });
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  setError("");
  loginBtn.disabled = true;
  loginBtn.textContent = "Signing in…";

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const res = await sendMessage({ type: "LOGIN", email, password });
    if (!res.ok) throw new Error(res.error ?? "Login failed");
    await refreshStatus();
  } catch (err) {
    setError(err.message ?? "Login failed");
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Sign in";
  }
});

logoutBtn.addEventListener("click", async () => {
  await sendMessage({ type: "LOGOUT" });
  showLogin();
});

// Handle GET_PENDING_COUNT in background (background.js re-export not accessible from popup)
// We add a forwarding listener in background to serve this.
// (background.js already handles GET_STATUS; GET_PENDING_COUNT added below via injection)

refreshStatus();
