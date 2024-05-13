<template>
  <v-container>
    <h1>RadioInHead</h1>
    <!-- Colonna di radio con scrollbar -->
    <div class="radio-column">
      <v-card v-for="radio in radios" :key="radio.id" class="d-flex flex-row card" flat tile>
        <v-img :src="radio.favicon ? radio.favicon : require('../assets/RadioInHeadLogo.jpg')" class="card-image"
          :alt="radio.name" />
        <v-card-title class="flex-grow-1">{{ radio.name }}</v-card-title>
        <div class="controls">
          <v-btn @click="togglePlayPause(radio)" :color="radio.playing ? 'error' : 'primary'" small>
            {{ radio.playing ? 'Pause' : 'Play' }}
          </v-btn>
          <div @click="toggleFavorite(radio)" class="heart-container">
            <div :class="['heart', { 'liked': radio.favorite }]"></div>
          </div>
          <div v-if="radio.playing" class="sound-wave">
            <div class="bar"></div>
            <div class="bar"></div>
            <div class="bar"></div>
            <div class="bar"></div>
          </div>
        </div>
      </v-card>
    </div>

    <div v-if="selectedRadio" class="radio-control-bar">
      <div class="control-item">
        <v-img :src="selectedRadio.favicon ? selectedRadio.favicon : require('../assets/RadioInHeadLogo.jpg')"
          class="radio-image" :alt="selectedRadio.name" />
      </div>
      <div class="control-item">
        <v-btn @click="togglePlayPause(selectedRadio)" :color="selectedRadio.playing ? 'error' : 'primary'" small>
          {{ selectedRadio.playing ? 'Pause' : 'Play' }}
        </v-btn>
      </div>
      <div class="control-item">
        <div class="song-info">{{ selectedRadio.name }}</div>
      </div>
    </div>

  </v-container>

  <div ref="container" class="world-container"></div>

</template>


<script>
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import earthTexture from '../assets/map.jpg';
import * as mm from 'music-metadata-browser';


export default {
  name: 'HomeView',


  data() {
    return {
      radios: [],
      camera: null,
      renderer: null,
      controls: null,
      earthRadius: 1,
      selectedRadio: null,
      currentSong: 'Nessuna canzone in riproduzione',
    };
  },

  mounted() {
    this.init();
    this.animate();

    // Fetch radio station data
    fetch('https://nl1.api.radio-browser.info/json/stations/search?limit=100&countrycode=IT&hidebroken=true&order=clickcount&reverse=true')
      .then(response => response.json())
      .then(data => {
        const italianRadioStations = data.filter(radio => radio.countrycode === 'IT');
        italianRadioStations.forEach(station => {
          const longitude = station.geo_long;
          const latitude = station.geo_lat;
          this.addMarker(longitude, latitude, 0.01);
        });
      })
      .catch(error => {
        console.error('Error fetching radio station data:', error);
      });
  },

  methods: {
    async fetchRadios() {
      const response = await fetch('https://nl1.api.radio-browser.info/json/stations/search?limit=100&countrycode=IT&hidebroken=true&order=clickcount&reverse=true');
      const data = await response.json();
      return data.filter(radio => radio.countrycode === 'IT');
    },

    async getRadios() {
      try {
        this.radios = await this.fetchRadios();
        this.radios.forEach(radio => {
          radio.playing = false;
          radio.audioPlayer = new Audio();
        });
      } catch (error) {
        console.error('Error fetching radios:', error);
      }
    },

    togglePlayPause(radio) {
      if (radio.playing) {
        this.pauseRadio(radio);
      } else {
        this.pauseAllRadios();
        this.playRadio(radio);
        this.selectedRadio = radio; // Aggiungi questa riga per aggiornare la radio selezionata
      }
    },

    playRadio(radio) {
      const audioUrl = radio.url_resolved || radio.url;
      if (audioUrl && typeof audioUrl === 'string') {
        if (audioUrl.includes('m3u8')) {
          // ... (codice per la riproduzione HLS)
        } else {
          radio.audioPlayer.src = audioUrl;
          // Aggiungi la chiamata per ottenere i metadati della canzone
          this.getSongMetadata(audioUrl)
            .then(metadata => {
              if (metadata && metadata.title) {
                radio.songTitle = metadata.title;
              } else {
                radio.songTitle = 'Unknown';
              }
            })
            .catch(error => {
              console.error('Error getting song metadata:', error);
              radio.songTitle = 'Unknown';
            });
        }
        radio.audioPlayer.play()
          .catch(error => {
            console.error('Error playing audio:', error);
            if (error.name === 'NotAllowedError') {
              console.error('Please ensure that the audio playback is allowed in your browser settings.');
            }
          });
        radio.playing = true;
      } else {
        console.error('Invalid audio URL:', audioUrl);
      }
    },

    pauseRadio(radio) {
      radio.audioPlayer.pause();
      radio.playing = false;
    },

    pauseAllRadios() {
      this.radios.forEach(radio => {
        if (radio.playing) {
          this.pauseRadio(radio);
        }
      });
    },

    toggleFavorite(radio) {
      radio.favorite = !radio.favorite;
      if (!radio.favorite) {
        this.removeFavorite(radio);
      } else {
        this.saveFavorites();
      }
    },

    saveFavorites() {
      const favorites = this.radios.map(radio => ({ changeuuid: radio.changeuuid, favorite: radio.favorite }));
      localStorage.setItem('favorites', JSON.stringify(favorites));
    },

    removeFavorite(radio) {
      let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
      favorites = favorites.filter(fav => fav.changeuuid !== radio.changeuuid);
      localStorage.setItem('favorites', JSON.stringify(favorites));
    },

    retrieveFavorites() {
      const favorites = JSON.parse(localStorage.getItem('favorites')) || [];
      this.radios.forEach(radio => {
        const fav = favorites.find(f => f.changeuuid === radio.changeuuid);
        radio.favorite = fav ? fav.favorite : false;
      });
    },

    selectRadio(radio) {
      this.selectedRadio = radio;
    },

    async getSongMetadata(audioUrl) {
      try {
        const metadata = await mm.fetchFromUrl(audioUrl);
        return metadata.common;
      } catch (error) {
        console.error('Error fetching song metadata:', error);
        return null;
      }
    },

    async getCountryCoordinates(countryCode) {
      try {
        const response = await fetch(`https://restcountries.com/v3.1/alpha/${countryCode}`);
        const data = await response.json();
        const country = data[0];
        if (country) {
          return {
            latitude: country.latlng[0],
            longitude: country.latlng[1],
          };
        } else {
          console.error('Country data not found');
          return null;
        }
      } catch (error) {
        console.error('Error fetching country data:', error);
        return null;
      }
    },

    init() {
      this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
      this.camera.position.z = 5;

      // Create a renderer
      this.renderer = new THREE.WebGLRenderer();
      this.renderer.setSize(window.innerWidth * 0.5, window.innerHeight * 0.55); // Ridotto a metà le dimensioni
      this.$refs.container.appendChild(this.renderer.domElement);

      // Add OrbitControls
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;

      // Create a scene
      const scene = new THREE.Scene();

      // Create a more accurate Earth model
      const geometry = new THREE.SphereGeometry(this.earthRadius, 64, 64); // Increase segments for smoother surface
      const texture = new THREE.TextureLoader().load(earthTexture);
      const material = new THREE.MeshPhongMaterial({ map: texture });
      const earth = new THREE.Mesh(geometry, material);
      scene.add(earth);

      // Add ambient light
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambientLight);

      // Add directional light
      const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
      directionalLight.position.set(1, 1, 1).normalize();
      scene.add(directionalLight);

      // Set the scene to component data
      this.scene = scene;
    },

    addMarker(longitude, latitude, markerSize = 0.05) {
      // Only proceed if longitude and latitude are not null
      if (longitude !== null && latitude !== null) {

        // Calculate marker position
        const phi = (90 - latitude) * (Math.PI / 180);
        const theta = (longitude + 180) * (Math.PI / 180);
        const x = -this.earthRadius * Math.sin(phi) * Math.cos(theta);
        const y = this.earthRadius * Math.cos(phi);
        const z = this.earthRadius * Math.sin(phi) * Math.sin(theta);

        // Create a marker
        const geometry = new THREE.SphereGeometry(markerSize, 32, 32);
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const marker = new THREE.Mesh(geometry, material);
        marker.position.set(x, y, z);

        // Add the marker to the scene
        this.scene.add(marker);
      } else {
        console.error('Longitude or latitude is null');
      }
    },

    animate() {
      requestAnimationFrame(this.animate);

      // Update OrbitControls
      if (this.controls) {
        this.controls.update();
      }

      // Render the scene
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    },
  },

  created() {
    this.getRadios();
  },
};
</script>


<style scoped>
.v-container {
  background-color: #f5f5f5;
  border-radius: 15px;
  padding: 20px;
}

.heart-container {
  display: inline-block;
  cursor: pointer;
  margin-left: 5px;
}

.heart {
  width: 20px;
  height: 18px;
  background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="%23C1C1C1"/></svg>') center no-repeat;
  background-size: 100%;
}

.heart.liked {
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3z" fill="%23FF0000"/></svg>');
}

h1 {
  color: #333;
  text-align: center;
  font-size: 2em;
  margin-bottom: 20px;
}

.radio-column {
  max-height: 600px;
  /* Imposta l'altezza massima per la colonna di radio */
  overflow-y: auto;
  /* Abilita la scrollbar verticale quando la colonna di radio diventa più alta della sua altezza massima */
}

.card {
  max-width: 400px;
  box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.2);
  border-radius: 5px;
  position: relative;
  margin-bottom: 20px;
  margin-left: 10px;
  /* Aggiungi spazio tra le carte */
}

.card-image {
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: 5px;
}

.v-card-title {
  color: #333;
  font-size: 1.2em;
  font-weight: bold;
}

.controls {
  position: absolute;
  bottom: 10px;
  left: 160px;
  display: flex;
  align-items: center;
}

.radio-control-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  background-color: #f5f5f5;
  padding: 10px;
}

.radio-image {
  width: 50px;
  height: 50px;
  object-fit: cover;
  border-radius: 5px;
}

.control-item {
  display: flex;
  align-items: center;
  margin-right: 10px;
}

.song-info {
  margin-left: 10px;
}

.controls .v-btn {
  margin-right: 10px;
}

.sound-wave {
  display: flex;
  align-items: center;
  height: 20px;
  margin-left: 10px;
}

.bar {
  width: 4px;
  height: 100%;
  margin: 0 2px;
  background-color: #333;
  animation: pulse 0.8s infinite ease-in-out alternate;
}

@media (min-width: 1000px) {

  .world-container {
    position: absolute;
    top: 125px;
    right: 20px;
    width: 50vw;
    height: 80vh;
    margin: 20px;
  }
}

@media (max-width: 768px) {
  .world-container {
    position: relative;
    top: 1px;
    right: 20px;
    width: 100%;
    height: 100%;
    margin: 20px;
  }
}

.bar:nth-child(1) {
  animation-delay: 0s;
}

.bar:nth-child(2) {
  animation-delay: 0.1s;
}

.bar:nth-child(3) {
  animation-delay: 0.2s;
}

.bar:nth-child(4) {
  animation-delay: 0.3s;
}

@keyframes pulse {
  0% {
    transform: scaleY(0.1);
  }
}

.container {
  margin-right: 50px
}
</style>
