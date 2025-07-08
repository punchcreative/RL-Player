const RADIO_NAME = "KVPN";
// Change Stream URL Here, Supports, ICECAST, ZENO, SHOUTCAST, RADIOJAR and any other stream service.
const URL_STREAMING = "https://k-one.pvpjamz.com"; //https://stream.pvpjamz.com
// Playlist data json url
const PlayerData = "playlist.json";
// DOM control
class Page {
  constructor() {
    this.changeTitlePage = function (title = RADIO_NAME) {
      document.title = title;
    };

    this.refreshCurrentSong = function (song, artist, duration) {
      const currentSong = document.getElementById("currentSong");
      const currentArtist = document.getElementById("currentArtist");

      if (
        song !== currentSong.textContent ||
        artist !== currentArtist.textContent
      ) {
        currentSong.classList.add("fade-out");
        currentArtist.classList.add("fade-out");

        setTimeout(function () {
          currentSong.textContent = song;
          currentArtist.textContent = artist;
          currentDuration.textContent = duration;

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
                audio.src = ""; // This stops the stream from downloading
                // console.log("stop mediaelement triggered");
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
    };

    this.changeVolumeIndicator = function (volume) {
      if (typeof Storage !== "undefined") {
        localStorage.setItem("volume", volume);
      }
    };

    this.setVolume = function () {
      if (typeof Storage !== "undefined") {
        const volumeLocalStorage = localStorage.getItem("volume") || 20;
        document.getElementById("volume").value = volumeLocalStorage;
      }
    };
  }
}

let page = new Page();

let musicaAtual = null;
let audio; // Global variable for the audio element

window.addEventListener("load", () => {
  page = new Page();
  page.changeTitlePage();
  // page.setVolume();
  getStreamingData();
  setCopyright();
});

async function getStreamingData() {
  try {
    let data = await fetchStreamingData(PlayerData);

    if (data) {
      // const page = new Page();
      var currentSong = data.Current.Title;
      var charsToplayTitle = 25; // Number of characters to display
      var charsPlayingTitle = 40; // Number of characters to display
      var nrToplay = 5; // Number of songs to display
      var nrHistory = 3; // Number of songs to display
      const currentArtist = data.Current.Artist;
      const currentDuration = data.Current.Duration;
      // console.log("getStreamingData - Current Song:", currentSong);
      // console.log("getStreamingData - Current Artist:", currentArtist);

      if (currentSong.length > charsPlayingTitle) {
        var string = currentSong;
        var length = charsPlayingTitle;
        var trimmedString = string.substring(0, length) + "...";
        currentSong = trimmedString;
      }

      const safeCurrentSong = (currentSong || "")
        .replace(/'/g, "'")
        .replace(/&/g, "&");
      const safeCurrentArtist = (currentArtist || "")
        .replace(/'/g, "'")
        .replace(/&/g, "&");
      const safeCurrentDuration = (currentDuration || "")
        .replace(/'/g, "'")
        .replace(/&/g, "&");

      if (safeCurrentSong !== musicaAtual) {
        page.refreshCurrentSong(
          safeCurrentSong,
          safeCurrentArtist,
          safeCurrentDuration
        );
        // Display what is comming up next
        const toplayContainer = document.getElementById("toplaySong");
        toplayContainer.innerHTML = "";

        const toplayArray = data.Next
          ? data.Next.map((item) => ({
              Title: item.Title,
              Artist: item.Artist,
            }))
          : data.Next;

        // console.log("Toplay Array:", toplayArray);

        const maxToplayToDisplay = nrToplay; // Adjust as needed
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

        // console.log("History Array:", historyArray);

        const maxHistoryToDisplay = nrHistory; // Adjust as needed
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

  // const page = new Page();
  page.setVolume();
  page.changeVolumeIndicator(decimalToInt(audio.volume));

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
    // console.log("toggelPlay: Audio playing");
  }
}

document.getElementById("volume").oninput = function () {
  // const page = new Page();
  page.changeVolumeIndicator(this.value);
  audio.volume = intToDecimal(this.value);
};

function volumeUp() {
  var vol = audio.volume;
  if (audio) {
    if (audio.volume >= 0 && audio.volume < 1) {
      audio.volume = (vol + 0.01).toFixed(2);
    }
  }
}

function volumeDown() {
  var vol = audio.volume;
  if (audio) {
    if (audio.volume >= 0.01 && audio.volume <= 1) {
      audio.volume = (vol - 0.01).toFixed(2);
    }
  }
}

function mute() {
  if (!audio.muted) {
    // document.getElementById("volIndicator").innerHTML = 0;
    document.getElementById("volume").value = 0;
    audio.volume = 0;
    audio.muted = true;
  } else {
    var localVolume = localStorage.getItem("volume");
    // document.getElementById("volIndicator").innerHTML = localVolume;
    document.getElementById("volume").value = localVolume;
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
