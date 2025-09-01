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
  audio;

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
      console.log("Service Worker registered successfully:", registration);
    } catch (err) {
      console.log("Service Worker registration failed:", err);
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
    console.warn(`Stream URL ${url} returned status: ${response.status}`);
  } catch (error) {
    // Ignore error, will alert below
  }
  alert("Streaming server is not reachable at the moment.");
}

function setVolume(volume) {
  // console.log("setVolume gets value:", volume);
  // console.log("isPhone:", isPhone);
  if (!audio) {
    console.warn("Audio object not yet initialized, skipping setVolume");
    return;
  }

  if (typeof Storage !== "undefined" && !isPhone) {
    const volumeLocalStorage =
      parseInt(localStorage.getItem("volume"), 10) || 100;
    console.log("Volume from localStorage or default:", volumeLocalStorage);
    const volumeElement = document.getElementById("volume");
    if (volumeElement) {
      volumeElement.value = volumeLocalStorage;
    }
    audio.volume = intToDecimal(volumeLocalStorage);
  } else {
    audio.volume = intToDecimal(volume);
  }
  // console.log("setVolume sets value:", audio.volume);
}

function changeVolumeLocalStorage(volume) {
  if (typeof Storage !== "undefined" && !isPhone) {
    // console.log("Storing volume in localStorage:", volume);
    localStorage.setItem("volume", volume);
  }
}

function initializePlayer() {
  console.log("Initializing player...");

  changeTitlePage();
  setCopyright(); // This calls setupAudioPlayer

  // DON'T show the player yet - wait for first successful playlist fetch
  // The player will be shown when hideLoader() is called after first data load

  console.log("Player initialization complete, waiting for playlist data...");

  // Wait for service worker to be ready before starting data fetching
  waitForServiceWorkerThenStart();
}

async function waitForServiceWorkerThenStart() {
  console.log("Waiting for service worker to be ready...");

  if ("serviceWorker" in navigator) {
    try {
      // Wait for service worker to be ready
      const registration = await navigator.serviceWorker.ready;
      console.log("Service worker is ready:", registration);

      // Small delay to ensure everything is properly initialized
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.log("Service worker not available or failed:", error);
      // Continue anyway after a short delay
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  } else {
    console.log("Service worker not supported, continuing without it");
  }

  // Start fetching streaming data
  console.log(
    "Starting to fetch streaming data with playlistData:",
    playlistData
  );

  // Use longer interval for localhost to be gentle on CORS proxies
  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";
  const interval = isLocalhost ? 5000 : 1000; // 5 seconds for localhost, 1 second for production

  console.log(`Using polling interval: ${interval}ms`);
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
  console.log("🔧 Loading app configuration...");

  // Try to load environment variables first
  let envLoaded = false;
  if (window.envLoader) {
    envLoaded = await window.envLoader.loadEnv();

    if (envLoaded) {
      // Override CONFIG with environment variables
      window.CONFIG = window.envLoader.createConfig();
      console.log("✅ Using .env configuration");

      // Validate environment configuration
      window.envLoader.validateConfig();
    } else {
      console.log("📋 .env not found, trying config.js fallback...");

      // Try to load config.js dynamically
      try {
        await loadConfigJS();
        console.log("✅ Using config.js fallback");
      } catch (error) {
        console.error("❌ Neither .env nor config.js found!");
        console.error("📋 Please run: ./setup-env.sh or create config.js");

        // Create a minimal CONFIG to prevent crashes
        window.CONFIG = {
          PASSWORD_HASH: "default-hash-please-configure",
          APP_CONFIG: {
            scope: "/",
            background_color: "#031521",
            theme_color: "#031521",
            station_name: "Setup Required",
            stream_url: "https://example.com",
            app_url: "https://example.com",
            default_volume: 100,
            dim_volume_sleep_timer: 50,
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
    console.warn(
      "⚠️  Using default password hash! Please configure your own password."
    );
    console.warn('📋 Generate hash with: await hashString("your-password")');
  }

  // Validate APP_CONFIG for personalized settings
  if (CONFIG?.APP_CONFIG) {
    if (
      CONFIG.APP_CONFIG.station_name === "Your Radio Name" ||
      CONFIG.APP_CONFIG.stream_url === "https://your-stream-url.com" ||
      CONFIG.APP_CONFIG.app_url === "https://your-domain.com/app/"
    ) {
      console.warn(
        "⚠️  Using default APP_CONFIG values! Please customize your radio settings."
      );
      console.warn(
        "📋 Edit config.js to set your station name, stream URL, and app URL."
      );
    } else {
      console.log(
        "✅ Custom APP_CONFIG detected - using personalized settings."
      );
    }
  } else {
    console.info("ℹ️  No APP_CONFIG found - using manifest.json defaults.");
  }

  // Now load manifest for app metadata
  console.log("📄 Loading manifest.json...");
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
      console.log("Manifest loaded successfully:", manifest);

      // Assign manifest values to global variables
      APP_VERSION = manifest.version;
      APP_NAME = manifest.name;
      APP_DESCRIPTION = manifest.description;
      APP_AUTHOR = manifest.author;

      // Override with CONFIG values if available, otherwise use manifest defaults
      if (CONFIG?.APP_CONFIG) {
        console.log("Overriding manifest values with CONFIG.APP_CONFIG...");
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
        console.log("Using manifest values (CONFIG.APP_CONFIG not found)...");
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
      console.log("playlistData set to:", playlistData);

      // Log all key variables to console for debugging
      console.log("APP_VERSION:", APP_VERSION);
      console.log("APP_NAME:", APP_NAME);
      console.log("APP_DESCRIPTION:", APP_DESCRIPTION);
      console.log("APP_AUTHOR:", APP_AUTHOR);
      console.log("RADIO_NAME:", RADIO_NAME);
      console.log("STREAM_URL:", STREAM_URL);
      console.log("DEFAULT_VOLUME:", DEFAULT_VOLUME);
      console.log("THEME_COLOR:", THEME_COLOR);
      console.log("PLAYLIST:", PLAYLIST);
      console.log("METADATA:", METADATA);
      console.log("APP_URL:", APP_URL);
      console.log("DIM_VOLUME_SLEEP_TIMER:", DIM_VOLUME_SLEEP_TIMER);

      // Set up streaming URL after loading from manifest
      if (typeof STREAM_URL === "string" && STREAM_URL.trim() !== "") {
        setStreamingUrl(STREAM_URL);
      } else {
        console.warn(
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

      // After loading app variables, proceed with password check
      checkPassword();
    })
    .catch((error) => {
      console.error("Error loading manifest:", error);
      alert(
        "Failed to load application configuration. Please check your network connection and try again."
      );
    });
}
function checkPassword() {
  // Check if the password has already been accepted
  if (localStorage.getItem("passwordAccepted") === correctPasswordHash) {
    // console.log("Password already accepted.");
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
            // console.log("Password accepted.");
            localStorage.setItem("passwordAccepted", correctPasswordHash);
            initializePlayer();
          } else {
            // console.warn("Incorrect password.");
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

function refreshCurrentSong(song, artist, duration) {
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

      displayTrackCountdown(song, duration);

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
            playerButton.classList.remove("fa-circle-pause");
            playerButton.classList.add("fa-circle-play");
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

async function getStreamingData() {
  try {
    console.log("Fetching streaming data from:", playlistData);
    let data = await fetchStreamingData(playlistData);

    console.log("Received data:", data);

    if (data) {
      // Hide loader on first successful data fetch
      if (isFirstLoad) {
        console.log("First playlist data loaded successfully - hiding loader");
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
        // console.log("Updating current song:", safeCurrentSong);
        if (musicActual !== null && fetchIntervalId) {
          clearInterval(fetchIntervalId);
          fetchIntervalId = null;
          // console.log("Cleared previous interval for fetching data.");
        }
        musicActual = safeCurrentSong;

        refreshCurrentSong(
          safeCurrentSong,
          safeCurrentArtist,
          currentDurationVal
        );

        // Display what is coming up next
        const toplayContainer = document.getElementById("toplaySong");
        if (!toplayContainer) {
          console.error("toplaySong element not found in DOM");
          return;
        }
        toplayContainer.innerHTML = "";

        const toplayArray = data.Next
          ? data.Next.map((item) => ({
              Title: item.Title,
              Artist: item.Artist,
            }))
          : [];

        console.log("Toplay array:", toplayArray);

        const maxToplayToDisplay = nrToplay;
        const limitedToplay = toplayArray
          ? toplayArray.slice(
              Math.max(0, toplayArray.length - maxToplayToDisplay)
            )
          : [];

        console.log("Limited toplay:", limitedToplay);

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
          console.error("historicSong element not found in DOM");
          return;
        }
        historicContainer.innerHTML = "";

        const historyArray = data.Last
          ? data.Last.map((item) => ({
              Title: item.Title,
              Artist: item.Artist,
            }))
          : [];

        console.log("History array:", historyArray);

        const maxHistoryToDisplay = nrHistory;
        const limitedHistory = historyArray
          ? historyArray.slice(
              Math.max(0, historyArray.length - maxHistoryToDisplay)
            )
          : [];

        console.log("Limited history:", limitedHistory);

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
    console.error("Error in getStreamingData:", error);
    console.log("playlistData value:", playlistData);
    console.log("Playlist endpoint:", PLAYLIST);
  }
}

function displayTrackCountdown(song, duration) {
  const currentDurationElem = document.getElementById("currentDurationDisplay");
  let countdownInterval;

  if (!currentDurationElem) {
    // console.error("Current duration element not found.");
    return;
  }
  // Stop any previous countdown when a new song starts
  if (window.countdownInterval) {
    clearInterval(window.countdownInterval);
    window.countdownInterval = null;
    // console.log("Previous countdown cleared.");
  }

  function startCountdown(duration) {
    // console.log("Starting countdown with duration:", duration || "undefined");
    let startTime = Date.now();
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

    // Start new interval for data fetch after coutdown ends
    setTimeout(() => {
      if (fetchIntervalId) return; // Prevent multiple intervals

      // Use longer interval for localhost to be gentle on CORS proxies
      const isLocalhost =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";
      const interval = isLocalhost ? 5000 : 1000; // 5 seconds for localhost, 1 second for production

      fetchIntervalId = setInterval(getStreamingData, interval);
      // console.log("Interval getStreamingData restarted after song ended.");
    }, totalSeconds * 1000 - 2000);

    function updateCountdown() {
      let elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(totalSeconds - elapsed, 0);
      const min = Math.floor(remaining / 60);
      const sec = remaining % 60;
      currentDurationElem.textContent = `${min}:${sec
        .toString()
        .padStart(2, "0")}`;
    }

    updateCountdown();

    // Start track time countdown every second
    window.countdownInterval = setInterval(() => {
      updateCountdown();
    }, 1000);
  }

  if (currentDurationElem && song && duration) {
    startCountdown(duration);
  }
}

async function fetchStreamingData(apiUrl) {
  try {
    console.log("Attempting to fetch from URL:", apiUrl);

    // Detect if we're running on localhost and the URL is external
    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    const isExternalUrl =
      apiUrl.startsWith("http://") || apiUrl.startsWith("https://");

    let fetchUrl = apiUrl;
    let usingProxy = false;

    // If we're on localhost and trying to fetch external data, use CORS proxy
    if (isLocalhost && isExternalUrl && !apiUrl.includes("localhost")) {
      console.log("Using CORS proxy for localhost development");

      // Try multiple CORS proxy services for better reliability
      const corsProxies = [
        `https://api.allorigins.win/get?url=${encodeURIComponent(apiUrl)}`,
        `https://corsproxy.io/?${encodeURIComponent(apiUrl)}`,
        `https://cors-anywhere.herokuapp.com/${apiUrl}`,
      ];

      // Try each proxy until one works
      for (let i = 0; i < corsProxies.length; i++) {
        try {
          fetchUrl = corsProxies[i];
          usingProxy = true;
          console.log(`Trying CORS proxy ${i + 1}:`, fetchUrl);
          break;
        } catch (error) {
          console.warn(`CORS proxy ${i + 1} failed, trying next...`);
          if (i === corsProxies.length - 1) {
            throw error;
          }
        }
      }
    }

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

    console.log("Response status:", response.status);
    console.log("Response content-type:", response.headers.get("content-type"));

    // Get the raw text first to inspect it
    const text = await response.text();

    // If we used CORS proxy, extract the actual content
    let actualText = text;
    if (usingProxy) {
      try {
        // Handle different proxy response formats
        if (fetchUrl.includes("allorigins.win")) {
          const proxyResponse = JSON.parse(text);
          actualText = proxyResponse.contents;
          console.log("Extracted content from allorigins.win proxy");
        } else if (fetchUrl.includes("corsproxy.io")) {
          // corsproxy.io returns the content directly
          actualText = text;
          console.log("Using content from corsproxy.io proxy");
        } else if (fetchUrl.includes("cors-anywhere")) {
          // cors-anywhere returns the content directly
          actualText = text;
          console.log("Using content from cors-anywhere proxy");
        } else {
          // Fallback: try to parse as proxy response, otherwise use raw
          try {
            const proxyResponse = JSON.parse(text);
            actualText = proxyResponse.contents || proxyResponse.data || text;
          } catch {
            actualText = text;
          }
          console.log("Extracted content from generic CORS proxy");
        }
      } catch (error) {
        console.warn("Failed to parse CORS proxy response, using raw text");
        actualText = text;
      }
    }
    console.log("Raw response length:", actualText.length);
    console.log(
      "Raw response (first 100 chars):",
      actualText.substring(0, 100)
    );
    console.log(
      "Raw response (last 100 chars):",
      actualText.substring(actualText.length - 100)
    );

    // Check if the JSON appears to be truncated
    const trimmedText = actualText.trim();
    if (!trimmedText.endsWith("}") && !trimmedText.endsWith("]")) {
      console.warn("JSON appears to be truncated - does not end with } or ]");
      console.log("Last 50 characters:", actualText.slice(-50));
      throw new Error("JSON file appears to be truncated or corrupted");
    }

    // Try to parse the JSON
    const data = JSON.parse(actualText);
    console.log("Successfully fetched and parsed streaming data");
    return data;
  } catch (error) {
    console.error("fetchStreamingData error:", error);
    console.error("Failed URL:", apiUrl);

    // If we're on localhost and external fetch failed, try local fallback
    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    const isExternalUrl =
      apiUrl.startsWith("http://") || apiUrl.startsWith("https://");

    if (isLocalhost && isExternalUrl && !apiUrl.includes("localhost")) {
      console.warn(
        "External fetch failed, trying local playlist.json fallback"
      );
      try {
        return await fetchStreamingData("playlist.json");
      } catch (fallbackError) {
        console.error("Local fallback also failed:", fallbackError);
      }
    }

    if (error instanceof SyntaxError) {
      console.error(
        "JSON parsing failed - the playlist.json file appears to be malformed or truncated"
      );
      console.error(
        "This could happen if the file is being uploaded while the app is trying to read it"
      );
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
  audio.preload = "none";
  audio.autoplay = false;
  audio.loop = false;
  audio.muted = false;

  setupAudioEventListeners();

  document.getElementById("volume").oninput = function () {
    changeVolumeLocalStorage(this.value);
    // console.log("Volume slider changed to:", this.value);
    audio.volume = intToDecimal(this.value);
  };
}

function setupAudioEventListeners() {
  if (!audio) return;

  let retryCount = 0;
  let retryTimer = null;

  function handleStreamError() {
    if (retryCount < 6) {
      retryCount++;
      console.warn(
        `Stream error detected. Retrying in 10 seconds... (${retryCount}/6)`
      );
      retryTimer = setTimeout(() => {
        audio.src = URL_STREAMING;
        audio.load();
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {}); // Try to play again
        }
      }, 10000);
    } else {
      clearTimeout(retryTimer);
      retryTimer = null;
      const reactie = confirm(
        "Stream Down or network error. Do you want to retry again?"
      );
      if (reactie) {
        retryCount = 0;
        audio.src = URL_STREAMING;
        audio.load();
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {});
        }
      } else {
        audio.pause();
        audio.src = "";
      }
    }
  }

  audio.addEventListener("error", handleStreamError);
  audio.addEventListener("stalled", handleStreamError);

  audio.onplay = function () {
    var btn = document.getElementById("playerButton");
    var btn_play = document.getElementById("buttonPlay");
    if (btn.className === "fa fa-play") {
      btn.className = "fa fa-pause";
      btn_play.firstChild.data = "PAUSE";
    }
    retryCount = 0; // Reset retry count on successful play
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
  };

  audio.onpause = function () {
    var btn = document.getElementById("playerButton");
    var btn_play = document.getElementById("buttonPlay");
    if (btn.className === "fa fa-pause") {
      btn.className = "fa fa-play";
      btn_play.firstChild.data = "PLAY";
    }
  };

  audio.onvolumechange = function () {
    if (audio.volume > 0) {
      audio.muted = false;
    }
  };
}

function togglePlay() {
  const playerButton = document.getElementById("playerButton");
  const isPlaying = playerButton.classList.contains("fa-circle-pause");
  // console.log("Toggle play state:", isPlaying);
  if (isPlaying) {
    // console.log("Pausing audio");
    playerButton.classList.remove("fa-circle-pause");
    playerButton.classList.add("fa-circle-play");
    playerButton.style.textShadow = "0 0 5px black";

    if (audio) {
      audio.pause();
      // Don't create a new audio object, just reset the current one
      audio.currentTime = 0;
    }

    if (!sleepTimerId) {
      removeSleepTimerElement();
    } else {
      cancelSleepTimer();
      console.log("Sleep timer canceled on pause.");
    }
  } else {
    // console.log("Playing audio");
    playerButton.classList.remove("fa-circle-play");
    playerButton.classList.add("fa-circle-pause");
    playerButton.style.textShadow = "0 0 5px black";

    // Reuse existing audio object if available, otherwise create new one
    if (!audio || audio.src !== URL_STREAMING) {
      if (audio) {
        // Properly clean up old audio object
        audio.pause();
        audio.src = "";
        audio.load();
      }
      audio = new Audio(URL_STREAMING);
      audio.crossOrigin = "anonymous";
      audio.preload = "none";
      audio.autoplay = false;
      audio.loop = false;
      audio.muted = false;

      // Re-attach event listeners for the new audio object
      setupAudioEventListeners();
    }

    setVolume(initialVol);

    // Handle the play promise properly
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((error) => {
        console.warn("Audio play failed:", error);
        // Reset button state if play fails
        playerButton.classList.remove("fa-circle-pause");
        playerButton.classList.add("fa-circle-play");
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
    console.log("Sleep timer canceled from modal.");
  };
  box.appendChild(document.createElement("br"));
  box.appendChild(cancelBtn);

  modal.appendChild(box);
  document.body.appendChild(modal);

  // Add a circular countdown animation for the sleep timer
  // Create SVG circle if not already present
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
        <circle cx="15" cy="15" r="12" stroke="#ffffffff" stroke-width="1" fill="none" opacity="0.4"/>
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
    } else {
      offset = 0; // 100% visible
    }
    circle.setAttribute("stroke-dasharray", circumference);
    circle.setAttribute("stroke-dashoffset", offset);
    circle.setAttribute("stroke", "#26599dff");
  }

  // Show the circle only if a timer is running or being set
  timerCircleContainer.style.display = "flex";
  timerCircleContainer.style.alignItems = "center";
  timerCircleContainer.style.justifyContent = "center";

  // When a button is clicked, set initial offset
  validTimes.forEach((min) => {
    const btn = box.querySelector(`button:contains('${min} min')`);
    if (btn) {
      btn.onmouseover = () => setInitialCircleOffset(min);
      btn.onfocus = () => setInitialCircleOffset(min);
    }
  });

  // Set initial offset for default (first) button
  setInitialCircleOffset(validTimes[0]);

  function setSleepTimer(selected) {
    if (sleepTimerId) clearTimeout(sleepTimerId);
    if (sleepTimerCountdownId) clearInterval(sleepTimerCountdownId);
    sleepTimerEndTime = Date.now() + selected * 60 * 1000;
    // If not playing, start playing and toggle play/pause
    if (audio && audio.paused) {
      togglePlay();
      setVolume(dimVolumeSleeptimer);
    } else {
      setVolume(dimVolumeSleeptimer);
    }
    console.log(
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
        console.log("Sleep timer ended, audio paused. Volume set to 100%");
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
      console.log("Sleep timer ended, audio paused. Volume set to 100%");
    }
  } else {
    removeSleepTimerElement();
    console.log("No sleep timer is set.");
  }
}

function removeSleepTimerElement() {
  const timerCircleElement = document.getElementById("timerCircleContainer");
  if (timerCircleElement) {
    console.log("Found sleep timer element, and set display none");
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

// function subscribeToPush() {
//   if ("serviceWorker" in navigator && "PushManager" in window) {
//     navigator.serviceWorker.ready.then((registration) => {
//       registration.pushManager
//         .subscribe({
//           userVisibleOnly: true,
//           applicationServerKey: urlB64ToUint8Array("YOUR_PUBLIC_KEY"),
//         })
//         .then((subscription) => {
//           // Send subscription to your server
//         })
//         .catch((error) => {
//           console.error("Push subscription failed:", error);
//         });
//     });
//   }
// }

// function urlB64ToUint8Array(base64String) {
//   const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
//   const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
//   const rawData = window.atob(base64);
//   const outputArray = new Uint8Array(rawData.length);
//   for (let i = 0; i < rawData.length; ++i) {
//     outputArray[i] = rawData.charCodeAt(i);
//   }
//   return outputArray;
// }
