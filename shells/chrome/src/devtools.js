// this script is called when the VueDevtools panel is activated.

import { initDevTools, registerFrame } from 'src/devtools'
import Bridge from 'src/bridge'

initDevTools({
  /**
   * Inject backend, connect to background, and send back the bridge.
   *
   * @param {Function} cb
   */

  connect(cb) {
    cb()
  },

  /**
   * Register a function to reload the devtools app.
   *
   * @param {Function} reloadFn
   */

  onReload(reloadFn) {
    chrome.devtools.network.onNavigated.addListener(reloadFn)
  }
})


function handleRes (res) {
  if (res.type === 'document') {
    createPortForSubFrame(res.url)
  }
}

// Search for iframes...
// ...on devtool panel load
chrome.devtools.inspectedWindow.getResources(function (res) {
  res.map(handleRes)
})
// ...when they are added to the page afterwards
chrome.devtools.inspectedWindow.onResourceAdded.addListener(handleRes)


/**
 * Inject a globally evaluated script, in the same context with the actual
 * user app.
 *
 * @param {String} scriptName
 * @param {String} [frameURL]
 * @param {Function} cb
 */

function injectScriptInFrame (scriptName, frameURL, cb) {
  const src = `
    (function() {
      var script = document.constructor.prototype.createElement.call(document, 'script');
      script.src = "${scriptName}";
      document.documentElement.appendChild(script);
      script.parentNode.removeChild(script);
    })()
  `
  chrome.devtools.inspectedWindow.eval(src, { frameURL: frameURL }, function (res, err) {
    if (err) {
      console.log(err)
    }
    cb()
  })
}

function createPortForSubFrame(frameURL) {
  console.log('Frame added:', frameURL)
  // 1. inject backend code into frame
  injectScriptInFrame(chrome.runtime.getURL('build/backend.js'), frameURL, () => {
    // 2. connect to background to setup proxy
    const port = chrome.runtime.connect({
      name: '' + chrome.devtools.inspectedWindow.tabId + '#' + frameURL,
    })
    let disconnected = false
    port.onDisconnect.addListener(() => {
      disconnected = true
    })

    const bridge = new Bridge({
      listen(fn) {
        port.onMessage.addListener(fn)
      },
      send(data) {
        if (!disconnected) {
          port.postMessage(data)
        }
      }
    }, port.name)
    // 3. send the new frame along with the proxy API to the panel
    registerFrame({
      url: frameURL,
      bridge: bridge
    })
  })
}