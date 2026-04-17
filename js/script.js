let APP_VERSION,
  APP_NAME,
  APP_DESCRIPTION,
  APP_AUTHOR,
  RADIO_NAME,
  STREAM_URL,
  DEFAULT_VOLUME,
  THEME_COLOR,
  PLAYLIST,
  METADATA,
  APP_URL,
  DIM_VOLUME_SLEEP_TIMER,
  fetchIntervalId,
  audio,
  userInitiatedPause = false; // Flag to track user-initiated pauses

// Helper function to hash a string using SHA-256 and return a hex string
async function sha256(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Initialize the streaming URL
let URL_STREAMING;

// These will be set after CONFIG is loaded in loadAppVars()
let correctPasswordHash = "default-hash-please-configure";
let correctPasswordHashPromise;

// Debug logging wrapper - respects DEBUG_MODE setting
function debugLog(...args) {
  if (typeof CONFIG !== "undefined" && CONFIG?.DEBUG_MODE === true) {
    console.log(...args);
  }
}

debugLog.warn = (...args) => {
  if (typeof CONFIG !== "undefined" && CONFIG?.DEBUG_MODE === true) {
    console.warn(...args);
  }
};

debugLog.error = (...args) => {
  console.error(...args);
};

debugLog.info = (...args) => {
  if (typeof CONFIG !== "undefined" && CONFIG?.DEBUG_MODE === true) {
    console.info(...args);
  }
};

// SVG Icon helper functions
function setPlayerIcon(isPlaying) {
  const playerButton = document.getElementById("playerButton");
  if (playerButton) {
    playerButton.src = isPlaying
      ? "assets/icons/circle-pause.svg"
      : "assets/icons/circle-play.svg";
    playerButton.alt = isPlaying ? "Pause" : "Play";
  }
}

function isPlayerIconPaused() {
  const playerButton = document.getElementById("playerButton");
  return playerButton && playerButton.src.includes("circle-pause.svg");
}

function isPlayerIconPlaying() {
  const playerButton = document.getElementById("playerButton");
  return playerButton && playerButton.src.includes("circle-play.svg");
}

debugLog.log = (...args) => {
  if (typeof CONFIG !== "undefined" && CONFIG?.DEBUG_MODE === true) {
    console.log(...args);
  }
};

function showLoader() {
  var nameToSplit = RADIO_NAME || "LOADING";
  const player = document.getElementById("player");
  if (player) player.style.display = "none";

  let existing = document.getElementById("radioLoader");
  if (existing) existing.remove();

  const loader = document.createElement("div");
  loader.id = "radioLoader";
  loader.className = "radio-loader";
  loader.style.position = "fixed";
  loader.style.top = "0";
  loader.style.left = "0";
  loader.style.width = "100vw";
  loader.style.height = "100vh";
  loader.style.display = "flex";
  loader.style.alignItems = "center";
  loader.style.justifyContent = "center";
  loader.style.background = "rgba(0,0,0,0.8)";
  loader.style.zIndex = "99999";

  const lettersContainer = document.createElement("div");
  lettersContainer.className = "radio-loader-letters";
  lettersContainer.style.display = "flex";
  lettersContainer.style.gap = "0.2em";
  lettersContainer.style.fontSize = "2em";
  lettersContainer.style.fontWeight = "light";
  lettersContainer.style.color = "#fff";
  lettersContainer.style.letterSpacing = "0.15em";

  for (let i = 0; i < nameToSplit.length; i++) {
    const span = document.createElement("span");
    span.textContent = nameToSplit[i];
    span.className = "radio-loader-letter";
    span.style.opacity = "0";
    span.style.transition = "opacity 0.5s";
    lettersContainer.appendChild(span);
  }

  loader.appendChild(lettersContainer);
  document.body.appendChild(loader);

  let idx = 0;
  let direction = 1;
  const spans = lettersContainer.querySelectorAll(".radio-loader-letter");
  function animateLetters() {
    spans.forEach((span, i) => {
      span.style.opacity =
        i === idx && direction === 1
          ? "1"
          : i === idx && direction === -1
            ? "0"
            : span.style.opacity;
    });
    if (direction === 1) {
      idx++;
      if (idx >= spans.length) {
        direction = -1;
        idx = spans.length - 1;
        setTimeout(animateLetters, 400);
        return;
      }
    } else {
      idx--;
      if (idx < 0) {
        direction = 1;
        idx = 0;
        setTimeout(animateLetters, 400);
        return;
      }
    }
    setTimeout(animateLetters, 200);
  }
  animateLetters();
}

function hideLoader() {
  const loader = document.getElementById("radioLoader");
  if (loader) loader.remove();
  const player = document.getElementById("player");
  if (player) player.style.display = "";
}

function showPlaylistFormatErrorNotification(url, error) {
  const existingNotification = document.getElementById(
    "playlistFormatErrorNotification",
  );
  if (existingNotification) existingNotification.remove();

  const notification = document.createElement("div");
  notification.id = "playlistFormatErrorNotification";
  notification.style.position = "fixed";
  notification.style.top = "20px";
  notification.style.right = "20px";
  notification.style.background = "#ff6b35";
  notification.style.color = "white";
  notification.style.padding = "16px 20px";
  notification.style.borderRadius = "8px";
  notification.style.zIndex = "10000";
  notification.style.maxWidth = "400px";
  notification.style.fontSize = "14px";
  notification.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
  notification.style.border = "2px solid #ff4444";

  notification.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 8px; font-size: 16px;">🚨 Playlist Format Error</div>
    <div style="font-size: 13px; margin-bottom: 8px; line-height: 1.4;">The playlist.json file contains invalid JSON format.</div>
    <div style="font-size: 11px; margin-top: 10px; text-align: center; border-top: 1px solid rgba(255,255,255,0.5); padding-top: 8px;">Click to dismiss</div>
  `;

  notification.style.cursor = "pointer";
  notification.onclick = () => notification.remove();
  setTimeout(() => {
    if (notification.parentNode) notification.remove();
  }, 12000);
  document.body.appendChild(notification);
}

function showPlaylistErrorNotification(url, error) {
  const existingNotification = document.getElementById(
    "playlistErrorNotification",
  );
  if (existingNotification) existingNotification.remove();

  const notification = document.createElement("div");
  notification.id = "playlistErrorNotification";
  notification.style.position = "fixed";
  notification.style.top = "100px";
  notification.style.right = "20px";
  notification.style.background = "#ff4444";
  notification.style.color = "white";
  notification.style.padding = "12px 16px";
  notification.style.borderRadius = "6px";
  notification.style.zIndex = "10000";
  notification.style.maxWidth = "300px";
  notification.style.fontSize = "14px";
  notification.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";

  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";
  const message = isLocalhost
    ? "⚠️ Cannot fetch live playlist data during localhost development."
    : "⚠️ Failed to fetch current playlist data.";

  notification.innerHTML = `<strong>Playlist Fetch Failed</strong><br><div style="font-size: 12px;">${message}</div>`;
  notification.style.cursor = "pointer";
  notification.onclick = () => notification.remove();
  setTimeout(() => {
    if (notification.parentNode) notification.remove();
  }, 8000);
  document.body.appendChild(notification);
}

window.addEventListener("load", () => {
  registerServiceWorker();
  loadAppVars();
});

window.addEventListener("DOMContentLoaded", showLoader);

async function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    try {
      await navigator.serviceWorker.register("service-worker.js");
    } catch (err) {
      debugLog("Service Worker registration failed:", err);
    }
  }
}

let playlistData = "playlist.json";
const isPhone = /iPhone|Android.*Mobile|Windows Phone|iPod/i.test(
  navigator.userAgent,
);
let initialVol = 100;
window.__rlplayerAudioContext = window.__rlplayerAudioContext || null;

async function setStreamingUrl(url) {
  try {
    const response = await fetch(url, { method: "GET", mode: "cors" });
    if (response.ok) {
      URL_STREAMING = url;
      return;
    }
  } catch (error) {
    /* ignore */
  }
  // alert("Streaming server is not reachable at the moment.");
}

function setVolume(volume) {
  if (!audio) return;
  if (typeof Storage !== "undefined" && !isPhone) {
    const volumeLocalStorage =
      parseInt(localStorage.getItem("volume"), 10) || 100;
    const volumeElement = document.getElementById("volume");
    if (volumeElement) volumeElement.value = volumeLocalStorage;
    audio.volume = intToDecimal(volumeLocalStorage);
  } else {
    audio.volume = intToDecimal(volume);
  }
}

function changeVolumeLocalStorage(volume) {
  if (typeof Storage !== "undefined" && !isPhone) {
    localStorage.setItem("volume", volume);
  }
}

function initializePlayer() {
  changeTitlePage();
  setCopyright();
  waitForServiceWorkerThenStart();
}

async function waitForServiceWorkerThenStart() {
  if ("serviceWorker" in navigator) {
    try {
      await navigator.serviceWorker.ready;
    } catch (error) {
      /* ignore */
    }
  }
  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";
  const interval = isLocalhost ? 5000 : 1000;
  getStreamingData();
  fetchIntervalId = setInterval(getStreamingData, interval);
}

async function loadAppVars() {
  if (window.envLoader) {
    const envLoaded = await window.envLoader.loadEnv();
    if (envLoaded) {
      window.CONFIG = window.envLoader.createConfig();
    }
  }

  correctPasswordHash =
    CONFIG?.PASSWORD_HASH || "default-hash-please-configure";
  correctPasswordHashPromise = Promise.resolve(correctPasswordHash);

  fetch("app.json")
    .then((r) => r.json())
    .then((appConfig) => {
      APP_VERSION = appConfig.version;
      APP_NAME = appConfig.name;
      APP_AUTHOR = appConfig.author;

      return fetch("manifest.json");
    })
    .then((r) => r.json())
    .then((manifest) => {
      const cfg = CONFIG?.APP_CONFIG || manifest.custom_radio_config;
      RADIO_NAME = cfg.station_name;
      STREAM_URL = cfg.stream_url;
      DEFAULT_VOLUME = cfg.default_volume;
      APP_URL = cfg.app_url;
      DIM_VOLUME_SLEEP_TIMER = cfg.dim_volume_sleep_timer;
      PLAYLIST = manifest.api_endpoints.playlist;
      playlistData = PLAYLIST || "playlist.json";

      if (STREAM_URL) setStreamingUrl(STREAM_URL);

      if (CONFIG?.ENABLE_PASSWORD_PROTECTION === true) {
        checkPassword();
      } else {
        initializePlayer();
      }
    })
    .catch((err) => debugLog.error("Error loading config:", err));
}

function checkPassword() {
  if (localStorage.getItem("passwordAccepted") === correctPasswordHash) {
    initializePlayer();
  } else {
    const modal = document.createElement("div");
    modal.id = "passwordModal";
    modal.style.position = "fixed";
    modal.style.top = "0";
    modal.style.left = "0";
    modal.style.width = "100vw";
    modal.style.height = "100vh";
    modal.style.background = "rgba(0,0,0,0.8)";
    modal.style.display = "flex";
    modal.style.alignItems = "center";
    modal.style.justifyContent = "center";
    modal.style.zIndex = "99999";

    const box = document.createElement("div");
    box.style.background = "#fff";
    box.style.padding = "24px";
    box.style.borderRadius = "8px";
    box.style.textAlign = "center";
    box.style.color = "#333";
    box.style.minWidth = "280px";

    box.innerHTML = `
      <strong>Private Stream</strong>
      <p>Please enter password:</p>
      <input type="password" id="passwordInput" style="width: 80%; padding: 8px; margin-bottom:10px;" autofocus />
      <br>
      <label style="font-size:0.9em;cursor:pointer;"><input type="checkbox" id="togglePassword" /> Show password</label>
      <br><br>
      <button id="submitPassword" style="padding: 8px 20px; background: #031521; color: #fff; border: none; border-radius: 4px;">Submit</button>
    `;

    modal.appendChild(box);
    document.body.appendChild(modal);

    const passwordInput = box.querySelector("#passwordInput");
    const togglePassword = box.querySelector("#togglePassword");

    passwordInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") box.querySelector("#submitPassword").click();
    });
    togglePassword.addEventListener("change", function () {
      passwordInput.type = this.checked ? "text" : "password";
    });

    box.querySelector("#submitPassword").onclick = function () {
      const password = passwordInput.value;
      sha256(password).then((hash) => {
        if (hash === correctPasswordHash) {
          localStorage.setItem("passwordAccepted", correctPasswordHash);
          document.body.removeChild(modal);
          initializePlayer();
        } else {
          alert("Incorrect password.");
        }
      });
    };
  }
}

function changeTitlePage(title = RADIO_NAME) {
  document.title = title;
}

function refreshCurrentSong(
  song,
  artist,
  duration,
  startTime,
  nextTrackStarttime,
) {
  const currentSong = document.getElementById("currentSongDisplay");
  const currentArtist = document.getElementById("currentArtistDisplay");
  const currentDuration = document.getElementById("currentDurationDisplay");

  if (
    song !== currentSong.textContent ||
    artist !== currentArtist.textContent
  ) {
    currentSong.classList.add("fade-out");
    currentArtist.classList.add("fade-out");

    setTimeout(function () {
      currentSong.textContent = song;
      currentArtist.textContent = artist;
      displayTrackCountdown(song, duration, startTime, nextTrackStarttime);

      currentSong.classList.remove("fade-out");
      currentSong.classList.add("fade-in");
      currentArtist.classList.remove("fade-out");
      currentArtist.classList.add("fade-in");

      if ("mediaSession" in navigator) {
        const cacheBuster = Date.now();
        const artworkUrl = `${APP_URL}albumart/art-00.jpg?cb=${cacheBuster}`;
        navigator.mediaSession.metadata = new MediaMetadata({
          title: song,
          artist: artist,
          album: RADIO_NAME,
          artwork: [{ src: artworkUrl, sizes: "200x200", type: "image/jpg" }],
        });
      }
    }, 100);
  }
}

let musicActual = null;
let isFirstLoad = true;
let jsonErrorRetryCount = 0;
const MAX_JSON_ERROR_RETRIES = 3;
let awaitingNextSong = false;

async function getStreamingData() {
  try {
    let data = await fetchStreamingData(playlistData);
    if (data) {
      if (isFirstLoad) {
        hideLoader();
        isFirstLoad = false;
      }

      const safeCurrentSong = data.Current.Title.replace(/'/g, "'");
      const safeCurrentArtist = data.Current.Artist.replace(/'/g, "'");

      if (safeCurrentSong !== musicActual) {
        musicActual = safeCurrentSong;
        refreshCurrentSong(
          safeCurrentSong,
          safeCurrentArtist,
          data.Current.Duration,
          data.Current.Starttime,
          data.Next?.[0]?.Starttime,
        );
      }
    }
  } catch (error) {
    debugLog.error("Stream data error:", error);
  }
}

function displayTrackCountdown(song, duration, startTime, nextTrackStarttime) {
  const currentDurationElem = document.getElementById("currentDurationDisplay");
  if (!currentDurationElem) return;

  if (window.countdownInterval) clearInterval(window.countdownInterval);

  let totalSeconds = 0;
  if (typeof duration === "string" && duration.includes(":")) {
    const parts = duration.split(":").map(Number);
    totalSeconds = parts.length === 2 ? parts[0] * 60 + parts[1] : parts[0];
  } else {
    totalSeconds = parseInt(duration, 10) || 0;
  }

  const COUNTDOWN_BUFFER = CONFIG?.APP_CONFIG?.countdown_buffer_seconds || 8;
  totalSeconds += COUNTDOWN_BUFFER;

  window.countdownInterval = setInterval(() => {
    const songStartTime = new Date(startTime.replace(" ", "T")).getTime();
    const elapsed = Math.floor((Date.now() - songStartTime) / 1000);
    const remaining = Math.max(totalSeconds - elapsed, 0);

    const min = Math.floor(remaining / 60);
    const sec = remaining % 60;
    currentDurationElem.textContent = `${min}:${sec.toString().padStart(2, "0")}`;

    if (remaining === 0) {
      clearInterval(window.countdownInterval);
      getStreamingData();
    }
  }, 1000);
}

async function fetchStreamingData(apiUrl) {
  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: { "Cache-Control": "no-cache" },
    });
    if (!response.ok) throw new Error("Fetch failed");
    return await response.json();
  } catch (error) {
    return null;
  }
}

function setCopyright() {
  const copy = document.getElementById("copy");
  if (copy)
    copy.textContent = `${APP_NAME} ${APP_VERSION} | ©${new Date().getFullYear()} ${APP_AUTHOR}`;
  setupAudioPlayer();
}

async function setupAudioPlayer() {
  audio = new Audio(URL_STREAMING);
  audio.crossOrigin = "anonymous";
  audio.preload = "metadata";

  setupAudioEventListeners();

  const volSlider = document.getElementById("volume");
  if (volSlider) {
    volSlider.oninput = function () {
      changeVolumeLocalStorage(this.value);
      audio.volume = intToDecimal(this.value);
    };
  }

  const playerButton = document.getElementById("playerButton");
  if (playerButton) playerButton.addEventListener("click", togglePlay);
}

function setupAudioEventListeners() {
  audio.addEventListener("pause", () => {
    setPlayerIcon(false);
    const btn = document.getElementById("playerButton");
    if (btn) btn.style.textShadow = "0 0 5px black";
  });

  audio.addEventListener("play", () => {
    setPlayerIcon(true);
    const btn = document.getElementById("playerButton");
    if (btn) btn.style.textShadow = "none";
  });
}

function togglePlay() {
  const isPlaying = isPlayerIconPaused();
  if (isPlaying) {
    setPlayerIcon(false);
    if (audio) {
      userInitiatedPause = true;
      audio.pause();
      audio.currentTime = 0;
    }
  } else {
    setPlayerIcon(true);
    if (!audio) setupAudioPlayer();
    audio.src = URL_STREAMING;
    setVolume(initialVol);
    audio.play().catch((e) => debugLog.warn("Play failed", e));
  }
}

function intToDecimal(vol) {
  return vol / 100;
}

function initNightshift() {
  const night = document.getElementById("nightshift");
  if (!night) return;

  const pref = localStorage.getItem("rl_lightmode");
  if (pref === "1") {
    document.body.classList.add("lightmode");
    night.src = "assets/icons/lightbulb-dark.svg";
  }

  night.addEventListener("click", function () {
    const isOn = document.body.classList.toggle("lightmode");
    if (isOn) {
      localStorage.setItem("rl_lightmode", "1");
      night.src = "assets/icons/lightbulb-dark.svg";
    } else {
      localStorage.removeItem("rl_lightmode");
      night.src = "assets/icons/lightbulb-light.svg";
    }
  });
}

document.addEventListener("DOMContentLoaded", initNightshift);
