const RADIO_NAME = "KVPN";
// Change Stream URL Here, Supports, ICECAST, ZENO, SHOUTCAST, RADIOJAR and any other stream service.
const URL_STREAMING = "https://k-one.pvpjamz.com"; //https://stream.pvpjamz.com
// Playlist data json url
const PlayerData = "playlist.json";
// DOM control
// Page functionality as plain functions instead of a class

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
            playerButton.classList.remove("fa-pause-circle");
            playerButton.classList.add("fa-play-circle");
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

function changeVolumeIndicator(volume) {
  if (typeof Storage !== "undefined") {
    localStorage.setItem("volume", volume);
  }
}

function setVolume() {
  if (typeof Storage !== "undefined") {
    const volumeLocalStorage = localStorage.getItem("volume") || 20;
    // document.getElementById("volume").value = volumeLocalStorage;
  }
}

// Remove the Page class and use functions directly
let musicaAtual = null;
let audio; // Global variable for the audio element

window.addEventListener("load", () => {
  changeTitlePage();
  getStreamingData();
  setCopyright();
});

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

      if (safeCurrentSong !== musicaAtual) {
        console.log("Updating current song:", safeCurrentSong);
        if (audio) {
          audio.src = URL_STREAMING;
          audio.play();
        }
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
        musicaAtual = safeCurrentSong;

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
  console.log("displayTrackCountdown called with:", song, duration);

  if (!currentDurationElem) {
    console.error("Current duration element not found.");
    return;
  }
  function startCountdown(duration) {
    console.log("Starting countdown with duration:", duration || "undefined");
    let startTime = Date.now();
    let totalSeconds = 0;

    if (typeof duration === "number") {
      // If duration is a number but formatted as mm:ss (e.g., 3:47), treat as string
      totalSeconds = duration;
    } else if (
      typeof duration === "string" ||
      (typeof duration === "number" && duration.toString().includes(":"))
    ) {
      // Handle mm:ss or hh:mm:ss format
      const durationStr = duration.toString();
      const parts = durationStr.split(":").map(Number);
      // console.log("Parsed duration parts:", parts);
      if (parts.length === 0 || parts.some(isNaN)) {
        console.error("Invalid duration format:", duration);
        return;
      }
      if (parts.length === 3) {
        // hh:mm:ss
        totalSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
      } else if (parts.length === 2) {
        // mm:ss
        totalSeconds = parts[0] * 60 + parts[1];
      } else if (parts.length === 1) {
        totalSeconds = parts[0];
      }
    } else {
      console.warn(
        "Duration is not a valid type, using it directly:",
        duration
      );
      totalSeconds = parseInt(duration, 10);
    }

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
    if (countdownInterval) {
      clearInterval(countdownInterval);
    }
    countdownInterval = setInterval(() => {
      updateCountdown();
      // Do not stop or reload the stream here; only update the countdown display.
      // The countdown will reset when displayTrackCountdown is called for a new song.
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
    // console.log(data);
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
    console.log("Offline is not ideal for this app.");
  });

  // getStreamingData();
  // Set timer for renewing playlist info
  const streamingInterval = setInterval(getStreamingData, 5000);
  console.log("fetching playlist.json");
  setupAudioPlayer();
}

async function setupAudioPlayer() {
  audio = new Audio(URL_STREAMING);
  audio.crossOrigin = "anonymous"; // Fix CORS issue
  audio.preload = "none"; // Preload the audio for faster playback
  audio.autoplay = false; // Autoplay is disabled for user interaction
  audio.loop = false; // Disable looping for streaming
  audio.muted = false; // Ensure audio is not muted
  audio.volume = 0.2; // Set initial volume to 20%

  // console.log(audio.buffered);
  // console.log(audio.readyState);

  setVolume();
  // changeVolumeIndicator(decimalToInt(audio.volume));

  // On play, change the button to pause
  audio.onplay = function () {
    var btn = document.getElementById("playerButton");
    var btn_play = document.getElementById("buttonPlay");
    if (btn.className === "fa fa-play") {
      btn.className = "fa fa-pause";
      btn_play.firstChild.data = "PAUSE";
    }
  };

  // On pause, change the button to play
  audio.onpause = function () {
    var btn = document.getElementById("playerButton");
    var btn_play = document.getElementById("buttonPlay");
    if (btn.className === "fa fa-pause") {
      btn.className = "fa fa-play";
      btn_play.firstChild.data = "PLAY";
    }
  };

  //Unmute when volume changed
  audio.onvolumechange = function () {
    if (audio.volume > 0) {
      audio.muted = false;
    }
  };

  audio.onerror = function () {
    var reactie = confirm(
      "Stream Down or network error. Try loading it again?"
    );

    if (reactie) {
      window.location.reload();
    }
  };
}

function togglePlay() {
  const playerButton = document.getElementById("playerButton");
  const isPlaying = playerButton.classList.contains("fa-pause-circle");

  if (isPlaying) {
    playerButton.classList.remove("fa-pause-circle");
    playerButton.classList.add("fa-play-circle");
    playerButton.style.textShadow = "0 0 5px black";

    audio.pause();
    // audio.src = ""; // This stops the stream from downloading
    audio = new Audio(); // Reset the audio element to stop the stream download
    // console.log("toggelPlay: Audio paused");
  } else {
    playerButton.classList.remove("fa-play-circle");
    playerButton.classList.add("fa-pause-circle");
    playerButton.style.textShadow = "0 0 5px black";

    audio = new Audio(URL_STREAMING); // This restarts the stream download

    getStreamingData();

    audio.play(); // Play the audio when it can play
  }
}

// document.getElementById("volume").oninput = function () {
//   changeVolumeIndicator(this.value);
//   audio.volume = intToDecimal(this.value);
// };

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

function mute() {
  if (!audio.muted) {
    // document.getElementById("volIndicator").innerHTML = 0;
    // document.getElementById("volume").value = 0;
    audio.volume = 0;
    audio.muted = true;
  } else {
    var localVolume = localStorage.getItem("volume");
    // document.getElementById("volIndicator").innerHTML = localVolume;
    // document.getElementById("volume").value = localVolume;
    audio.volume = intToDecimal(localVolume);
    audio.muted = false;
  }
}

function intToDecimal(vol) {
  return vol / 100;
}

function decimalToInt(vol) {
  return vol * 100;
}

function subscribeToPush() {
  if ("serviceWorker" in navigator && "PushManager" in window) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.pushManager
        .subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlB64ToUint8Array("YOUR_PUBLIC_KEY"),
        })
        .then((subscription) => {
          // Send subscription to your server
        })
        .catch((error) => {
          console.error("Push subscription failed:", error);
        });
    });
  }
}

function urlB64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
