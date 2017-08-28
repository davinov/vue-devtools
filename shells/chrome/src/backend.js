// this is injected to the app page when the panel is activated.

import { initBackend } from 'src/backend'
import Bridge from 'src/bridge'

window.addEventListener('message', handshake)

function handshake (e) {
  if (e.data.source === 'vue-devtools-proxy' && e.data.payload === 'init') {
    window.removeEventListener('message', handshake)

    console.log('handshaked!')
    let listeners = []
    const bridge = new Bridge({
      listen (fn) {
        var listener = evt => {
          if (evt.data.source === 'vue-devtools-proxy' && evt.data.payload) {
            fn(evt.data.payload)
          }
        }
        window.addEventListener('message', listener)
        listeners.push(listener)
      },
      send (data) {
        window.postMessage({
          source: 'vue-devtools-backend',
          payload: data
        }, '*')
      }
    }, document.URL)

    bridge.on('shutdown', () => {
      listeners.forEach(l => {
        window.removeEventListener('message', l)
      })
      listeners = []
    })

    console.log('init backend', bridge.frameURL)
    initBackend(bridge)
  }
}
