<template>
    <div><br>
        <h1>Favorite </h1>
        <v-container>
            <h2>Your Favorite Radios</h2><br>
            <v-row>
                <v-col cols="12" sm="6" md="4" lg="3" v-for="radio in favoriteRadios" :key="radio.id">
                    <v-card class="d-flex flex-row card" flat tile>
                        <v-img :src="radio.favicon || defaultImage" class="card-image" :alt="radio.name" />
                        <v-card-title class="flex-grow-1">{{ radio.name }}</v-card-title>
                        <div v-if="radio.showControls" class="controls">
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
                </v-col>
            </v-row>

            <div v-if="selectedRadio" class="radio-control-bar">
                <div class="control-item">
                    <v-img
                        :src="selectedRadio.favicon ? selectedRadio.favicon : require('../assets/RadioInHeadLogo.jpg')"
                        class="radio-image" :alt="selectedRadio.name" />
                </div>
                <div class="control-item">
                    <v-btn @click="togglePlayPause(selectedRadio)" :color="selectedRadio.playing ? 'error' : 'primary'"
                        small>
                        {{ selectedRadio.playing ? 'Pause' : 'Play' }}
                    </v-btn>
                </div>
                <div class="control-item">
                    <div class="song-info">{{ selectedRadio.name }}</div>
                </div>
            </div>
        </v-container>
    </div>

    <RadioBar :selectedRadio="selectedRadio" :currentSong="currentSong" />

</template>

<script>
import Hls from 'hls.js';
import defaultImage from '../assets/RadioInHeadLogo.jpg';
//import RadioBar from '@/components/RadioBar.vue'; // Assicurati di impostare il percorso corretto
import * as mm from 'music-metadata-browser';

export default {
    name: 'FavoriteRadios',
    //components: {
    //    RadioBar
    //},
    data() {
        return {
            favoriteRadios: [],
            defaultImage,
            selectedRadio: null,
            currentSong: 'Nessuna canzone in riproduzione',
        }
    },
    methods: {
        async fetchRadios() {
            const response = await fetch('https://nl1.api.radio-browser.info/json/stations/search?limit=100&hidebroken=true&order=clickcount&reverse=true');
            const data = await response.json();
            const allRadios = data.map(radio => ({
                ...radio,
                favorite: true,
                showControls: true,
                playing: false,
                audioPlayer: new Audio(),
            }));
            const favorites = JSON.parse(localStorage.getItem('favorites')) || [];
            const favoriteRadios = allRadios.filter(radio => favorites.some(fav => fav.changeuuid === radio.changeuuid && fav.favorite));
            return favoriteRadios;
        },
        async getFavoriteRadios() {
            try {
                this.favoriteRadios = await this.fetchRadios();
            } catch (error) {
                console.error('Error fetching favorite radios:', error);
            }
        },
        togglePlayPause(radio) {
            if (radio.playing) {
                this.pauseRadio(radio);
            } else {
                this.pauseAllRadios(); // Pause all other radios
                this.playRadio(radio);
            }
        },
        playRadio(radio) {
            const audioUrl = radio.url_resolved || radio.url;
            if (audioUrl.includes('m3u8')) {
                if (Hls.isSupported()) {
                    const hls = new Hls();
                    hls.loadSource(audioUrl);
                    hls.attachMedia(radio.audioPlayer);
                } else {
                    console.error('HLS is not supported in this browser.');
                }
            } else {
                radio.audioPlayer.src = audioUrl;
            }
            radio.audioPlayer.play()
                .catch(error => {
                    console.error('Error playing audio:', error);
                    if (error.name === 'NotAllowedError') {
                        console.error('Please ensure that the audio playback is allowed in your browser settings.');
                    }
                });
            radio.playing = true;
        },
        pauseRadio(radio) {
            radio.audioPlayer.pause();
            radio.playing = false;
        },
        pauseAllRadios() {
            this.favoriteRadios.forEach(radio => {
                if (radio.playing) {
                    this.pauseRadio(radio);
                }
            });
        },
        toggleFavorite(radio) {
            radio.favorite = !radio.favorite;
            if (!radio.favorite) {
                this.removeFavorite(radio);
            }
        },
        removeFavorite(radio) {
            let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
            favorites = favorites.filter(fav => fav.changeuuid !== radio.changeuuid);
            localStorage.setItem('favorites', JSON.stringify(favorites));
            this.getFavoriteRadios(); // Refresh favorite radios list after removing favorite
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


    },
    created() {
        this.getFavoriteRadios();
    },
}
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

.v-row {
    justify-content: space-around;
}

.card {
    max-width: 400px;
    box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.2);
    border-radius: 5px;
    position: relative;
    margin-bottom: 20px;
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

.card .card-image {
    display: block;
    /* Per rendere l'immagine sempre visibile */
}


@keyframes pulse {
    0% {
        transform: scaleY(0.1);
    }

    100% {
        transform: scaleY(1);
    }
}
</style>