import Vue from 'vue'
import App from './App.vue'
import store from './store'

// Capture and log devtool errors when running as actual extension
// so that we can debug it by inspecting the background page.
// We do want the errors to be thrown in the dev shell though.
if (typeof chrome !== 'undefined' && chrome.devtools) {
  Vue.config.errorHandler = (e, vm) => {
    bridge.send('ERROR', {
      message: e.message,
      stack: e.stack,
      component: vm.$options.name || vm.$options._componentTag || 'anonymous'
    })
  }
}

Vue.options.renderError = (h, e) => {
  return h('pre', {
    style: {
      backgroundColor: 'red',
      color: 'white',
      fontSize: '12px',
      padding: '10px'
    }
  }, e.stack)
}

let app = null

/**
 * Create the main devtools app. Expects to be called with a shell interface
 * which implements a connect method.
 *
 * @param {Object} shell
 *        - connect(bridge => {})
 *        - onReload(reloadFn)
 */

export function initDevTools (shell) {
  initApp(shell)
  shell.onReload(() => {
    if (app) {
      app.$destroy()
    }
    if  (bridge)
      bridge.removeAllListeners()
    store.dispatch('resetAvailableFrames')
    initApp(shell)
  })
}

/**
 * Connect then init the app. We need to reconnect on every reload, because a
 * new backend will be injected.
 *
 * @param {Object} shell
 */

function initApp (shell) {
  shell.connect(() => {
    app = new Vue({
      store,
      render (h) {
        return h(App)
      }
    }).$mount('#app')
  })
}

/**
 * Register a frame to become inspectable
 *
 * @param {object} frame
 *   @param {string} frame.url
 *   @param {Bridge} frame.bridge
 */
export function registerFrame(frame) {
  console.log('Register frame', frame)
  store.dispatch('registerFrame', frame)
}
