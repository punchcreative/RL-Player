const RADIO_NAME = "KVPN";
// Change Stream URL Here, Supports, ICECAST, ZENO, SHOUTCAST, RADIOJAR and any other stream service.
const URL_STREAMING = "https://k-one.pvpjamz.com"; //https://stream.pvpjamz.com
// Playlist data json url
const PlayerData = "https://eajt.nl/kvpn/playlist.json";

let musicaAtual = null;

window.addEventListener("load", () => {
  const page = new Page();
  page.changeTitlePage();
  page.setVolume();

  getStreamingData();

  const player = new Player();
  // Start the player onload, but most browsers will block autoplay
  // player.play();

  const copy = document.getElementById("copy");
  // Define interval to renew playlist data in millisecsonds
  const streamingInterval = setInterval(getStreamingData, 10000);
  let jaar = new Date().getFullYear();
  copy.textContent = "RL Player | ©" + jaar + " " + RADIO_NAME;
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
        document.title = `${RADIO_NAME} | ${safeCurrentSong} - ${safeCurrentArtist}`;

        page.refreshCurrentSong(
          safeCurrentSong,
          safeCurrentArtist,
          safeCurrentDuration
        );

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
          article.innerHTML = `
                        <div class="music-info text-center">
                          <p class="song ${textSize}">${
            songInfo.Artist || ""
          } - ${songInfo.Title || ""}</p>
                        </div>
                      `;
          toplayContainer.appendChild(article);
        }

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
        `Error stream url: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    // console.log(data);
    return data;
  } catch (error) {
    console.log("Error playlistdata laden:", error);
    return null;
  }
}

function changeImageSize(url, size) {
  const parts = url.split("/");
  const filename = parts.pop();
  const newFilename = `${size}${filename.substring(filename.lastIndexOf("."))}`;
  return parts.join("/") + "/" + newFilename;
}

// AUDIO

// Variable for playing the audio stream url
var audio = new Audio(URL_STREAMING);

// Player control
class Player {
  constructor() {
    this.play = function () {
      audio.play();

      var defaultVolume = document.getElementById("volume").value;

      if (typeof Storage !== "undefined") {
        if (localStorage.getItem("volume") !== null) {
          audio.volume = intToDecimal(localStorage.getItem("volume"));
        } else {
          audio.volume = intToDecimal(defaultVolume);
        }
      } else {
        audio.volume = intToDecimal(defaultVolume);
      }

      togglePlay();

      getStreamingData();
    };

    this.pause = function () {
      audio.pause();
    };
  }
}

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

// Unmute when volume changed
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

document.getElementById("volume").oninput = function () {
  audio.volume = intToDecimal(this.value);

  var page = new Page();
  page.changeVolumeIndicator(this.value);
};

function togglePlay() {
  const playerButton = document.getElementById("playerButton");
  const isPlaying = playerButton.classList.contains("fa-pause-circle");

  if (isPlaying) {
    playerButton.classList.remove("fa-pause-circle");
    playerButton.classList.add("fa-play-circle");
    playerButton.style.textShadow = "0 0 5px black";
    audio.pause();
  } else {
    playerButton.classList.remove("fa-play-circle");
    playerButton.classList.add("fa-pause-circle");
    playerButton.style.textShadow = "0 0 5px black";
    audio.load();
    audio.play();
  }
}

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

// document.addEventListener("keydown", function (event) {
//   var key = event.key;
//   var slideVolume = document.getElementById("volume");
//   var page = new Page();

//   switch (key) {
//     // Arrow up
//     case "ArrowUp":
//       volumeUp();
//       slideVolume.value = decimalToInt(audio.volume);
//       page.changeVolumeIndicator(decimalToInt(audio.volume));
//       break;
//     // Arrow down
//     case "ArrowDown":
//       volumeDown();
//       slideVolume.value = decimalToInt(audio.volume);
//       page.changeVolumeIndicator(decimalToInt(audio.volume));
//       break;
//     // Spacebar
//     case " ":
//     case "Spacebar":
//       togglePlay();
//       break;
//     // P
//     case "p":
//     case "P":
//       togglePlay();
//       break;
//     // M
//     case "m":
//     case "M":
//       mute();
//       break;
//     // Numeric keys 0-9
//     case "0":
//     case "1":
//     case "2":
//     case "3":
//     case "4":
//     case "5":
//     case "6":
//     case "7":
//     case "8":
//     case "9":
//       var volumeValue = parseInt(key);
//       audio.volume = volumeValue / 10;
//       slideVolume.value = volumeValue * 10;
//       page.changeVolumeIndicator(volumeValue * 10);
//       break;
//   }
// });

function intToDecimal(vol) {
  return vol / 100;
}

function decimalToInt(vol) {
  return vol * 100;
}
