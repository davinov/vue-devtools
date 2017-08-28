import Vue from 'vue'
import Vuex from 'vuex'
import components from 'views/components/module'
import vuex from 'views/vuex/module'
import events from 'views/events/module'
import { parse } from '../../util'

Vue.use(Vuex)

const store = new Vuex.Store({
  state: {
    message: '',
    tab: 'components',
    currentFrame: undefined,
    availableFrames: []
  },
  mutations: {
    SHOW_MESSAGE (state, message) {
      state.message = message
    },
    SWITCH_TAB (state, tab) {
      state.tab = tab
    },
    SET_CURRENT_FRAME (state, frame) {
      state.currentFrame = frame
    },
    ADD_FRAME (state, newFrame) {
      state.availableFrames.push(newFrame)
    },
    RESET_FRAMES (state) {
      state.availableFrames = []
    },
    RECEIVE_INSTANCE_DETAILS (state, instance) {
      state.message = 'Instance selected: ' + instance.name
    }
  },
  actions: {
    resetAvailableFrames({ commit }) {
      commit('SET_CURRENT_FRAME', undefined)
      commit('RESET_FRAMES')
    },

    registerFrame({ commit, dispatch, state }, frame) {
      commit('ADD_FRAME', frame)
      if (state.availableFrames.length == 1) {
        console.log('Selecting first frame by default')
        dispatch('selectFrame', frame)
      }
    },

    selectFrameByURL ({ dispatch, state }, frameURL) {
      dispatch(
        'selectFrame',
        state.availableFrames.find(f => f.url == frameURL)
      )
    },

    selectFrame ({ commit, state }, frame) {
      if (!frame) { return }
      commit('SET_CURRENT_FRAME', frame)

      // Cancel previous bridge
      if (window.bridge) {
        window.bridge.removeAllListeners()
      }

      // Use the new frame bridge
      let bridge = frame.bridge
      window.bridge = bridge

      bridge.once('ready', version => {
        store.commit(
          'SHOW_MESSAGE',
          'Ready. Detected Vue ' + version + '.'
        )
        bridge.send('vuex:toggle-recording', store.state.vuex.enabled)
        bridge.send('events:toggle-recording', store.state.events.enabled)
      })

      bridge.once('proxy-fail', () => {
        store.commit(
          'SHOW_MESSAGE',
          'Proxy injection failed.'
        )
      })

      bridge.on('flush', payload => {
        store.commit('components/FLUSH', parse(payload))
      })

      bridge.on('instance-details', details => {
        store.commit('components/RECEIVE_INSTANCE_DETAILS', parse(details))
      })

      bridge.on('vuex:init', snapshot => {
        store.commit('vuex/INIT', snapshot)
      })

      bridge.on('vuex:mutation', payload => {
        store.commit('vuex/RECEIVE_MUTATION', payload)
      })

      bridge.on('event:triggered', payload => {
        store.commit('events/RECEIVE_EVENT', parse(payload))
        if (store.state.tab !== 'events') {
          store.commit('events/INCREASE_NEW_EVENT_COUNT')
        }
      })

      console.log('Bridge in use is now:', bridge)
    }
  },
  modules: {
    components,
    vuex,
    events
  }
})

export default store

if (module.hot) {
  module.hot.accept([
    'views/components/module',
    'views/vuex/module',
    'views/events/module'
  ], () => {
    try {
      store.hotUpdate({
        modules: {
          components: require('views/components/module').default,
          vuex: require('views/vuex/module').default,
          events: require('views/events/module').default
        }
      })
    } catch (e) {
      console.log(e.stack)
    }
  })
}
