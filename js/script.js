const RADIO_NAME = "KVPN";
// Change Stream URL Here, Supports, ICECAST, ZENO, SHOUTCAST, RADIOJAR and any other stream service.
const URL_STREAMING = "https://k-one.pvpjamz.com"; //https://stream.pvpjamz.com
// Playlist data json url
const PlayerData = "./playlist.json";

let musicaAtual = null;
let audio; // Global variable for the audio element

window.addEventListener("load", () => {
  console.log("Page loaded");
  const page = new Page();
  page.changeTitlePage();
  page.setVolume();

  // Load playlist data
  setCopyright();

  const player = new Player();
  // Start the player onload, but most browsers will block autoplay
  // player.pause();
});

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
        }, 500);

        setTimeout(function () {
          currentSong.classList.remove("fade-in");
          currentArtist.classList.remove("fade-in");
          currentDuration.classList.remove("fade-in");
        }, 1000);
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

async function getStreamingData() {
  try {
    let data = await fetchStreamingData(PlayerData);

    if (data) {
      const page = new Page();
      const currentSong = data.Current.Title;
      const currentArtist = data.Current.Artist;
      const currentDuration = data.Current.Duration;
      // console.log("getStreamingData - Current Song:", currentSong);
      // console.log("getStreamingData - Current Artist:", currentArtist);

      if (currentSong.length > 25) {
        var string = currentSong;
        var length = 25;
        const trimmedString = string.substring(0, length) + "...";
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

        const maxToplayToDisplay = 5; // Adjust as needed
        const limitedToplay = toplayArray.slice(
          Math.max(0, toplayArray.length - maxToplayToDisplay)
        );

        for (let i = 0; i < limitedToplay.length; i++) {
          const songInfo = limitedToplay[i];
          const textSize = "text-size-" + i;
          const article = document.createElement("article");
          article.classList.add("col-12");
          if (songInfo.Title.length > 20) {
            var string = songInfo.Title;
            var length = 20;
            const trimmedString = string.substring(0, length) + "...";
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

        const maxHistoryToDisplay = 3; // Adjust as needed
        const limitedHistory = historyArray.slice(
          Math.max(0, historyArray.length - maxHistoryToDisplay)
        );

        for (let i = 0; i < limitedHistory.length; i++) {
          const songInfo = limitedHistory[i];
          const textSize = "text-size-" + i;
          const article = document.createElement("article");
          article.classList.add("col-12");
          if (songInfo.Title.length > 20) {
            var string = songInfo.Title;
            var length = 20;
            const trimmedString = string.substring(0, length) + "...";
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
    console.log("fetchStreamingData error:", error);
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

  getStreamingData();
  // Set timer for renewing playlist info
  const streamingInterval = setInterval(getStreamingData, 10000);

  setupAudioPlayer();
}

function togglePlay() {
  const playerButton = document.getElementById("playerButton");
  const isPlaying = playerButton.classList.contains("fa-pause-circle");

  if (isPlaying) {
    playerButton.classList.remove("fa-pause-circle");
    playerButton.classList.add("fa-play-circle");
    playerButton.style.textShadow = "0 0 5px black";
    audio.pause();
    audio.suspend();
    audio.src = ""; // This stops the stream from downloading
    // console.log("Audio paused");
  } else {
    playerButton.classList.remove("fa-play-circle");
    playerButton.classList.add("fa-pause-circle");
    playerButton.style.textShadow = "0 0 5px black";
    //audio.load(); // Do not use this when streaming.
    audio.src = URL_STREAMING; // This restarts the stream download
    audio.play();
    // console.log("Audio playing");
  }
}

function setupAudioPlayer() {
  audio = new Audio(URL_STREAMING);
  audio.crossOrigin = "anonymous"; // Fix CORS issue
  audio.preload = "none"; // Preload the audio for faster playback
  audio.autoplay = false; // Autoplay is disabled for user interaction
  audio.loop = false; // Disable looping for streaming
  audio.muted = false; // Ensure audio is not muted

  // On play, change the button to pause
  audio.onplay = function () {
    var botao = document.getElementById("playerButton");
    var bplay = document.getElementById("buttonPlay");
    if (botao.className === "fa fa-play") {
      botao.className = "fa fa-pause";
      bplay.firstChild.data = "PAUSAR";
    }
  };

  // On pause, change the button to play
  audio.onpause = function () {
    var botao = document.getElementById("playerButton");
    var bplay = document.getElementById("buttonPlay");
    if (botao.className === "fa fa-pause") {
      botao.className = "fa fa-play";
      bplay.firstChild.data = "PLAY";
    }
  };

  //Unmute when volume changed
  audio.onvolumechange = function () {
    if (audio.volume > 0) {
      audio.muted = false;
    }
  };

  audio.onerror = function () {
    var confirmacao = confirm(
      "Stream Down or network error. Try loading it again?"
    );

    if (confirmacao) {
      window.location.reload();
    }
  };
}

// Player control
class Player {
  constructor() {
    this.play = function () {
      // Set volume level to start with, get it from the input fields value in index.html
      var defaultVolume = 20; //document.getElementById("volume").value;
      audio.volume = intToDecimal(defaultVolume);

      if (localStorage.getItem("volume") !== null) {
        audio.volume = intToDecimal(localStorage.getItem("volume"));
        page.changeVolumeIndicator(audio.volume);
      } else {
        audio.volume = intToDecimal(defaultVolume);
        page.changeVolumeIndicator(audio.volume);
      }

      audio.play();
      audio.muted = false;

      togglePlay();

      // getStreamingData();
    };

    this.pause = function () {
      audio.pause();
    };
  }
}

// var sourceElement = document.querySelector("source");
// var originalSourceUrl = sourceElement.getAttribute("src");
// var audioElement = document.querySelector("audio");

// function pause() {
//     sourceElement.setAttribute("src", "");
//     audioElement.pause();
//     // settimeout, otherwise pause event is not raised normally
//     setTimeout(function () {
//         audioElement.load(); // This stops the stream from downloading
//     });
// }

// function play() {
//     if (!sourceElement.getAttribute("src")) {
//         sourceElement.setAttribute("src", originalSourceUrl);
//         audioElement.load(); // This restarts the stream download
//     }
//     audioElement.play();
// }

document.getElementById("volume").oninput = function () {
  // audio.volume = intToDecimal(this.value);
  var page = new Page();
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
