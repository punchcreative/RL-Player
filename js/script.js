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

const correctPasswordHash =
  "dc18b42a2ea8cf3fb313c20d32945a631ec4fa450b16f9d1567f933e16bd0565";
const correctPasswordHashPromise = Promise.resolve(correctPasswordHash);

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

// Playlist data json url will be set after manifest loads
let PlayerData = "playlist.json"; // Default fallback
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

  // Hide loader first
  hideLoader();

  // Ensure player is visible
  const player = document.getElementById("player");
  if (player) {
    player.style.display = "";
    console.log("Player element made visible");
  } else {
    console.error("Player element not found in DOM");
  }

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
  console.log("Starting to fetch streaming data with PlayerData:", PlayerData);
  getStreamingData();
  fetchIntervalId = setInterval(getStreamingData, 1000);
}
function loadAppVars() {
  console.log("Loading app variables from manifest...");
  // Fetch the manifest file for app configuration
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
      RADIO_NAME = manifest.custom_radio_config.station_name;
      STREAM_URL = manifest.custom_radio_config.stream_url;
      DEFAULT_VOLUME = manifest.custom_radio_config.default_volume;
      THEME_COLOR = manifest.custom_radio_config.theme_color;
      PLAYLIST = manifest.api_endpoints.playlist;
      METADATA = manifest.api_endpoints.metadata;
      APP_URL = manifest.api_endpoints.app_url;
      DIM_VOLUME_SLEEP_TIMER =
        manifest.custom_radio_config.dim_volume_sleep_timer;

      // Set PlayerData after PLAYLIST is loaded from manifest
      PlayerData = PLAYLIST || "playlist.json";
      console.log("PlayerData set to:", PlayerData);

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

      // MediaSession API does not provide direct events for phone calls or interruptions.
      // It only allows you to handle media controls (play, pause, etc.) from OS-level controls.
      // Pausing/resuming on phone call interruptions is handled by the browser/OS automatically for <audio> elements.
      // You cannot detect a phone call directly via JavaScript or MediaSession API due to privacy/security reasons.

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
async function getStreamingData() {
  try {
    console.log("Fetching streaming data from:", PlayerData);
    let data = await fetchStreamingData(PlayerData);

    console.log("Received data:", data);

    if (data) {
      // hideLoader();
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
    console.log("PlayerData value:", PlayerData);
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
      fetchIntervalId = setInterval(getStreamingData, 1000);
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

    const response = await fetch(apiUrl, {
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
    console.log("Raw response length:", text.length);
    console.log("Raw response (first 100 chars):", text.substring(0, 100));
    console.log(
      "Raw response (last 100 chars):",
      text.substring(text.length - 100)
    );

    // Check if the JSON appears to be truncated
    const trimmedText = text.trim();
    if (!trimmedText.endsWith("}") && !trimmedText.endsWith("]")) {
      console.warn("JSON appears to be truncated - does not end with } or ]");
      console.log("Last 50 characters:", text.slice(-50));
      throw new Error("JSON file appears to be truncated or corrupted");
    }

    // Try to parse the JSON
    const data = JSON.parse(text);
    console.log("Successfully fetched and parsed streaming data");
    return data;
  } catch (error) {
    console.error("fetchStreamingData error:", error);
    console.error("Failed URL:", apiUrl);

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
        audio.play().catch(() => {}); // Try to play again
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
        audio.play().catch(() => {});
      } else {
        audio.pause();
        audio.src = "";
      }
    }
  }

  audio.addEventListener("error", handleStreamError);
  audio.addEventListener("stalled", handleStreamError);

  document.getElementById("volume").oninput = function () {
    changeVolumeLocalStorage(this.value);
    // console.log("Volume slider changed to:", this.value);
    audio.volume = intToDecimal(this.value);
  };

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

    audio.pause();
    // audio.load(); // Clear the source instead of creating new Audio object

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

    audio = new Audio(URL_STREAMING);
    setVolume(initialVol);
    audio.play();
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
