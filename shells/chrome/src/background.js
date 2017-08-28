// the background script runs all the time and serves as a central message
// hub for each vue devtools (panel + proxy + backend) instance.

const ports = {}

chrome.runtime.onConnect.addListener(port => {
  let tabId
  let frameId, frameURL
  let name
  let id
  if (isNumeric(port.name.split('#')[0])) {
    tabId = +port.name.split('#')[0]
    frameURL = port.name.split('#')[1]
    id = port.name
    name = 'devtools'
    installProxy(tabId, id)
  } else {
    tabId = port.sender.tab.id
    frameId = port.sender.frameId
    frameURL = port.sender.url
    id = tabId + '#' + frameURL
    console.log('heard of backend for tab#frame ', id)
    name = 'backend'
  }

  if (!ports[id]) {
    ports[id] = {
      devtools: null,
      backend: null
    }
  }
  ports[id][name] = port

  if (ports[id].devtools && ports[id].backend) {
    doublePipe(id, ports[id].devtools, ports[id].backend)
  }
})

function isNumeric (str) {
  return +str + '' === str
}

function installProxy(tabId, portId) {
  chrome.tabs.executeScript(tabId, {
    file: '/build/proxy.js',
    allFrames: true
  }, function (res) {
    if (!res) {
      ports[portId].devtools.postMessage('proxy-fail')
      console.log('proxy fails', portId)
    } else {
      console.log('injected proxy to all frames of tab ' + tabId)
    }
  })
}

function doublePipe (id, one, two) {
  one.onMessage.addListener(lOne)
  function lOne (message) {
    if (message.event === 'log') {
      return console.log('tab ' + id, message.payload)
    }
    console.log('devtools -> backend', message)
    two.postMessage(message)
  }
  two.onMessage.addListener(lTwo)
  function lTwo (message) {
    if (message.event === 'log') {
      return console.log('tab ' + id, message.payload)
    }
    console.log('backend -> devtools', message)
    one.postMessage(message)
  }
  function shutdown () {
    console.log('tab ' + id + ' disconnected.')
    one.onMessage.removeListener(lOne)
    two.onMessage.removeListener(lTwo)
    one.disconnect()
    two.disconnect()
    ports[id] = null
  }
  one.onDisconnect.addListener(shutdown)
  two.onDisconnect.addListener(shutdown)
  console.log('tab ' + id + ' connected.')
}

chrome.runtime.onMessage.addListener((req, sender) => {
  if (sender.tab && req.vueDetected) {
    chrome.browserAction.setIcon({
      tabId: sender.tab.id,
      path: {
        16: 'icons/16.png',
        48: 'icons/48.png',
        128: 'icons/128.png'
      }
    })
    chrome.browserAction.setPopup({
      tabId: sender.tab.id,
      popup: req.devtoolsEnabled ? 'popups/enabled.html' : 'popups/disabled.html'
    })
  }
})
