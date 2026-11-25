// Opens an eval page in the Chrome on port 9333 (with `npm run dev` running) and saves the result.
// usage: node eval/run.mjs <page.html?query> <outName>
import fs from 'node:fs';
const dir = new URL('.', import.meta.url).pathname; const [page, outName] = process.argv.slice(2);
const list = await (await fetch('http://127.0.0.1:9333/json')).json();
const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl); await new Promise((r) => { ws.onopen = r; });
let id = 0; const send = (method, params = {}) => new Promise((res) => { const i = ++id; const h = (e) => { const m = JSON.parse(e.data); if (m.id === i) { ws.removeEventListener('message', h); res(m.result); } }; ws.addEventListener('message', h); ws.send(JSON.stringify({ id: i, method, params })); });
// A third argument 'slow' shapes the connection like a busy call: 600 kbit/s up, 1.5 Mbit/s down, 300 ms delay.
if (process.argv[4] === 'slow') { await send('Network.enable'); await send('Network.emulateNetworkConditions', { offline: false, latency: 300, downloadThroughput: 1500000 / 8, uploadThroughput: 600000 / 8 }); }
await send('Page.navigate', { url: `http://localhost:5184/eval/${page}` });
for (;;) {
  await new Promise((r) => setTimeout(r, 4000));
  const r = await send('Runtime.evaluate', { expression: 'window.__eval ? JSON.stringify(window.__eval) : ""', returnByValue: true });
  if (r.result?.value) { const out = JSON.parse(r.result.value); fs.mkdirSync(`${dir}out`, { recursive: true }); fs.writeFileSync(`${dir}out/${outName}.json`, JSON.stringify(out, null, 1)); console.log(JSON.stringify(out.summary, null, 1)); break; }
}
ws.close();
