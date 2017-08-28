<template>
  <div class="target-selector">
    <select
      v-if="availableFramesURLs.length > 1"
      :value="currentFrameURL"
      @change="selectFrameByUrl($event.target.value)"
    >
      <option
        v-for="frameURL in availableFramesURLs"
        :key="frameURL"
        :value="frameURL"
      > {{ frameURL }} </option>
    </select>
  </div>
</template>

<script>
import { mapState } from 'vuex'

export default {
  computed: mapState({
    currentFrameURL: state => state.frame ? state.frame.url : undefined,
    availableFramesURLs: state => state.availableFrames.map(af => af.url),
  }),

  methods: {
    selectFrameByUrl (frameURL) {
      this.$store.dispatch('selectFrameByURL', frameURL)
    }
  }
}
</script>
