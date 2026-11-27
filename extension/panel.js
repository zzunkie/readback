// The panel shows the Readback web app, so the models are called with the same Firebase project
// and App Check as on the site. Commands from the extension's shortcuts are passed on to it.
const APP = new URLSearchParams(location.search).get('app') || 'https://readback-meet.web.app/';
const frame = document.getElementById('app'); frame.src = `${APP}?panel=1`;
chrome.runtime.onMessage.addListener((m) => { if (m.command) frame.contentWindow.postMessage({ readback: m.command }, new URL(APP).origin); });
