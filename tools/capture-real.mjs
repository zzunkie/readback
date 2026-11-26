// Captures real public web pages as 1280x720 frames for the "real screens" test set, with an answer
// key read from each page's own DOM. usage: node tools/capture-real.mjs  (headless Chrome on port 9335)
import fs from 'node:fs';
const out = new URL('../public/eval/real/', import.meta.url).pathname; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const W = (t) => `https://en.wikipedia.org/wiki/${t}`;
const pages = [
  ...['List_of_countries_by_population_(United_Nations)', 'List_of_tallest_buildings', 'List_of_largest_cities', 'List_of_highest_mountains_on_Earth', 'List_of_rivers_by_length', 'List_of_countries_by_GDP_(nominal)', 'List_of_busiest_airports_by_passenger_traffic', 'List_of_largest_lakes_and_seas_in_the_Solar_System', 'List_of_countries_by_life_expectancy', 'List_of_best-selling_books', 'List_of_Nobel_laureates_in_Physics', 'List_of_longest_bridges', 'List_of_largest_companies_by_revenue', 'List_of_metro_systems', 'List_of_countries_by_electricity_production', 'List_of_most_visited_museums', 'List_of_largest_islands', 'List_of_tallest_mountains_in_the_Solar_System', 'List_of_fastest_production_cars_by_acceleration', 'List_of_countries_by_forest_area', 'List_of_largest_deserts', 'List_of_oldest_universities_in_continuous_operation', 'List_of_elements_by_stability_of_isotopes', 'List_of_countries_by_rail_transport_network_size'].map((t) => ({ url: W(t), kind: 'table', mode: 'wikitable', source: 'Wikipedia' })),
  ...[['nodejs/node', 'main', 'lib/path.js'], ['pallets/flask', 'main', 'src/flask/app.py'], ['golang/go', 'master', 'src/strings/strings.go'], ['expressjs/express', 'master', 'lib/application.js'], ['django/django', 'main', 'django/http/response.py'], ['rust-lang/rust', 'master', 'library/core/src/option.rs'], ['psf/requests', 'main', 'src/requests/api.py'], ['lodash/lodash', 'main', 'src/chunk.ts'], ['numpy/numpy', 'main', 'numpy/lib/_shape_base_impl.py'], ['vuejs/core', 'main', 'packages/reactivity/src/ref.ts']].map(([r, b, f]) => ({ url: `https://github.com/${r}/blob/${b}/${f}`, kind: 'code', mode: 'github', file: f.split('/').pop(), source: 'GitHub' })),
  ...[['datasets/population', 'main', 'data/population.csv'], ['datasets/gdp', 'main', 'data/gdp.csv'], ['datasets/country-codes', 'main', 'data/country-codes.csv'], ['datasets/airport-codes', 'main', 'data/airport-codes.csv'], ['datasets/co2-fossil-global', 'main', 'data/global.csv'], ['datasets/gold-prices', 'main', 'data/annual.csv'], ['datasets/world-cities', 'main', 'data/world-cities.csv'], ['datasets/s-and-p-500-companies', 'main', 'data/constituents.csv']].map(([r, b, f]) => ({ url: `https://github.com/${r}/blob/${b}/${f}`, kind: 'table', mode: 'github', file: f.split('/').pop(), source: 'GitHub CSV' })),
  ...['Web/API/Fetch_API/Using_Fetch', 'Web/HTTP/Guides/Caching', 'Web/JavaScript/Guide/Using_promises', 'Web/CSS/CSS_grid_layout/Basic_concepts_of_grid_layout', 'Web/Accessibility/ARIA/Guides/Live_regions', 'Web/API/Screen_Capture_API/Using_Screen_Capture', 'Web/HTML/Guides/Responsive_images', 'Learn_web_development/Core/Accessibility/What_is_accessibility'].map((t) => ({ url: `https://developer.mozilla.org/en-US/docs/${t}`, kind: 'text', mode: 'doc', source: 'MDN' })),
  ...['life-expectancy', 'co-emissions-per-capita', 'share-of-individuals-using-the-internet', 'child-mortality', 'gdp-per-capita-worldbank', 'share-electricity-renewables', 'population', 'literacy-rate-adults'].map((t) => ({ url: `https://ourworldindata.org/grapher/${t}?tab=chart`, kind: 'chart', mode: 'chart', source: 'Our World in Data' })),
];
const list = await (await fetch('http://127.0.0.1:9335/json')).json();
const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl); await new Promise((r) => { ws.onopen = r; });
let id = 0; const send = (method, params = {}) => new Promise((res) => { const i = ++id; const h = (e) => { const m = JSON.parse(e.data); if (m.id === i) { ws.removeEventListener('message', h); res(m.result ?? m); } }; ws.addEventListener('message', h); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.value;
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
// In the page: put the target in view and read the answer key from what is visible.
const inPage = {
  wikitable: `(() => { const ok = (t) => { const rows = [...t.querySelectorAll('tbody tr')].filter((r) => r.querySelector('td')); if (rows.length < 8 || t.querySelector('td[rowspan],td[colspan],th[rowspan]')) return false; const n = rows[0].children.length; return n >= 4 && n <= 9 && rows.slice(0, 8).every((r) => r.children.length === n); };
    const t = [...document.querySelectorAll('table.wikitable')].find(ok); if (!t) return null; let h = t.previousElementSibling; while (h && !/^H[2-4]$/.test(h.tagName) && !h.querySelector?.('h2,h3,h4')) h = h.previousElementSibling;
    const top = t.getBoundingClientRect().top + scrollY - 70; scrollTo(0, top);
    const heads = [...t.querySelectorAll('thead th, tr:first-child th')].map((x) => x.innerText.replace(/\\[.*?\\]/g, '').replace(/\\s+/g, ' ').trim());
    const vis = [...t.querySelectorAll('tbody tr')].filter((r) => r.querySelector('td') && r.getBoundingClientRect().top > 60 && r.getBoundingClientRect().bottom < 700).map((r) => [...r.children].map((c) => c.innerText.replace(/\\[.*?\\]/g, '').replace(/\\s+/g, ' ').trim()));
    return { title: document.querySelector('h1').innerText, titles: [document.querySelector('h1').innerText, t.caption?.innerText.trim(), h?.innerText.replace(/\\[edit\\]/, '').trim()].filter(Boolean), heads, rows: vis }; })()`,
  github: `(() => ({ title: document.title.split(' at ')[0].split(' · ')[0], titles: [] }))()`,
  doc: `(() => ({ title: document.querySelector('h1').innerText, titles: [document.querySelector('h1').innerText] }))()`,
  chart: `(() => ({ title: (document.querySelector('h1') || {}).innerText || document.title, titles: [(document.querySelector('h1') || {}).innerText || document.title] }))()`,
};
const done = []; let n = 0;
for (const p of pages) {
  try {
    await send('Page.navigate', { url: p.url }); await sleep(p.mode === 'chart' ? 7000 : 3500);
    const status = await ev('document.title'); if (/not found|404|Page not found/i.test(status)) { console.log('skip 404', p.url); continue; }
    const key = await ev(inPage[p.mode]); if (!key) { console.log('skip (no clean table)', p.url); continue; }
    await sleep(800); n += 1; const idn = `r${String(n).padStart(2, '0')}`;
    const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 85 }); fs.writeFileSync(`${out}${idn}.jpg`, Buffer.from(shot.data, 'base64'));
    const item = { id: idn, kind: p.kind, source: p.source, url: p.url, title: key.title, titles: key.titles, questions: [] };
    if (p.file) { item.title = p.file; item.titles = [p.file]; }
    if (key.rows?.length >= 6 && key.heads?.length === key.rows[0].length) {
      // Two cells from the visible rows: the row is named by its first cell, or its second when the first is only a rank.
      const nameCol = /^\d+$|^[\d.]+$|^$/.test(key.rows[0][0]) && /^\d+$|^[\d.]+$|^$/.test(key.rows[1][0]) ? 1 : 0;
      for (const [ri, ci] of [[2, key.heads.length - 1], [5, nameCol + 1]]) { const r = key.rows[ri]; if (!r || !r[ci] || !r[nameCol] || r[ci].length > 40 || !key.heads[ci]) continue; if (key.rows.filter((x) => x[nameCol] === r[nameCol]).length !== 1) continue; item.questions.push({ type: 'cell', q: `In the table, what is shown for "${r[nameCol]}" in the column "${key.heads[ci]}"?`, a: r[ci] }); }
      item.rows = key.rows.length; item.cols = key.heads.length;
    }
    done.push(item); console.log(idn, p.kind, item.title.slice(0, 50), item.questions.length);
  } catch (e) { console.log('fail', p.url, e.message); }
}
fs.writeFileSync(`${out}real.json`, JSON.stringify(done, null, 1)); console.log(done.length, 'screens'); ws.close();
