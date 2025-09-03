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
  // Always show errors, regardless of debug mode
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
  // Hide the player while loading
  const player = document.getElementById("player");
  if (player) player.style.display = "none";

  // Remove existing loader if present
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

  // Each letter gets its own span for animation
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

  // Animate letters in and out
  let idx = 0;
  let direction = 1; // 1: fade in, -1: fade out
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

// Modify hideLoader to show the player after loading
function hideLoader() {
  const loader = document.getElementById("radioLoader");
  if (loader) loader.remove();
  const player = document.getElementById("player");
  if (player) player.style.display = "";
}

// Show notification when playlist has JSON format errors
function showPlaylistFormatErrorNotification(url, error) {
  // Remove any existing notification
  const existingNotification = document.getElementById(
    "playlistFormatErrorNotification"
  );
  if (existingNotification) {
    existingNotification.remove();
  }

  // Create notification element
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
    <div style="font-size: 13px; margin-bottom: 8px; line-height: 1.4;">
      The playlist.json file contains invalid JSON format and cannot be parsed.
    </div>
    <div style="font-size: 12px; margin-bottom: 8px; line-height: 1.3;">
      <strong>Auto-retry:</strong> Will automatically retry fetching in a few seconds.
    </div>
    <div style="font-size: 12px; margin-bottom: 8px; line-height: 1.3;">
      <strong>Recommended:</strong> Check the online playlist.json file or verify the RadioLogik template format.
    </div>
    <div style="font-size: 11px; margin-top: 10px; text-align: center; border-top: 1px solid rgba(255,255,255,0.5); padding-top: 8px;">
      Click to dismiss • Auto-dismiss in 12 seconds
    </div>
  `;

  // Auto-dismiss after 12 seconds or on click
  notification.style.cursor = "pointer";
  notification.onclick = () => notification.remove();

  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 12000);

  document.body.appendChild(notification);
}

// Show notification when playlist fetch fails
function showPlaylistErrorNotification(url, error) {
  // Remove any existing notification
  const existingNotification = document.getElementById(
    "playlistErrorNotification"
  );
  if (existingNotification) {
    existingNotification.remove();
  }

  // Create notification element
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
    ? "⚠️ Cannot fetch live playlist data during localhost development. The displayed track information may be outdated."
    : "⚠️ Failed to fetch current playlist data. Track information may be outdated until connection is restored.";

  notification.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 4px;">Playlist Fetch Failed</div>
    <div style="font-size: 12px;">${message}</div>
    <div style="font-size: 11px; margin-top: 6px;">Click to dismiss</div>
  `;

  // Auto-dismiss after 8 seconds or on click
  notification.style.cursor = "pointer";
  notification.onclick = () => notification.remove();

  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 8000);

  document.body.appendChild(notification);
}

// Call the loadAppVars function when the page loads (first thing to happen)
window.addEventListener("load", () => {
  // Register service worker first, then load app vars
  registerServiceWorker();
  loadAppVars();
});

// Show loader on DOM ready, but it will use RADIO_NAME once loaded
window.addEventListener("DOMContentLoaded", showLoader);

// Service Worker Registration
async function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.register(
        "service-worker.js"
      );
      debugLog("Service Worker registered successfully:", registration);
    } catch (err) {
      debugLog("Service Worker registration failed:", err);
    }
  }
}

// playlistData data json url will be set after manifest loads
let playlistData = "playlist.json"; // Default fallback

// Only use localStorage volume if not on mobile device
// Only check for phones (not tablets) using user agent
const isPhone = /iPhone|Android.*Mobile|Windows Phone|iPod/i.test(
  navigator.userAgent
);
// set the initial volume to start at
let initialVol = DEFAULT_VOLUME || 100;
const dimVolumeSleeptimer = DIM_VOLUME_SLEEP_TIMER || 50; // Volume to set when sleep timer is active (0-100)

// Function to check if a stream URL is reachable and set it directly, without timeout
async function setStreamingUrl(url) {
  try {
    const response = await fetch(url, {
      method: "GET",
      mode: "cors",
    });
    if (response.ok) {
      URL_STREAMING = url;
      return;
    }
    debugLog.warn(`Stream URL ${url} returned status: ${response.status}`);
  } catch (error) {
    // Ignore error, will alert below
  }
  alert("Streaming server is not reachable at the moment.");
}

function setVolume(volume) {
  // debugLog.log("setVolume gets value:", volume);
  // debugLog.log("isPhone:", isPhone);
  if (!audio) {
    debugLog.warn("Audio object not yet initialized, skipping setVolume");
    return;
  }

  if (typeof Storage !== "undefined" && !isPhone) {
    const volumeLocalStorage =
      parseInt(localStorage.getItem("volume"), 10) || 100;
    debugLog("Volume from localStorage or default:", volumeLocalStorage);
    const volumeElement = document.getElementById("volume");
    if (volumeElement) {
      volumeElement.value = volumeLocalStorage;
    }
    audio.volume = intToDecimal(volumeLocalStorage);
  } else {
    audio.volume = intToDecimal(volume);
  }
  // debugLog.log("setVolume sets value:", audio.volume);
}

function changeVolumeLocalStorage(volume) {
  if (typeof Storage !== "undefined" && !isPhone) {
    // debugLog.log("Storing volume in localStorage:", volume);
    localStorage.setItem("volume", volume);
  }
}

function initializePlayer() {
  debugLog("Initializing player...");

  changeTitlePage();
  setCopyright(); // This calls setupAudioPlayer

  // DON'T show the player yet - wait for first successful playlist fetch
  // The player will be shown when hideLoader() is called after first data load

  debugLog("Player initialization complete, waiting for playlist data...");

  // Wait for service worker to be ready before starting data fetching
  waitForServiceWorkerThenStart();
}

async function waitForServiceWorkerThenStart() {
  debugLog("Waiting for service worker to be ready...");

  if ("serviceWorker" in navigator) {
    try {
      // Wait for service worker to be ready
      const registration = await navigator.serviceWorker.ready;
      debugLog("Service worker is ready:", registration);

      // Small delay to ensure everything is properly initialized
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      debugLog("Service worker not available or failed:", error);
      // Continue anyway after a short delay
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  } else {
    debugLog("Service worker not supported, continuing without it");
  }

  // Start fetching streaming data
  debugLog("Starting to fetch streaming data with playlistData:", playlistData);

  // Use longer interval for localhost to be gentle on CORS proxies
  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";
  const interval = isLocalhost ? 5000 : 1000; // 5 seconds for localhost, 1 second for production

  debugLog(`Using polling interval: ${interval}ms`);
  getStreamingData();
  fetchIntervalId = setInterval(getStreamingData, interval);
}
// Helper function to dynamically load config.js
function loadConfigJS() {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "config.js";
    script.onload = () => {
      if (typeof CONFIG !== "undefined") {
        resolve();
      } else {
        reject(new Error("config.js loaded but CONFIG not defined"));
      }
    };
    script.onerror = () => reject(new Error("config.js not found"));
    document.head.appendChild(script);
  });
}

async function loadAppVars() {
  debugLog("🔧 Loading app configuration...");

  // Try to load environment variables first
  let envLoaded = false;
  if (window.envLoader) {
    envLoaded = await window.envLoader.loadEnv();

    if (envLoaded) {
      // Override CONFIG with environment variables
      window.CONFIG = window.envLoader.createConfig();
      debugLog("✅ Using .env configuration");

      // Validate environment configuration
      window.envLoader.validateConfig();
    } else {
      debugLog("📋 .env not found, trying config.js fallback...");

      // Try to load config.js dynamically
      try {
        await loadConfigJS();
        debugLog("✅ Using config.js fallback");
      } catch (error) {
        debugLog.error("❌ Neither .env nor config.js found!");
        debugLog.error("📋 Please run: ./setup-env.sh or create config.js");

        // Create a minimal CONFIG to prevent crashes
        window.CONFIG = {
          PASSWORD_HASH: "default-hash-please-configure",
          ENABLE_PASSWORD_PROTECTION: false,
          APP_CONFIG: {
            scope: "/",
            background_color: "#031521",
            theme_color: "#031521",
            station_name: "Setup Required",
            stream_url: "https://example.com",
            app_url: "https://example.com",
            default_volume: 100,
            dim_volume_sleep_timer: 50,
            countdown_buffer_seconds: 8,
          },
        };
      }
    }
  }

  // Now validate CONFIG and set up password hash
  correctPasswordHash =
    CONFIG?.PASSWORD_HASH || "default-hash-please-configure";
  correctPasswordHashPromise = Promise.resolve(correctPasswordHash);

  // Validate that the user has set up a real password hash
  if (
    correctPasswordHash === "default-hash-please-configure" ||
    correctPasswordHash === "your-password-hash-here"
  ) {
    debugLog.warn(
      "⚠️  Using default password hash! Please configure your own password."
    );
    debugLog.warn('📋 Generate hash with: await hashString("your-password")');
  }

  // Validate APP_CONFIG for personalized settings
  if (CONFIG?.APP_CONFIG) {
    if (
      CONFIG.APP_CONFIG.station_name === "Your Radio Name" ||
      CONFIG.APP_CONFIG.stream_url === "https://your-stream-url.com" ||
      CONFIG.APP_CONFIG.app_url === "https://your-domain.com/app/"
    ) {
      debugLog.warn(
        "⚠️  Using default APP_CONFIG values! Please customize your radio settings."
      );
      debugLog.warn(
        "📋 Edit config.js to set your station name, stream URL, and app URL."
      );
    } else {
      debugLog("✅ Custom APP_CONFIG detected - using personalized settings.");
    }
  } else {
    debugLog("ℹ️  No APP_CONFIG found - using manifest.json defaults.");
  }

  // Now load manifest for app metadata
  debugLog("📄 Loading manifest.json...");
  fetch("manifest.json")
    .then((response) => {
      if (!response.ok) {
        throw new Error(
          `Failed to load manifest: ${response.status} ${response.statusText}`
        );
      }
      return response.json();
    })
    .then((manifest) => {
      debugLog("Manifest loaded successfully:", manifest);

      // Assign manifest values to global variables
      APP_VERSION = manifest.version;
      APP_NAME = manifest.name;
      APP_DESCRIPTION = manifest.description;
      APP_AUTHOR = manifest.author;

      // Override with CONFIG values if available, otherwise use manifest defaults
      if (CONFIG?.APP_CONFIG) {
        debugLog("Overriding manifest values with CONFIG.APP_CONFIG...");
        RADIO_NAME =
          CONFIG.APP_CONFIG.station_name ||
          manifest.custom_radio_config.station_name;
        STREAM_URL =
          CONFIG.APP_CONFIG.stream_url ||
          manifest.custom_radio_config.stream_url;
        DEFAULT_VOLUME =
          CONFIG.APP_CONFIG.default_volume ||
          manifest.custom_radio_config.default_volume;
        THEME_COLOR =
          CONFIG.APP_CONFIG.theme_color ||
          manifest.custom_radio_config.theme_color;
        APP_URL =
          CONFIG.APP_CONFIG.app_url || manifest.custom_radio_config.app_url;
        DIM_VOLUME_SLEEP_TIMER =
          CONFIG.APP_CONFIG.dim_volume_sleep_timer ||
          manifest.custom_radio_config.dim_volume_sleep_timer;
      } else {
        debugLog("Using manifest values (CONFIG.APP_CONFIG not found)...");
        RADIO_NAME = manifest.custom_radio_config.station_name;
        STREAM_URL = manifest.custom_radio_config.stream_url;
        DEFAULT_VOLUME = manifest.custom_radio_config.default_volume;
        THEME_COLOR = manifest.custom_radio_config.theme_color;
        APP_URL = manifest.custom_radio_config.app_url;
        DIM_VOLUME_SLEEP_TIMER =
          manifest.custom_radio_config.dim_volume_sleep_timer;
      }

      PLAYLIST = manifest.api_endpoints.playlist;

      // Set playlistData after PLAYLIST is loaded from manifest
      playlistData = PLAYLIST || "playlist.json";
      debugLog("playlistData set to:", playlistData);

      // Log all key variables to console for debugging
      debugLog("APP_VERSION:", APP_VERSION);
      debugLog("APP_NAME:", APP_NAME);
      debugLog("APP_DESCRIPTION:", APP_DESCRIPTION);
      debugLog("APP_AUTHOR:", APP_AUTHOR);
      debugLog("RADIO_NAME:", RADIO_NAME);
      debugLog("STREAM_URL:", STREAM_URL);
      debugLog("DEFAULT_VOLUME:", DEFAULT_VOLUME);
      debugLog("THEME_COLOR:", THEME_COLOR);
      debugLog("PLAYLIST:", PLAYLIST);
      debugLog("METADATA:", METADATA);
      debugLog("APP_URL:", APP_URL);
      debugLog("DIM_VOLUME_SLEEP_TIMER:", DIM_VOLUME_SLEEP_TIMER);

      // Set up streaming URL after loading from manifest
      if (typeof STREAM_URL === "string" && STREAM_URL.trim() !== "") {
        setStreamingUrl(STREAM_URL);
      } else {
        debugLog.warn(
          "STREAM_URL is undefined or empty. Skipping setStreamingUrl."
        );
      }

      // Update the loader with the correct radio name if it's currently showing
      const existingLoader = document.getElementById("radioLoader");
      if (existingLoader) {
        const lettersContainer = existingLoader.querySelector(
          ".radio-loader-letters"
        );
        if (lettersContainer) {
          // Clear existing letters
          lettersContainer.innerHTML = "";

          // Add new letters with the correct radio name
          for (let i = 0; i < RADIO_NAME.length; i++) {
            const span = document.createElement("span");
            span.textContent = RADIO_NAME[i];
            span.className = "radio-loader-letter";
            span.style.opacity = "0";
            span.style.transition = "opacity 0.5s";
            lettersContainer.appendChild(span);
          }
        }
      }

      // After loading app variables, check if password protection is enabled
      if (CONFIG?.ENABLE_PASSWORD_PROTECTION === true) {
        checkPassword();
      } else {
        // Skip password check, go directly to player initialization
        debugLog("🔓 Password protection disabled, starting player...");
        initializePlayer();
      }
    })
    .catch((error) => {
      debugLog.error("Error loading manifest:", error);
      alert(
        "Failed to load application configuration. Please check your network connection and try again."
      );
    });
}
function checkPassword() {
  // Check if the password has already been accepted
  if (localStorage.getItem("passwordAccepted") === correctPasswordHash) {
    // debugLog.log("Password already accepted.");
    // Continue with the rest of your application logic here
    initializePlayer();
  } else {
    // Create a custom modal for password input with show/hide toggle
    const modal = document.createElement("div");
    modal.style.position = "fixed";
    modal.style.top = "0";
    modal.style.left = "0";
    modal.style.width = "100vw";
    modal.style.height = "100vh";
    modal.style.background = "rgba(0,0,0,0.7)";
    modal.style.display = "flex";
    modal.style.alignItems = "center";
    modal.style.justifyContent = "center";
    modal.style.zIndex = "99999";

    const box = document.createElement("div");
    box.style.background = "#fff";
    box.style.padding = "24px";
    box.style.borderRadius = "8px";
    box.style.textAlign = "center";
    box.style.minWidth = "280px";

    box.innerHTML = `
      <strong>This stream is for private use only.</strong>
      <p>Please enter the password to access this content:</p>
      <input type="password" id="passwordInput" style="width: 80%; padding: 6px; font-size: 1em;" autofocus />
      <br>
      <label style="font-size:0.95em;cursor:pointer;">
      <input type="checkbox" id="togglePassword" style="margin-right:4px;" />
      Show password
      </label>
      <br><br>
      <button id="submitPassword" style="padding: 6px 16px; background: #031521; color: #fff; border: none; border-radius: 4px;">Submit</button>
    `;

    // Add Enter key support for password input
    box
      .querySelector("#passwordInput")
      .addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          box.querySelector("#submitPassword").click();
        }
      });

    modal.appendChild(box);
    document.body.appendChild(modal);

    // Show/hide password logic
    const passwordInput = box.querySelector("#passwordInput");
    const togglePassword = box.querySelector("#togglePassword");
    togglePassword.addEventListener("change", function () {
      passwordInput.type = this.checked ? "text" : "password";
    });

    // Submit logic
    box.querySelector("#submitPassword").onclick = function () {
      const password = passwordInput.value;
      document.body.removeChild(modal);
      // Continue with password check
      sha256(password).then((hash) => {
        correctPasswordHashPromise.then((correctHash) => {
          if (hash === correctHash) {
            // debugLog.log("Password accepted.");
            localStorage.setItem("passwordAccepted", correctPasswordHash);
            initializePlayer();
          } else {
            // debugLog.warn("Incorrect password.");
            document.body.innerHTML =
              "<strong>Access Denied</strong><p>Incorrect password.</p>";
          }
        });
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
  nextTrackStarttime
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
      currentDuration.classList.remove("fade-out");
      currentDuration.classList.add("fade-in");

      if ("mediaSession" in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: song,
          artist: artist,
          album: RADIO_NAME,
          artwork: [
            {
              src: APP_URL + "albumart/art-00.jpg",
              sizes: "200x200",
              type: "image/jpg",
            },
          ],
        });
        navigator.mediaSession.setActionHandler("play", () => {
          togglePlay();
        });
        navigator.mediaSession.setActionHandler("pause", () => {
          togglePlay();
        });
        navigator.mediaSession.setActionHandler("stop", () => {
          if (isPlaying) {
            setPlayerIcon(false); // Set to play icon
            playerButton.style.textShadow = "0 0 5px black";

            audio.pause();
            audio.src = "";
          }
        });
      }
    }, 100);

    setTimeout(function () {
      currentSong.classList.remove("fade-in");
      currentArtist.classList.remove("fade-in");
      currentDuration.classList.remove("fade-in");
    }, 200);
  }
}

// Remove the Page class and use functions directly
let musicActual = null;
let isFirstLoad = true; // Flag to track first successful load
let jsonErrorRetryCount = 0; // Counter for JSON format error retries
const MAX_JSON_ERROR_RETRIES = 3; // Maximum retries for JSON format errors
let awaitingNextSong = false; // Flag to track when countdown reached 0:00 but no new song detected yet

async function getStreamingData() {
  try {
    debugLog("Fetching streaming data from:", playlistData);
    let data = await fetchStreamingData(playlistData);

    debugLog("Received data:", data);

    if (data) {
      // Reset JSON error retry counter on successful data fetch
      if (jsonErrorRetryCount > 0) {
        debugLog(
          "Playlist fetched successfully - resetting JSON error retry counter"
        );
        jsonErrorRetryCount = 0;
      }

      // Hide loader on first successful data fetch
      if (isFirstLoad) {
        debugLog("First playlist data loaded successfully - hiding loader");
        hideLoader();
        isFirstLoad = false;
      }
      var currentSong = data.Current.Title;
      var charsToplayTitle = 25;
      var charsPlayingTitle = 40;
      var nrToplay = 5;
      var nrHistory = 3;
      const currentArtistVal = data.Current.Artist;
      let currentDurationVal = data.Current.Duration;
      let currentStartTime = data.Current.Starttime;

      if (currentSong.length > charsPlayingTitle) {
        var string = currentSong;
        var length = charsPlayingTitle;
        var trimmedString = string.substring(0, length) + "...";
        currentSong = trimmedString;
      }

      const safeCurrentSong = (currentSong || "")
        .replace(/'/g, "'")
        .replace(/&/g, "&");
      const safeCurrentArtist = (currentArtistVal || "")
        .replace(/'/g, "'")
        .replace(/&/g, "&");

      if (safeCurrentSong !== musicActual) {
        debugLog("New song detected:", safeCurrentSong);

        // Reset the awaiting next song flag since we found the new song
        if (awaitingNextSong) {
          debugLog("New song detected - clearing awaiting next song state");
          awaitingNextSong = false;

          // Reset duration display styling
          const currentDuration = document.getElementById(
            "currentDurationDisplay"
          );
          if (currentDuration) {
            currentDuration.style.opacity = "1";
            currentDuration.style.animation = "";
          }
        }

        // Clear any existing polling interval when a new song is detected (including first song)
        if (fetchIntervalId) {
          clearInterval(fetchIntervalId);
          fetchIntervalId = null;
          debugLog(
            "Cleared polling interval - new song detected, switching to smart polling"
          );
        }
        musicActual = safeCurrentSong;

        // Get the next track's start time for accurate countdown
        const nextTrackStarttime =
          data.Next && data.Next.length > 0 ? data.Next[0].Starttime : null;

        refreshCurrentSong(
          safeCurrentSong,
          safeCurrentArtist,
          currentDurationVal,
          currentStartTime,
          nextTrackStarttime
        );

        // Display what is coming up next
        const toplayContainer = document.getElementById("toplaySong");
        if (!toplayContainer) {
          debugLog.error("toplaySong element not found in DOM");
          return;
        }
        toplayContainer.innerHTML = "";

        const toplayArray = data.Next
          ? data.Next.map((item) => ({
              Title: item.Title,
              Artist: item.Artist,
            }))
          : [];

        debugLog("Toplay array:", toplayArray);

        const maxToplayToDisplay = nrToplay;
        const limitedToplay = toplayArray
          ? toplayArray.slice(
              Math.max(0, toplayArray.length - maxToplayToDisplay)
            )
          : [];

        debugLog("Limited toplay:", limitedToplay);

        for (let i = 0; i < limitedToplay.length; i++) {
          const songInfo = limitedToplay[i];
          const textSize = "text-size-" + i;
          const article = document.createElement("article");
          article.classList.add("col-12");
          if (songInfo.Title.length > charsToplayTitle) {
            var string = songInfo.Title;
            var length = charsToplayTitle;
            var trimmedString = string.substring(0, length) + "...";
            songInfo.Title = trimmedString;
          }
          article.innerHTML = `
            <div class="music-info text-center">
              <p class="song ${textSize}">${
            songInfo.Artist
              ? `${songInfo.Artist} - ${songInfo.Title || ""}`
              : `${songInfo.Title || ""}`
          }</p>
            </div>
          `;
          toplayContainer.appendChild(article);
        }

        // Display the last played songs
        const historicContainer = document.getElementById("historicSong");
        if (!historicContainer) {
          debugLog.error("historicSong element not found in DOM");
          return;
        }
        historicContainer.innerHTML = "";

        const historyArray = data.Last
          ? data.Last.map((item) => ({
              Title: item.Title,
              Artist: item.Artist,
            }))
          : [];

        debugLog("History array:", historyArray);

        const maxHistoryToDisplay = nrHistory;
        const limitedHistory = historyArray
          ? historyArray.slice(
              Math.max(0, historyArray.length - maxHistoryToDisplay)
            )
          : [];

        debugLog("Limited history:", limitedHistory);

        for (let i = 0; i < limitedHistory.length; i++) {
          const songInfo = limitedHistory[i];
          const textSize = "text-size-" + i;
          const article = document.createElement("article");
          article.classList.add("col-12");
          if (songInfo.Title.length > charsToplayTitle) {
            var string = songInfo.Title;
            var length = charsToplayTitle;
            var trimmedString = string.substring(0, length) + "...";
            songInfo.Title = trimmedString;
          }
          article.innerHTML = `
                        <div class="music-info text-center">
                          <p class="song ${textSize}">${
            songInfo.Artist
              ? `${songInfo.Artist} - ${songInfo.Title || ""}`
              : `${songInfo.Title || ""}`
          }</p>
                        </div>
                      `;
          historicContainer.appendChild(article);
        }

        document.title = `${RADIO_NAME} | ${safeCurrentSong} - ${safeCurrentArtist}`;
      }
    }
  } catch (error) {
    debugLog.error("Error in getStreamingData:", error);
    debugLog("playlistData value:", playlistData);
    debugLog("Playlist endpoint:", PLAYLIST);

    // If this is a JSON format error, schedule a retry with limit
    if (
      (error.message && error.message.includes("JSON")) ||
      error.name === "SyntaxError"
    ) {
      if (jsonErrorRetryCount < MAX_JSON_ERROR_RETRIES) {
        jsonErrorRetryCount++;
        debugLog(
          `JSON format error detected - retry ${jsonErrorRetryCount}/${MAX_JSON_ERROR_RETRIES} in 15 seconds`
        );
        setTimeout(() => {
          debugLog(
            `Retrying playlist fetch after JSON format error (attempt ${jsonErrorRetryCount}/${MAX_JSON_ERROR_RETRIES})...`
          );
          getStreamingData();
        }, 15000);
      } else {
        debugLog.error(
          "Maximum JSON error retries reached. Please check the playlist.json format."
        );
        // Reset counter for future potential fixes
        setTimeout(() => {
          jsonErrorRetryCount = 0;
          debugLog(
            "Reset JSON error retry counter - will try again if new errors occur"
          );
        }, 300000); // Reset after 5 minutes
      }
    }
  }
}

function displayTrackCountdown(song, duration, startTime, nextTrackStarttime) {
  const currentDurationElem = document.getElementById("currentDurationDisplay");
  let countdownInterval;

  // Buffer time configuration - extends countdown to match actual song change timing
  // This compensates for the delay between when the countdown reaches 0:00 and the actual song change
  // User can configure this in .env with VITE_COUNTDOWN_BUFFER_SECONDS or in config.js
  const COUNTDOWN_BUFFER_SECONDS =
    CONFIG?.APP_CONFIG?.countdown_buffer_seconds || 8;

  if (!currentDurationElem) {
    // console.error("Current duration element not found.");
    return;
  }
  // Stop any previous countdown when a new song starts
  if (window.countdownInterval) {
    clearInterval(window.countdownInterval);
    window.countdownInterval = null;
    // debugLog.log("Previous countdown cleared.");
  }

  function startCountdown(duration, startTime, nextTrackStarttime) {
    // debugLog.log("Starting countdown with duration:", duration || "undefined");
    // debugLog.log("Song started at:", startTime || "undefined");
    // debugLog.log("Next track starts at:", nextTrackStarttime || "undefined");

    let totalSeconds = 0;

    if (typeof duration === "number") {
      totalSeconds = duration;
    } else if (
      typeof duration === "string" ||
      (typeof duration === "number" && duration.toString().includes(":"))
    ) {
      const durationStr = duration.toString();
      const parts = durationStr.split(":").map(Number);
      if (parts.length === 0 || parts.some(isNaN)) {
        // console.error("Invalid duration format:", duration);
        return;
      }
      if (parts.length === 3) {
        totalSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
      } else if (parts.length === 2) {
        totalSeconds = parts[0] * 60 + parts[1];
      } else if (parts.length === 1) {
        totalSeconds = parts[0];
      }
    } else {
      totalSeconds = parseInt(duration, 10);
    }

    // Add buffer time to extend countdown and match actual song change timing
    // This prevents the countdown from reaching 0:00 too early
    totalSeconds += COUNTDOWN_BUFFER_SECONDS;
    debugLog(
      `Added ${COUNTDOWN_BUFFER_SECONDS}s buffer to duration. Total: ${totalSeconds}s`
    );

    // Calculate elapsed time based on start time
    let elapsedSeconds = 0;
    let countdownStartTime = Date.now();

    if (startTime) {
      try {
        // Handle YYYY-MM-DD HH:MM:SS format
        // Convert to ISO format for better browser compatibility
        let isoStartTime = startTime;
        if (startTime.includes(" ") && !startTime.includes("T")) {
          isoStartTime = startTime.replace(" ", "T");
        }

        const songStartTime = new Date(isoStartTime).getTime();
        const now = Date.now();
        elapsedSeconds = Math.floor((now - songStartTime) / 1000);

        // Ensure elapsed time is not negative or greater than total duration
        elapsedSeconds = Math.max(0, Math.min(elapsedSeconds, totalSeconds));

        debugLog(`Song started at: ${startTime} (${isoStartTime})`);
        debugLog(
          `Song has been playing for ${elapsedSeconds} seconds out of ${totalSeconds} total`
        );
      } catch (error) {
        debugLog.warn(
          "Invalid startTime format, using current time as start:",
          error
        );
        debugLog.warn(
          "Expected format: YYYY-MM-DD HH:MM:SS, received:",
          startTime
        );
        elapsedSeconds = 0;
      }
    }

    // Calculate remaining time - use next track start time if available for maximum accuracy
    let remainingSeconds;
    let useNextTrackTiming = false;

    if (nextTrackStarttime) {
      try {
        // Convert next track start time to ISO format
        let isoNextStartTime = nextTrackStarttime;
        if (
          nextTrackStarttime.includes(" ") &&
          !nextTrackStarttime.includes("T")
        ) {
          isoNextStartTime = nextTrackStarttime.replace(" ", "T");
        }

        const nextTrackTime = new Date(isoNextStartTime).getTime();
        const now = Date.now();
        remainingSeconds = Math.floor((nextTrackTime - now) / 1000);

        // Only use next track timing if it's reasonable (positive and not too far in future)
        if (remainingSeconds > 0 && remainingSeconds < totalSeconds + 30) {
          useNextTrackTiming = true;
          debugLog(
            `Using next track start time: ${nextTrackStarttime} (${isoNextStartTime})`
          );
          debugLog(
            `Accurate remaining time: ${remainingSeconds} seconds until next track`
          );
        } else {
          debugLog.warn(
            `Next track timing seems unreasonable: ${remainingSeconds}s, falling back to duration calculation`
          );
        }
      } catch (error) {
        debugLog.warn(
          "Invalid nextTrackStarttime format, falling back to duration calculation:",
          error
        );
      }
    }

    // Fallback to duration-based calculation if next track timing not available or unreasonable
    if (!useNextTrackTiming) {
      remainingSeconds = totalSeconds - elapsedSeconds;
      debugLog(
        `Using duration-based calculation: ${remainingSeconds} seconds remaining`
      );
    }

    // Set up polling for new data before song ends
    let pollBeforeEnd;
    let pollDelay;

    if (useNextTrackTiming) {
      // With exact next track timing, we can be much more precise
      if (remainingSeconds <= 10) {
        pollBeforeEnd = 1; // Poll 1 second before for very short remaining time
      } else if (remainingSeconds <= 30) {
        pollBeforeEnd = Math.max(1, Math.floor(remainingSeconds * 0.3)); // Poll at 70% through
      } else {
        pollBeforeEnd = 10; // Poll 10 seconds before for longer tracks
      }
      pollDelay = Math.max(1000, (remainingSeconds - pollBeforeEnd) * 1000);
      debugLog(
        `Using precise next-track timing: polling in ${Math.floor(
          pollDelay / 1000
        )}s`
      );
    } else {
      // Fallback to duration-based logic
      if (totalSeconds < 10) {
        pollBeforeEnd = 1; // For very short jingles, poll 1 second before end
      } else if (totalSeconds < 30) {
        pollBeforeEnd = Math.max(1, Math.floor(remainingSeconds * 0.5)); // 50% for short tracks
      } else {
        pollBeforeEnd = 30; // 30 seconds for long tracks
      }
      pollDelay = Math.max(1000, (remainingSeconds - pollBeforeEnd) * 1000);
      debugLog(
        `Using duration-based timing: polling in ${Math.floor(
          pollDelay / 1000
        )}s`
      );
    }

    setTimeout(() => {
      // Clear any existing interval to implement smart polling
      if (fetchIntervalId) {
        clearInterval(fetchIntervalId);
        fetchIntervalId = null;
        debugLog("Cleared continuous polling - switching to smart polling");
      }

      // Use longer interval for localhost to be gentle on CORS proxies
      const isLocalhost =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";
      const interval = isLocalhost ? 5000 : 1000; // 5 seconds for localhost, 1 second for production

      fetchIntervalId = setInterval(getStreamingData, interval);
      debugLog(
        "Smart polling: Started interval getStreamingData for next song detection."
      );
    }, pollDelay);

    function updateCountdown() {
      const now = Date.now();
      const totalElapsed =
        elapsedSeconds + Math.floor((now - countdownStartTime) / 1000);
      const remaining = Math.max(totalSeconds - totalElapsed, 0);
      const min = Math.floor(remaining / 60);
      const sec = remaining % 60;

      // Show visual indicator when very close to song change (within buffer time)
      if (remaining > 0 && remaining <= COUNTDOWN_BUFFER_SECONDS) {
        // We're in the buffer zone - song change is imminent
        currentDurationElem.style.opacity = "0.8";
        currentDurationElem.style.color = "#ffd700"; // Golden color to indicate imminent change
      } else {
        // Reset styling for normal countdown
        currentDurationElem.style.opacity = "1";
        currentDurationElem.style.color = ""; // Reset to default
      }

      // When countdown reaches 0:00, show loading indicator and trigger aggressive polling
      if (remaining === 0 && !awaitingNextSong) {
        debugLog(
          "Countdown reached 0:00 - triggering immediate playlist refresh"
        );
        awaitingNextSong = true;

        // Show "Loading next song..." in the duration display
        currentDurationElem.textContent = "Next song...";
        currentDurationElem.style.opacity = "0.7";
        currentDurationElem.style.color = ""; // Reset color
        currentDurationElem.style.animation = "pulse 1.5s ease-in-out infinite";

        // Clear existing interval and start rapid polling for new song detection
        if (fetchIntervalId) {
          clearInterval(fetchIntervalId);
          fetchIntervalId = null;
        }

        // Start aggressive polling every 500ms when at 0:00 to catch song changes quickly
        fetchIntervalId = setInterval(getStreamingData, 500);

        // Also trigger an immediate check
        getStreamingData();

        // Safety timeout: if no new song is detected within 15 seconds,
        // force refresh and reset state to prevent infinite loading
        setTimeout(() => {
          if (awaitingNextSong) {
            debugLog("Timeout waiting for new song - forcing refresh");
            awaitingNextSong = false;
            currentDurationElem.textContent = "0:00";
            currentDurationElem.style.opacity = "1";
            currentDurationElem.style.animation = "";

            // Trigger one more immediate check
            getStreamingData();
          }
        }, 15000);
      } else if (remaining > 0) {
        // Normal countdown display
        currentDurationElem.textContent = `${min}:${sec
          .toString()
          .padStart(2, "0")}`;
        currentDurationElem.style.opacity = "1";
        currentDurationElem.style.animation = "";
      }
    }

    updateCountdown();

    // Start track time countdown every second
    window.countdownInterval = setInterval(() => {
      updateCountdown();
    }, 1000);
  }

  if (currentDurationElem && song && duration) {
    startCountdown(duration, startTime, nextTrackStarttime);
  }
}

async function fetchStreamingData(apiUrl) {
  try {
    debugLog("Attempting to fetch from URL:", apiUrl);

    // Detect if we're running on localhost
    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    let actualUrl = apiUrl;

    // If we're on localhost and have a relative URL, convert to production URL
    if (isLocalhost && !apiUrl.startsWith("http")) {
      // Convert relative URL to production URL for CORS proxy
      const productionBaseUrl =
        CONFIG?.APP_CONFIG?.app_url || "https://eajt.nl/kvpn/";
      actualUrl = new URL(apiUrl, productionBaseUrl).href;
      debugLog(
        `Localhost detected: Converting relative URL "${apiUrl}" to production URL: ${actualUrl}`
      );
    }

    const isExternalUrl =
      actualUrl.startsWith("http://") || actualUrl.startsWith("https://");

    let fetchUrl = actualUrl;
    let usingProxy = false;

    // If we're on localhost and trying to fetch external data, use CORS proxy
    if (isLocalhost && isExternalUrl && !actualUrl.includes("localhost")) {
      debugLog("Using CORS proxy for localhost development");

      // For eajt.nl, try the CORS-enabled PHP script first
      if (
        actualUrl.includes("eajt.nl") &&
        actualUrl.includes("playlist.json")
      ) {
        const corsProxyUrl = actualUrl.replace(
          "playlist.json",
          "cors-playlist.php"
        );
        debugLog("Trying CORS-enabled playlist proxy:", corsProxyUrl);

        try {
          fetchUrl = corsProxyUrl;
          const response = await fetch(fetchUrl, {
            method: "GET",
            headers: {
              "Cache-Control": "no-cache",
            },
          });

          if (response.ok) {
            debugLog("Successfully using cors-playlist.php");
            const text = await response.text();
            debugLog("CORS proxy response length:", text.length);
            debugLog("Raw response (first 100 chars):", text.substring(0, 100));

            // Check if the JSON appears to be truncated
            const trimmedText = text.trim();
            if (!trimmedText.endsWith("}") && !trimmedText.endsWith("]")) {
              debugLog.warn(
                "JSON appears to be truncated - does not end with } or ]"
              );
              throw new Error("JSON file appears to be truncated or corrupted");
            }

            const data = JSON.parse(text);
            debugLog(
              "Successfully fetched and parsed streaming data via CORS proxy"
            );
            return data;
          } else {
            debugLog.warn(
              "cors-playlist.php failed, falling back to generic CORS proxy"
            );
            throw new Error(`CORS proxy failed: ${response.status}`);
          }
        } catch (corsError) {
          debugLog.warn(
            "CORS proxy failed, trying generic proxies:",
            corsError.message
          );
        }
      }

      // Try multiple generic CORS proxy services for better reliability
      const corsProxies = [
        `https://api.allorigins.win/get?url=${encodeURIComponent(actualUrl)}`,
        `https://corsproxy.io/?${encodeURIComponent(actualUrl)}`,
        `https://cors-anywhere.herokuapp.com/${actualUrl}`,
      ];

      // Try each proxy until one works
      for (let i = 0; i < corsProxies.length; i++) {
        try {
          fetchUrl = corsProxies[i];
          usingProxy = true;
          debugLog(`Trying CORS proxy ${i + 1}:`, fetchUrl);
          break;
        } catch (error) {
          debugLog.warn(`CORS proxy ${i + 1} failed, trying next...`);
          if (i === corsProxies.length - 1) {
            throw error;
          }
        }
      }
    }

    // Fetch the data (either direct or via generic CORS proxy)
    const response = await fetch(fetchUrl, {
      method: "GET",
      headers: {
        "Cache-Control": "no-cache",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Error fetching playlist: ${response.status} ${response.statusText}`
      );
    }

    debugLog("Response status:", response.status);
    debugLog("Response content-type:", response.headers.get("content-type"));

    // Get the raw text first to inspect it
    const text = await response.text();

    // If we used generic CORS proxy, extract the actual content
    let actualText = text;
    if (usingProxy) {
      try {
        // Handle different proxy response formats
        if (fetchUrl.includes("allorigins.win")) {
          const proxyResponse = JSON.parse(text);
          actualText = proxyResponse.contents;
          debugLog("Extracted content from allorigins.win proxy");
        } else if (fetchUrl.includes("corsproxy.io")) {
          // corsproxy.io returns the content directly
          actualText = text;
          debugLog("Using content from corsproxy.io proxy");
        } else if (fetchUrl.includes("cors-anywhere")) {
          // cors-anywhere returns the content directly
          actualText = text;
          debugLog("Using content from cors-anywhere proxy");
        } else {
          // Fallback: try to parse as proxy response, otherwise use raw
          try {
            const proxyResponse = JSON.parse(text);
            actualText = proxyResponse.contents || proxyResponse.data || text;
          } catch {
            actualText = text;
          }
          debugLog("Extracted content from generic CORS proxy");
        }
      } catch (error) {
        debugLog.warn("Failed to parse CORS proxy response, using raw text");
        actualText = text;
      }
    } else {
      // Direct fetch or CORS-enabled PHP script
      actualText = text;
    }

    debugLog("Raw response length:", actualText.length);
    debugLog("Raw response (first 100 chars):", actualText.substring(0, 100));
    debugLog(
      "Raw response (last 100 chars):",
      actualText.substring(actualText.length - 100)
    );

    // Check if the JSON appears to be truncated
    const trimmedText = actualText.trim();
    if (!trimmedText.endsWith("}") && !trimmedText.endsWith("]")) {
      debugLog.warn("JSON appears to be truncated - does not end with } or ]");
      debugLog("Last 50 characters:", actualText.slice(-50));
      throw new Error("JSON file appears to be truncated or corrupted");
    }

    // Try to parse the JSON
    const data = JSON.parse(actualText);
    debugLog("Successfully fetched and parsed streaming data");
    return data;
  } catch (error) {
    console.error("fetchStreamingData error:", error);
    console.error("Failed URL:", actualUrl || apiUrl);

    // If we're on localhost and external fetch failed, try local fallback
    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    const isExternalUrl =
      (actualUrl || apiUrl).startsWith("http://") ||
      (actualUrl || apiUrl).startsWith("https://");

    if (
      isLocalhost &&
      isExternalUrl &&
      !(actualUrl || apiUrl).includes("localhost")
    ) {
      // Show user notification about playlist fetch failure
      showPlaylistErrorNotification(actualUrl || apiUrl, error);
      debugLog.warn(
        "External playlist fetch failed - user has been notified. Not using local fallback to avoid stale data."
      );
    } else {
      // Show notification for production failures too
      showPlaylistErrorNotification(actualUrl || apiUrl, error);
    }

    if (error instanceof SyntaxError) {
      console.error(
        "JSON parsing failed - the playlist.json file appears to be malformed or truncated"
      );
      console.error(
        "This could happen if the file is being uploaded while the app is trying to read it"
      );

      // Show user-friendly notification for JSON format errors
      showPlaylistFormatErrorNotification(actualUrl || apiUrl, error);

      return null;
    }

    return null;
  }
}

function setCopyright() {
  var appVersion = APP_VERSION;
  var appName = APP_NAME;
  var appAuthor = APP_AUTHOR;

  var copy = document.getElementById("copy");
  let jaar = new Date().getFullYear();
  copy.textContent =
    appName + " " + appVersion + " | ©" + jaar + " " + appAuthor;

  setupAudioPlayer();
}

async function setupAudioPlayer() {
  audio = new Audio(URL_STREAMING);
  audio.crossOrigin = "anonymous";
  audio.preload = "metadata"; // Changed from "none" to "metadata" for better buffering
  audio.autoplay = false;
  audio.loop = false;
  audio.muted = false;

  // Add some additional properties that might help with streaming
  if ("mozPreservesPitch" in audio) {
    audio.mozPreservesPitch = false;
  }
  if ("webkitPreservesPitch" in audio) {
    audio.webkitPreservesPitch = false;
  }

  setupAudioEventListeners();

  document.getElementById("volume").oninput = function () {
    changeVolumeLocalStorage(this.value);
    // debugLog.log("Volume slider changed to:", this.value);
    audio.volume = intToDecimal(this.value);
  };

  // Set up player button click listener
  const playerButton = document.getElementById("playerButton");
  if (playerButton) {
    playerButton.addEventListener("click", togglePlay);
    debugLog("Player button click listener attached");
  } else {
    debugLog.warn(
      "Player button not found - click functionality will not work"
    );
  }
}

function setupAudioEventListeners() {
  if (!audio) return;

  let retryCount = 0;
  let retryTimer = null;
  let bufferingTimeout = null;
  let healthCheckInterval = null;

  function resetButtonState() {
    const playerButton = document.getElementById("playerButton");
    if (playerButton && isPlayerIconPaused()) {
      debugLog("Stream stopped - resetting button state");
      setPlayerIcon(false); // Set to play icon
    }
  }

  function startHealthCheck() {
    if (healthCheckInterval) clearInterval(healthCheckInterval);
    healthCheckInterval = setInterval(() => {
      const playerButton = document.getElementById("playerButton");
      if (playerButton && isPlayerIconPaused()) {
        // Should be playing, check if it actually is
        if (audio.paused || audio.ended || audio.readyState < 2) {
          debugLog.warn("Health check failed - stream appears stopped");
          resetButtonState();
          // Try a quick recovery
          audio.load();
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise.catch(() => {});
          }
        }
      }
    }, 3000); // Check every 3 seconds
  }

  function stopHealthCheck() {
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval);
      healthCheckInterval = null;
    }
  }

  function handleStreamError(eventType = "unknown") {
    debugLog.warn(`Stream ${eventType} detected`);

    // Clear any existing timeouts to prevent loops
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    if (bufferingTimeout) {
      clearTimeout(bufferingTimeout);
      bufferingTimeout = null;
    }

    resetButtonState();

    if (retryCount < 3) {
      // Reduced from 6 to 3 retries
      retryCount++;
      debugLog.warn(
        `Stream error detected. Retrying in 10 seconds... (${retryCount}/3)`
      );

      // Shorter retry delay and simpler recovery
      retryTimer = setTimeout(() => {
        debugLog.log("Attempting stream recovery...");
        // Simple recovery - just try to play again without load()
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            debugLog.warn("Recovery failed, will try again:", error);
          });
        }
        retryTimer = null;
      }, 10000); // Reduced from 30 to 10 seconds
    } else {
      console.error("Maximum retry attempts reached. Stream may be offline.");
      resetButtonState();
      retryCount = 0; // Reset for future attempts
    }
  }

  // More intelligent event listeners - only handle real errors
  audio.addEventListener("error", (e) => {
    debugLog.warn("Audio error event:", e);
    handleStreamError("error");
  });

  // Only handle stalled if it persists (not during normal loading)
  audio.addEventListener("stalled", () => {
    setTimeout(() => {
      if (audio.readyState < 2) {
        // Only if still not loaded after delay
        debugLog.warn("Stream stalled - no data received");
        handleStreamError("stalled");
      }
    }, 10000); // Wait 10 seconds before treating as error
  });

  // Suspend is often normal, only treat as error if repeated
  let suspendCount = 0;
  audio.addEventListener("suspend", () => {
    suspendCount++;
    if (suspendCount > 3) {
      debugLog.warn("Multiple suspend events detected");
      handleStreamError("suspend");
      suspendCount = 0;
    }
  });

  // Abort and emptied are normal during stream loading - don't treat as errors
  audio.addEventListener("abort", () => {
    debugLog.log("Audio abort event (normal during loading)");
  });

  audio.addEventListener("emptied", () => {
    debugLog.log("Audio emptied event (normal during loading)");
  });

  // Monitor for unexpected pauses that might indicate buffering issues
  audio.addEventListener("pause", () => {
    stopHealthCheck(); // Stop health checking when paused

    // Only handle unexpected pauses (not user-initiated)
    if (!userInitiatedPause) {
      setTimeout(() => {
        const playerButton = document.getElementById("playerButton");
        if (playerButton && isPlayerIconPaused() && audio.paused) {
          debugLog.warn("Unexpected pause detected - stream may have stopped");
          resetButtonState();
        }
      }, 100);
    } else {
      debugLog.log("User-initiated pause detected - not treating as error");
      userInitiatedPause = false; // Reset the flag
    }
  });

  // Detect when stream actually starts playing successfully
  audio.addEventListener("playing", () => {
    debugLog.log("Stream playing successfully");
    retryCount = 0;
    suspendCount = 0; // Reset suspend counter when playing successfully
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    if (bufferingTimeout) {
      clearTimeout(bufferingTimeout);
      bufferingTimeout = null;
    }
    startHealthCheck(); // Start monitoring stream health
  });

  // Monitor buffering state with shorter timeout for faster recovery
  audio.addEventListener("waiting", () => {
    debugLog.log("Stream buffering...");
    // Only set timeout if not already buffering
    if (bufferingTimeout) clearTimeout(bufferingTimeout);
    bufferingTimeout = setTimeout(() => {
      // Only attempt recovery if still buffering and not paused by user
      if (audio.readyState < 3 && !audio.paused) {
        debugLog.warn("Buffering timeout - stream may be having issues");
        handleStreamError("buffering timeout");
      }
    }, 15000); // Increased to 15 seconds to avoid false positives
  });

  audio.addEventListener("canplaythrough", () => {
    debugLog.log("Stream ready to play through");
    if (bufferingTimeout) {
      clearTimeout(bufferingTimeout);
      bufferingTimeout = null;
    }
  });

  // Button state is now managed by togglePlay() function only
  // Removed onplay and onpause handlers to prevent race conditions

  audio.onvolumechange = function () {
    if (audio.volume > 0) {
      audio.muted = false;
    }
  };
}

function togglePlay() {
  const playerButton = document.getElementById("playerButton");
  const isPlaying = isPlayerIconPaused();
  // debugLog.log("Toggle play state:", isPlaying);
  if (isPlaying) {
    // debugLog.log("Pausing audio");
    setPlayerIcon(false); // Set to play icon
    playerButton.style.textShadow = "0 0 5px black";

    if (audio) {
      userInitiatedPause = true; // Set flag before pausing
      audio.pause();
      // Don't create a new audio object, just reset the current one
      audio.currentTime = 0;
    }

    if (!sleepTimerId) {
      removeSleepTimerElement();
    } else {
      cancelSleepTimer();
      debugLog.log("Sleep timer canceled on pause.");
    }
  } else {
    // debugLog.log("Playing audio");
    setPlayerIcon(true); // Set to pause icon
    playerButton.style.textShadow = "0 0 5px black";

    // Reuse existing audio object if available, otherwise create new one
    if (!audio) {
      audio = new Audio(URL_STREAMING);
      audio.crossOrigin = "anonymous";
      audio.preload = "none";
      audio.autoplay = false;
      audio.loop = false;
      audio.muted = false;

      // Attach event listeners for the new audio object
      setupAudioEventListeners();
    } else if (audio.src !== URL_STREAMING) {
      // Just update the source without recreating the object
      audio.src = URL_STREAMING;
    }

    setVolume(initialVol);

    // Handle the play promise properly
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((error) => {
        debugLog.warn("Audio play failed:", error);
        // Reset button state if play fails
        setPlayerIcon(false); // Set to play icon
      });
    }
  }
}

// Sleep timer logic
let sleepTimerId = null;
let sleepTimerCountdownId = null;
let sleepTimerEndTime = null;
const timerButton = document.getElementById("timerButton");

// Use the existing <span id="timerDisplay"> for countdown display
const timerCountdownDisplay = document.getElementById("timerDisplay");

function updateSleepTimerCountdown() {
  if (!sleepTimerEndTime) return;
  const now = Date.now();
  const remainingMs = sleepTimerEndTime - now;
  if (remainingMs <= 0) {
    timerCountdownDisplay.textContent = "";
    clearInterval(sleepTimerCountdownId);
    sleepTimerCountdownId = null;
    sleepTimerEndTime = null;
    return;
  }
  const remainingMin = Math.ceil(remainingMs / 60000);
  timerCountdownDisplay.textContent = `${remainingMin} min`;
}

timerButton.addEventListener("click", function () {
  // Create a modal dialog for timer selection
  const modal = document.createElement("div");
  modal.style.position = "fixed";
  modal.style.top = "0";
  modal.style.left = "0";
  modal.style.width = "100vw";
  modal.style.height = "100vh";
  modal.style.background = "rgba(0, 0, 0, 0.3)";
  modal.style.display = "flex";
  modal.style.alignItems = "center";
  modal.style.justifyContent = "center";
  modal.style.zIndex = "9999";

  // Allow closing modal by clicking outside the box
  modal.addEventListener("click", function (e) {
    if (e.target === modal) {
      document.body.removeChild(modal);
      cancelSleepTimer();
    }
  });

  const box = document.createElement("div");
  box.style.background = "#fff";
  box.style.padding = "24px";
  box.style.borderRadius = "8px";
  box.style.textAlign = "center";
  box.style.minWidth = "220px";

  box.innerHTML = `Set or stop a sleep timer. <strong>Audio gets dimmed by, this will be undone after the timer ends or is canceled.</strong><br><br>`;

  const validTimes = [15, 30, 45, 60];
  validTimes.forEach((min) => {
    const btn = document.createElement("button");
    btn.textContent = `${min} min`;
    btn.style.margin = "3px";
    btn.style.color = "white";
    btn.style.backgroundColor = "#031521";
    btn.style.border = "none";
    btn.style.borderRadius = "4px";
    btn.style.padding = "4px 6px";

    btn.onclick = () => {
      setSleepTimer(min);
      document.body.removeChild(modal);
    };
    box.appendChild(btn);
  });

  // Cancel button
  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Stop timer";
  cancelBtn.style.margin = "3px";
  cancelBtn.style.color = "white";
  cancelBtn.style.backgroundColor = "#031521";
  cancelBtn.style.border = "none";
  cancelBtn.style.borderRadius = "4px";
  cancelBtn.style.padding = "4px 6px";
  cancelBtn.onclick = () => {
    cancelSleepTimer();
    document.body.removeChild(modal);
    debugLog.log("Sleep timer canceled from modal.");
  };
  box.appendChild(document.createElement("br"));
  box.appendChild(cancelBtn);

  modal.appendChild(box);
  document.body.appendChild(modal);

  function setSleepTimer(selected) {
    if (sleepTimerId) clearTimeout(sleepTimerId);
    if (sleepTimerCountdownId) clearInterval(sleepTimerCountdownId);

    // Create timer circle container when sleep timer is actually set
    let timerCircleContainer = document.getElementById("timerCircleContainer");
    if (!timerCircleContainer) {
      timerCircleContainer = document.createElement("div");
      timerCircleContainer.id = "timerCircleContainer";
      timerCircleContainer.style.display = "flex";
      timerCircleContainer.style.alignItems = "center";
      timerCircleContainer.style.justifyContent = "center";
      timerCircleContainer.style.gap = "0.5rem";
      timerCountdownDisplay.parentNode.insertBefore(
        timerCircleContainer,
        timerCountdownDisplay.nextSibling
      );
    }
    // Only add the SVG if not already present
    if (!timerCircleContainer.querySelector("#timerCircleProgress")) {
      timerCircleContainer.innerHTML = `
        <svg width="32" height="32" viewBox="0 0 32 32" style="transform: rotate(-90deg);">
          <circle cx="15" cy="15" r="12" stroke="#ffffffff" stroke-width="1" fill="none" opacity="1"/>
          <circle id="timerCircleProgress" cx="15" cy="15" r="11" stroke="#26599dff" stroke-width="2" fill="none"
            stroke-dasharray="75.4" stroke-dashoffset="0" style="transition: stroke-dashoffset 1s linear;"/>
        </svg>
      `;
    }

    // Helper to set initial offset based on selected sleep time
    function setInitialCircleOffset(selected) {
      const circle = timerCircleContainer.querySelector("#timerCircleProgress");
      const circumference = 2 * Math.PI * 11; // r=11
      let offset = 0;
      if (selected === 15) {
        offset = circumference * 0.75; // 25% visible
      } else if (selected === 30) {
        offset = circumference * 0.5; // 50% visible
      } else if (selected === 45) {
        offset = circumference * 0.25; // 75% visible
      } else if (selected === 60) {
        offset = 0; // 100% visible
      }
      circle.style.strokeDashoffset = offset;
    }

    // Set initial offset for selected time
    setInitialCircleOffset(selected);

    sleepTimerEndTime = Date.now() + selected * 60 * 1000;
    // If not playing, start playing and toggle play/pause
    if (audio && audio.paused) {
      togglePlay();
      setVolume(dimVolumeSleeptimer);
    } else {
      setVolume(dimVolumeSleeptimer);
    }
    debugLog.log(
      "Sleep timer started, audio started. Volume set to " +
        dimVolumeSleeptimer +
        "%"
    );
    timerCountdownDisplay.classList.add("ml-2");
    timerCircleContainer.style.display = "flex";
    timerCircleContainer.style.alignItems = "center";
    timerCircleContainer.style.justifyContent = "center";

    // Circle animation setup
    const circle = timerCircleContainer.querySelector("#timerCircleProgress");
    const totalSeconds = selected * 60;
    const circumference = 2 * Math.PI * 11; // r=11
    circle.setAttribute("stroke-dasharray", circumference);

    // Set initial offset for selected time
    setInitialCircleOffset(selected);

    sleepTimerId = setTimeout(() => {
      if (audio && !audio.paused) {
        togglePlay();
        setVolume(100);
        debugLog.log("Sleep timer ended, audio paused. Volume set to 100%");
      }
      sleepTimerId = null;
      timerCircleContainer.style.display = "none";
      if (sleepTimerCountdownId) {
        clearInterval(sleepTimerCountdownId);
        sleepTimerCountdownId = null;
      }
      sleepTimerEndTime = null;
    }, selected * 60 * 1000);

    function updateSleepTimerCircle() {
      if (!sleepTimerEndTime) return;
      const now = Date.now();
      const remainingMs = sleepTimerEndTime - now;
      if (remainingMs <= 0) {
        circle.setAttribute("stroke-dashoffset", circumference);
        circle.setAttribute("stroke", "#fff"); // Set color to white when finished
        timerCircleContainer.style.display = "none";
        clearInterval(sleepTimerCountdownId);
        sleepTimerCountdownId = null;
        sleepTimerEndTime = null;
        return;
      }
      const elapsed = totalSeconds - Math.floor(remainingMs / 1000);
      // Progress: 0 (start) to 1 (end)
      const progress = elapsed / totalSeconds;
      // Initial offset for selected time
      let initialOffset = 0;
      if (selected === 15) {
        initialOffset = circumference * 0.75;
      } else if (selected === 30) {
        initialOffset = circumference * 0.5;
      } else if (selected === 45) {
        initialOffset = circumference * 0.25;
      } else {
        initialOffset = 0;
      }
      // Animate offset from initialOffset to circumference
      const offset = initialOffset + (circumference - initialOffset) * progress;
      circle.setAttribute("stroke-dashoffset", offset);
      circle.setAttribute("stroke", "#26599dff");
    }

    updateSleepTimerCircle();
    sleepTimerCountdownId = setInterval(updateSleepTimerCircle, 1000);
  }
});

function cancelSleepTimer() {
  if (sleepTimerId) {
    clearTimeout(sleepTimerId);
    sleepTimerId = null;
    timerCountdownDisplay.textContent = "";
    timerCountdownDisplay.classList.remove("ml-2");
    if (sleepTimerCountdownId) {
      clearInterval(sleepTimerCountdownId);
      sleepTimerCountdownId = null;
    }
    sleepTimerEndTime = null;

    removeSleepTimerElement();
    if (audio && !audio.paused) {
      setVolume(100);
      debugLog.log("Sleep timer canceled, volume restored to 100%");
    }
  } else {
    removeSleepTimerElement();
    debugLog.log("No sleep timer is set.");
  }
}

function removeSleepTimerElement() {
  const timerCircleElement = document.getElementById("timerCircleContainer");
  if (timerCircleElement) {
    debugLog.log("Found sleep timer element, and set display none");
    timerCircleElement.style.display = "none";
    timerCircleElement.innerHTML = "";
  }
}

function intToDecimal(vol) {
  return vol / 100;
}

function decimalToInt(vol) {
  return vol * 100;
}

function mute() {
  if (!audio.muted) {
    document.getElementById("volIndicator").innerHTML = 0;
    document.getElementById("volume").value = 0;
    audio.volume = 0;
    audio.muted = true;
  } else {
    var localVolume = localStorage.getItem("volume");
    document.getElementById("volIndicator").innerHTML = localVolume;
    document.getElementById("volume").value = localVolume;
    audio.volume = intToDecimal(localVolume);
    audio.muted = false;
  }
}
