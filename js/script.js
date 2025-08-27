// import md5 from "md5";

const RADIO_NAME = "KVPN";
// Change Stream URL Here, Supports, ICECAST, ZENO, SHOUTCAST, RADIOJAR and any other stream service.
// List of stream URLs to try
const STREAM_URLS = ["https://k-one.pvpjamz.com"];

// Function to check if a stream URL is reachable
async function getReachableStreamUrl(urls) {
  for (const url of urls) {
    try {
      // Try to fetch the stream with a GET request (HEAD often not supported by streaming servers)
      const response = await fetch(url, { method: "GET", mode: "cors" });
      // Check if the response is OK (not 404, etc.)
      if (response.ok) {
        return url;
      } else {
        console.warn(`Stream URL ${url} returned status: ${response.status}`);
      }
    } catch (error) {
      // Continue to next URL
    }
  }
  return null;
}

// Initialize the streaming URL
let URL_STREAMING = STREAM_URLS[0];

getReachableStreamUrl(STREAM_URLS).then((reachableUrl) => {
  if (reachableUrl) {
    URL_STREAMING = reachableUrl;
    console.log("Using streaming URL:", URL_STREAMING);
  } else {
    alert("No streaming server is reachable at the moment.");
  }
});
// Playlist data json url
const PlayerData = "playlist.json";

// set the initial volume to start at
let initialVol;

function isMobileDevice() {
  return /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

// Optionally, you can log or use the mobile check:
if (isMobileDevice()) {
  console.log("Mobile device detected.");
  initialVol = 100;
} else {
  if (typeof Storage !== "undefined") {
    const volumeLocalStorage = localStorage.getItem("volume") || 20;
    console.log("Volume from localStorage or default:", volumeLocalStorage);
    document.getElementById("volume").value = volumeLocalStorage;
    initialVol = intToDecimal(volumeLocalStorage);
  } else {
    initialVol = 20;
  }
}
console.log("Initial volume set to:", initialVol);

// Helper function to hash a string using SHA-256 and return a hex string
async function sha256(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Store the correct password hash
const correctPasswordHashPromise = sha256("Th3#1by~R");

function initializePlayer() {
  changeTitlePage();
  fetchIntervalId = setInterval(getStreamingData, 1000);
  setCopyright();
}

function checkPassword() {
  // Check if the password has already been accepted
  if (localStorage.getItem("passwordAccepted") === "true") {
    console.log("Password already accepted.");
    // Continue with the rest of your application logic here
    initializePlayer();
  } else {
    const password = prompt(
      "This stream is for private use only. Please enter the password to access this content:"
    );

    // Check if the password is correct using SHA-256
    sha256(password).then((hash) => {
      correctPasswordHashPromise.then((correctHash) => {
        if (hash === correctHash) {
          console.log("Password accepted.");
          localStorage.setItem("passwordAccepted", "true");
          // Continue with the rest of your application logic here
          initializePlayer();
        } else {
          console.warn("Incorrect password.");
          document.body.innerHTML =
            "<strong>Access Denied</strong><p>Incorrect password.</p>";
        }
      });
    });
  }
}

// Call the checkPassword function when the page loads
window.addEventListener("load", checkPassword);

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
              src: "https://eajt.nl/kvpn/albumart/art-00.jpg",
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
let audio; // Global variable for the audio element
let fetchIntervalId = null;

async function getStreamingData() {
  try {
    let data = await fetchStreamingData(PlayerData);

    if (data) {
      var currentSong = data.Current.Title;
      var charsToplayTitle = 25;
      var charsPlayingTitle = 40;
      var nrToplay = 5;
      var nrHistory = 3;
      const currentArtistVal = data.Current.Artist;
      let currentDurationVal = data.Current.Duration;

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
        toplayContainer.innerHTML = "";

        const toplayArray = data.Next
          ? data.Next.map((item) => ({
              Title: item.Title,
              Artist: item.Artist,
            }))
          : data.Next;

        const maxToplayToDisplay = nrToplay;
        const limitedToplay = toplayArray.slice(
          Math.max(0, toplayArray.length - maxToplayToDisplay)
        );

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
            songInfo.Artist || ""
          } - ${songInfo.Title || ""}</p>
                        </div>
                      `;
          toplayContainer.appendChild(article);
        }

        // Display the last played songs
        const historicContainer = document.getElementById("historicSong");
        historicContainer.innerHTML = "";

        const historyArray = data.Last
          ? data.Last.map((item) => ({
              Title: item.Title,
              Artist: item.Artist,
            }))
          : data.Last;

        const maxHistoryToDisplay = nrHistory;
        const limitedHistory = historyArray.slice(
          Math.max(0, historyArray.length - maxHistoryToDisplay)
        );

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
            songInfo.Artist || ""
          } - ${songInfo.Title || ""}</p>
                        </div>
                      `;
          historicContainer.appendChild(article);
        }

        document.title = `${RADIO_NAME} | ${safeCurrentSong} - ${safeCurrentArtist}`;
      }
    }
  } catch (error) {
    console.log("Error playlist uitlezen:", error);
  }
}

function displayTrackCountdown(song, duration) {
  const currentDurationElem = document.getElementById("currentDurationDisplay");
  let countdownInterval;

  if (!currentDurationElem) {
    console.error("Current duration element not found.");
    return;
  }
  // Stop any previous countdown when a new song starts
  if (window.countdownInterval) {
    clearInterval(window.countdownInterval);
    window.countdownInterval = null;
    console.log("Previous countdown cleared.");
  }

  function startCountdown(duration) {
    console.log("Starting countdown with duration:", duration || "undefined");
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
        console.error("Invalid duration format:", duration);
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
      console.log("Interval getStreamingData restarted after song ended.");
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
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(
        `Error fetching playlist: ${response.status} ${response.statusText}`
      );
    }
    const data = await response.json();
    // console.log("Fetched streaming data:", data);
    return data;
  } catch (error) {
    console.log("fetchStreamingData error", error);
    // Handle the error here, e.g., show an error message to the user or log it
    // You can also return a default value or null if needed
    return null;
  }
}

function setCopyright() {
  $.get("manifest.json", function (manifest) {
    var appVersion = manifest.version;
    var appName = manifest.name;
    var appDescription = manifest.description;
    var appAuthor = manifest.author;

    var copy = document.getElementById("copy");
    let jaar = new Date().getFullYear();
    copy.textContent =
      appName + " " + appVersion + " | ©" + jaar + " " + appAuthor;
  }).fail(function () {
    console.log("Being offline is not ideal for this app ;-)");
  });

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
    changeVolumeIndicator(this.value);
    audio.volume = intToDecimal(this.value);
  };

  setVolume(initialVol);
  changeVolumeIndicator(decimalToInt(initialVol));

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

  if (isPlaying) {
    playerButton.classList.remove("fa-circle-pause");
    playerButton.classList.add("fa-circle-play");
    playerButton.style.textShadow = "0 0 5px black";

    audio.pause();
    audio = new Audio();
  } else {
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

  const box = document.createElement("div");
  box.style.background = "#fff";
  box.style.padding = "24px";
  box.style.borderRadius = "8px";
  box.style.textAlign = "center";
  box.style.minWidth = "220px";

  box.innerHTML = `<strong>Set sleep timer:</strong><br><br>`;

  const validTimes = [2, 30, 45, 60];
  validTimes.forEach((min) => {
    const btn = document.createElement("button");
    btn.textContent = `${min} min`;
    btn.style.margin = "3px";
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
  cancelBtn.onclick = () => {
    cancelSleepTimer();
    document.body.removeChild(modal);
  };
  box.appendChild(document.createElement("br"));
  box.appendChild(cancelBtn);

  modal.appendChild(box);
  document.body.appendChild(modal);

  function setSleepTimer(selected) {
    if (sleepTimerId) clearTimeout(sleepTimerId);
    if (sleepTimerCountdownId) clearInterval(sleepTimerCountdownId);
    sleepTimerEndTime = Date.now() + selected * 60 * 1000;
    // If not playing, start playing and toggle play/pause
    if (audio && audio.paused) {
      togglePlay();
    }
    // Add ml-2 class to timerCountdownDisplay when timer starts
    timerCountdownDisplay.classList.add("ml-2");

    sleepTimerId = setTimeout(() => {
      if (audio && !audio.paused) {
        audio.pause();
        document
          .getElementById("playerButton")
          .classList.remove("fa-circle-pause");
        document.getElementById("playerButton").classList.add("fa-circle-play");
      }
      sleepTimerId = null;
      timerCountdownDisplay.textContent = "";
      // Remove ml-2 class when timer is canceled/stopped
      timerCountdownDisplay.classList.remove("ml-2");
      if (sleepTimerCountdownId) {
        clearInterval(sleepTimerCountdownId);
        sleepTimerCountdownId = null;
      }
      sleepTimerEndTime = null;
    }, selected * 60 * 1000);

    function updateSleepTimerCountdownDisplay() {
      if (!sleepTimerEndTime) return;
      const now = Date.now();
      const remainingMs = sleepTimerEndTime - now;
      if (remainingMs <= 0) {
        timerCountdownDisplay.textContent = "";
        timerCountdownDisplay.classList.remove("ml-2");
        clearInterval(sleepTimerCountdownId);
        sleepTimerCountdownId = null;
        sleepTimerEndTime = null;
        return;
      }
      const remainingSec = Math.floor(remainingMs / 1000);
      const min = Math.floor(remainingSec / 60);
      const sec = remainingSec % 60;
      timerCountdownDisplay.textContent = `${min}:${sec
        .toString()
        .padStart(2, "0")}`;
    }

    updateSleepTimerCountdownDisplay();
    sleepTimerCountdownId = setInterval(updateSleepTimerCountdownDisplay, 1000);
  }

  function cancelSleepTimer() {
    if (sleepTimerId) {
      clearTimeout(sleepTimerId);
      sleepTimerId = null;
      timerCountdownDisplay.textContent = "";
      if (sleepTimerCountdownId) {
        clearInterval(sleepTimerCountdownId);
        sleepTimerCountdownId = null;
      }
      sleepTimerEndTime = null;
      // alert("Sleep timer canceled.");
    } else {
      alert("No sleep timer is set.");
    }
  }
});

function intToDecimal(vol) {
  return vol / 100;
}

function decimalToInt(vol) {
  return vol * 100;
}

function setVolume(volume) {
  if (typeof Storage !== "undefined") {
    const volumeLocalStorage = localStorage.getItem("volume") || 100;
    console.log("Volume from localStorage or default:", volumeLocalStorage);
    document.getElementById("volume").value = volumeLocalStorage;
    FontFace;
  } else {
    audio.volume = intToDecimal(volume);
  }
}

function changeVolumeIndicator(volume) {
  if (typeof Storage !== "undefined") {
    localStorage.setItem("volume", volume);
  }
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

// function volumeUp() {
//   var vol = audio.volume;
//   if (audio) {
//     if (audio.volume >= 0 && audio.volume < 1) {
//       audio.volume = (vol + 0.01).toFixed(2);
//     }
//   }
// }

// function volumeDown() {
//   var vol = audio.volume;
//   if (audio) {
//     if (audio.volume >= 0.01 && audio.volume <= 1) {
//       audio.volume = (vol - 0.01).toFixed(2);
//     }
//   }
// }

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
