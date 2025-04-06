const RADIO_NAME = "KVPN";

// Change Stream URL Here, Supports, ICECAST, ZENO, SHOUTCAST, RADIOJAR and any other stream service.
const URL_STREAMING = "http://kvpn:8000/stream";

//API URL /
const PlayerData = "playlist.json";

// Visit https://api.vagalume.com.br/docs/ to get your API key
// const API_KEY = "18fe07917957c289983464588aabddfb";

let userInteracted = true;

let musicaAtual = null;

// Cache para a API do iTunes
const cache = {};

window.addEventListener("load", () => {
  const page = new Page();
  page.changeTitlePage();
  page.setVolume();

  const player = new Player();
  // player.play();

  getStreamingData();

  // Define interval voor vernieuwen playlist data
  const streamingInterval = setInterval(getStreamingData, 5000);

  // Ajusta a altura da capa do álbum para ser igual à sua largura
  //   const coverArt = document.querySelector(".cover-album"); // Use querySelector para selecionar o elemento
  //   if (coverArt) {
  //     // Adiciona uma verificação para garantir que o elemento exista
  //     coverArt.style.height = `${coverArt.offsetWidth}px`;
  //   } else {
  //     console.warn("Elemento .cover-album não encontrado.");
  //   }
});

// DOM control
class Page {
  constructor() {
    this.changeTitlePage = function (title = RADIO_NAME) {
      document.title = title;
    };

    this.refreshCurrentSong = function (song, artist) {
      const currentSong = document.getElementById("currentSong");
      const currentArtist = document.getElementById("currentArtist");
      // const lyricsSong = document.getElementById("lyricsSong");

      if (
        song !== currentSong.textContent ||
        artist !== currentArtist.textContent
      ) {
        // Esmaecer o conteúdo existente (fade-out)
        currentSong.classList.add("fade-out");
        currentArtist.classList.add("fade-out");

        setTimeout(function () {
          // Atualizar o conteúdo após o fade-out
          currentSong.textContent = song;
          currentArtist.textContent = artist;
          // lyricsSong.textContent = song + " - " + artist;

          // Esmaecer o novo conteúdo (fade-in)
          currentSong.classList.remove("fade-out");
          currentSong.classList.add("fade-in");
          currentArtist.classList.remove("fade-out");
          currentArtist.classList.add("fade-in");
        }, 500);

        setTimeout(function () {
          // Remover as classes fade-in após a animação
          currentSong.classList.remove("fade-in");
          currentArtist.classList.remove("fade-in");
        }, 1000);
      }
    };

    const defaultCoverArt = "img/cover.png";

    //   // Extrai o título da música e o nome do artista,
    //   // tratando a possibilidade de 'song' e 'artist' serem objetos ou strings.
    //   const songTitle =
    //     typeof info.song === "object" ? info.song.title : info.song;
    //   const songArtist =
    //     typeof info.artist === "object" ? info.artist.title : info.artist;

    //   // Define o conteúdo dos elementos HTML,
    //   // incluindo uma verificação para evitar erros caso os valores estejam ausentes.
    //   songName.innerHTML = songTitle || "Desconhecido";
    //   artistName.innerHTML = songArtist || "Desconhecido";

    //   try {
    //     // Utiliza os valores extraídos para buscar a capa do álbum na API do iTunes.
    //     const data = await getDataFromITunes(
    //       songArtist,
    //       songTitle,
    //       defaultCoverArt,
    //       defaultCoverArt
    //     );
    //     // Define a imagem de fundo do elemento 'coverHistoric' com a capa encontrada.
    //     coverHistoric.style.backgroundImage =
    //       "url(" + (data.art || defaultCoverArt) + ")";
    //   } catch (error) {
    //     // Captura e imprime o erro no console para ajudar na depuração.
    //     console.log("Erro ao buscar dados da API do iTunes:");
    //     console.error(error);
    //     // Define a imagem de fundo como a capa padrão em caso de erro.
    //     coverHistoric.style.backgroundImage = "url(" + defaultCoverArt + ")";
    //   }

    //   // Adiciona a classe 'animated' para a animação de slide.
    //   historicDiv.classList.add("animated", "slideInRight");
    //   // Remove a classe 'animated' após 2 segundos para preparar para a próxima animação.
    //   setTimeout(
    //     () => historicDiv.classList.remove("animated", "slideInRight"),
    //     2000
    //   );
    // };

    this.changeVolumeIndicator = function (volume) {
      // document.getElementById("volIndicator").textContent = volume; // Use textContent em vez de innerHTML

      if (typeof Storage !== "undefined") {
        localStorage.setItem("volume", volume);
      }
    };

    this.setVolume = function () {
      if (typeof Storage !== "undefined") {
        const volumeLocalStorage = localStorage.getItem("volume") || 80; // Operador de coalescência nula (??)

        document.getElementById("volume").value = volumeLocalStorage;
        // document.getElementById("volIndicator").textContent = volumeLocalStorage;
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

      if (safeCurrentSong !== musicaAtual) {
        document.title = `${safeCurrentSong} - ${safeCurrentArtist} | ${RADIO_NAME}`;

        // page.refreshCover(safeCurrentSong, safeCurrentArtist);
        page.refreshCurrentSong(safeCurrentSong, safeCurrentArtist);
        // page.refreshLyric(safeCurrentSong, safeCurrentArtist);

        const historicContainer = document.getElementById("historicSong");
        historicContainer.innerHTML = "";

        // const historyArray = data.song_history
        //   ? data.song_history.map((item) => ({
        //       song: item.song.title,
        //       artist: item.song.artist,
        //     }))
        //   : data.history;

        // const maxSongsToDisplay = 2; // Adjust as needed
        // const limitedHistory = historyArray.slice(
        //   Math.max(0, historyArray.length - maxSongsToDisplay)
        // );

        // for (let i = 0; i < limitedHistory.length; i++) {
        //   const songInfo = limitedHistory[i];
        //   const article = document.createElement("article");
        //   article.classList.add("col-12", "col-md-6");
        //   article.innerHTML = `
        //                 <div class="cover-historic" style="background-image: url('img/cover.png');"></div>
        //                 <div class="music-info">
        //                   <p class="song">${songInfo.song || "Desconhecido"}</p>
        //                   <p class="artist">${
        //                     songInfo.artist || "Desconhecido"
        //                   }</p>
        //                 </div>
        //               `;
        //   historicContainer.appendChild(article);
        //   try {
        //     page.refreshHistoric(songInfo, i);
        //   } catch (error) {
        //     console.error("Error refreshing historic song:", error);
        //   }
        // }
        musicaAtual = safeCurrentSong;
      }
    }
  } catch (error) {
    console.log("Error playlist uitlezen:", error);
  }
}

// Função para buscar dados de streaming de uma API específica
async function fetchStreamingData(apiUrl) {
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(
        `Erro na requisição da API: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    console.log(data);
    return data;
  } catch (error) {
    console.log("Erro ao buscar dados de streaming da API:", error);
    return null; // Retorna null em caso de erro
  }
}

// Função para alterar o tamanho da imagem do iTunes
function changeImageSize(url, size) {
  const parts = url.split("/");
  const filename = parts.pop();
  const newFilename = `${size}${filename.substring(filename.lastIndexOf("."))}`;
  return parts.join("/") + "/" + newFilename;
}

// AUDIO

// Variável global para armazenar as músicas
// var audio = new Audio(URL_STREAMING);

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
      // document.getElementById("volIndicator").innerHTML = defaultVolume;

      togglePlay(); // Adiciona esta linha para atualizar o botão
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
    "Stream Down / Network Error. \nClick OK to try again."
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

document.addEventListener("keydown", function (event) {
  var key = event.key;
  var slideVolume = document.getElementById("volume");
  var page = new Page();

  switch (key) {
    // Arrow up
    case "ArrowUp":
      volumeUp();
      slideVolume.value = decimalToInt(audio.volume);
      page.changeVolumeIndicator(decimalToInt(audio.volume));
      break;
    // Arrow down
    case "ArrowDown":
      volumeDown();
      slideVolume.value = decimalToInt(audio.volume);
      page.changeVolumeIndicator(decimalToInt(audio.volume));
      break;
    // Spacebar
    case " ":
    case "Spacebar":
      togglePlay();
      break;
    // P
    case "p":
    case "P":
      togglePlay();
      break;
    // M
    case "m":
    case "M":
      mute();
      break;
    // Numeric keys 0-9
    case "0":
    case "1":
    case "2":
    case "3":
    case "4":
    case "5":
    case "6":
    case "7":
    case "8":
    case "9":
      var volumeValue = parseInt(key);
      audio.volume = volumeValue / 10;
      slideVolume.value = volumeValue * 10;
      page.changeVolumeIndicator(volumeValue * 10);
      break;
  }
});

function intToDecimal(vol) {
  return vol / 100;
}

function decimalToInt(vol) {
  return vol * 100;
}
