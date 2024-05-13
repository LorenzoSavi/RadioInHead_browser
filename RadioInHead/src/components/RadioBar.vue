<template>
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
</template>

<script>
export default {
  name: 'RadioBar',
  props: {
    selectedRadio: {
      type: Object,
      default: null
    },
    currentSong: {
      type: String,
      default: 'Nessuna canzone in riproduzione'
    }
  },
  methods: {
  togglePlayPause(radio) {
    console.log('Toggle play/pause event emitted:', radio);
    if (radio && typeof radio === 'object') {
      if (radio.playing) {
        this.$emit('pause-radio', radio);
      } else {
        this.$emit('play-radio', radio);
      }
    } else {
      console.error('Invalid radio object:', radio);
    }
  },
}
}
</script>

<style scoped>
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
</style>
