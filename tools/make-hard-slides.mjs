// Harder slides: dense tables, charts without value labels, multi-series line charts, flow diagrams.
import fs from 'node:fs';
const dir = new URL('.', import.meta.url).pathname;
let seed = 91; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const T = [{ bg: '#ffffff', fg: '#1f2937', a: ['#2563eb', '#dc2626', '#059669'] }, { bg: '#0f172a', fg: '#f1f5f9', a: ['#38bdf8', '#f472b6', '#facc15'] }, { bg: '#f8fafc', fg: '#0f172a', a: ['#7c3aed', '#ea580c', '#0d9488'] }];
const base = (t, title, body) => `<!doctype html><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;width:1280px;height:720px;overflow:hidden;background:${t.bg};color:${t.fg};font-family:Helvetica Neue,Arial,sans-serif;padding:36px 56px}h1{font-size:34px;margin:0 0 18px}table{border-collapse:collapse;font-size:17px;width:100%}th,td{padding:7px 10px;border-bottom:1px solid ${t.fg}33;text-align:right}th:first-child,td:first-child{text-align:left}</style><h1>${title}</h1>${body}`;
const slides = []; const add = (kind, title, html, questions) => slides.push({ id: `h${String(slides.length + 1).padStart(2, '0')}`, kind, title, html, questions });
const names = ['Atlanta', 'Berlin', 'Chicago', 'Dublin', 'Edinburgh', 'Frankfurt', 'Geneva', 'Houston', 'Istanbul', 'Jakarta', 'Kyoto', 'Lisbon'];
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
// 10 dense tables: 12 rows x 8 columns
['Monthly orders by office', 'Tickets closed by office', 'Visitors by office, in thousands', 'Units shipped by office', 'New accounts by office', 'Calls handled by office', 'Returns by office', 'Training hours by office', 'Open invoices by office', 'Site inspections by office'].forEach((title, i) => {
  const t = T[i % 3]; const cells = names.map(() => months.map(() => Math.floor(rnd() * 9000 + 100)));
  const r = Math.floor(rnd() * 12), c = Math.floor(rnd() * 8), c2 = Math.floor(rnd() * 8), r2 = Math.floor(rnd() * 12);
  const col = cells.map((row) => row[c2]); const maxRow = names[col.indexOf(Math.max(...col))];
  const rowTotal = cells[r2].reduce((x, y) => x + y, 0);
  add('dense-table', title, base(t, title, `<table><tr><th>Office</th>${months.map((m) => `<th>${m}</th>`).join('')}</tr>${names.map((n, k) => `<tr><td>${n}</td>${cells[k].map((v) => `<td>${v.toLocaleString('en-US')}</td>`).join('')}</tr>`).join('')}</table>`),
    [{ type: 'cell', q: `What is the value for ${names[r]} in ${months[c]}?`, a: String(cells[r][c]) }, { type: 'argmax', q: `Which office has the highest value in ${months[c2]}?`, a: maxRow }, { type: 'sum', q: `What is the total for ${names[r2]} across all eight months?`, a: String(rowTotal) }]);
});
// 10 bar charts without value labels: estimate from the axis (within 8% of the axis maximum counts as right)
['Sign-ups per week', 'Tickets per day', 'Sessions per release', 'Revenue per quarter, in thousands', 'Defects per sprint', 'Orders per region', 'Downloads per month', 'Visits per campaign', 'Hours per project', 'Leads per channel'].forEach((title, i) => {
  const t = T[i % 3]; const labels = ['A', 'B', 'C', 'D', 'E', 'F'].map((x) => `Group ${x}`); const top = [100, 200, 500, 1000, 50][i % 5];
  const vals = labels.map(() => Math.round((rnd() * 0.85 + 0.1) * top)); const k = Math.floor(rnd() * 6);
  const bars = vals.map((v, j) => `<rect x="${110 + j * 175}" y="${540 - (v / top) * 480}" width="110" height="${(v / top) * 480}" fill="${t.a[0]}"/><text x="${165 + j * 175}" y="572" text-anchor="middle" font-size="20" fill="${t.fg}">${labels[j]}</text>`).join('');
  const grid = [0, 0.2, 0.4, 0.6, 0.8, 1].map((f) => `<line x1="90" x2="1150" y1="${540 - f * 480}" y2="${540 - f * 480}" stroke="${t.fg}33"/><text x="80" y="${546 - f * 480}" text-anchor="end" font-size="18" fill="${t.fg}">${top * f}</text>`).join('');
  const sorted = [...vals].sort((x, y) => y - x);
  add('chart-unlabeled', title, base(t, title, `<svg width="1168" height="590">${grid}${bars}</svg>`),
    [{ type: 'estimate', q: `About what value does ${labels[k]} reach? Give a number.`, a: String(vals[k]), tol: top * 0.08 }, { type: 'argmax', q: 'Which group has the tallest bar? Give the group name.', a: labels[vals.indexOf(sorted[0])] }, { type: 'rank2', q: 'Which group has the second tallest bar? Give the group name.', a: labels[vals.indexOf(sorted[1])] }]);
});
// 10 line charts with three series
['Latency by region', 'Active users by plan', 'Cost per unit by plant', 'Scores by section', 'Stock by warehouse', 'Uptime by service', 'Traffic by source', 'Wait time by clinic', 'Output by line', 'Enrollment by campus'].forEach((title, i) => {
  const t = T[i % 3]; const series = ['North', 'South', 'West']; const xs = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const data = series.map(() => { let v = rnd() * 60 + 20; return xs.map(() => (v = Math.max(5, Math.min(95, v + (rnd() - 0.5) * 50)))); });
  const X = (j) => 110 + j * 200, Y = (v) => 520 - v * 4.8;
  const lines = data.map((d, s) => `<polyline fill="none" stroke="${t.a[s]}" stroke-width="5" points="${d.map((v, j) => `${X(j)},${Y(v)}`).join(' ')}"/>${d.map((v, j) => `<circle cx="${X(j)}" cy="${Y(v)}" r="7" fill="${t.a[s]}"/>`).join('')}`).join('');
  const legend = series.map((s, k) => `<rect x="${880 + 0}" y="${20 + k * 34}" width="26" height="8" fill="${t.a[k]}"/><text x="916" y="${30 + k * 34}" font-size="20" fill="${t.fg}">${s}</text>`).join('');
  const grid = [0, 25, 50, 75, 100].map((v) => `<line x1="90" x2="1150" y1="${Y(v)}" y2="${Y(v)}" stroke="${t.fg}33"/><text x="80" y="${Y(v) + 6}" text-anchor="end" font-size="18" fill="${t.fg}">${v}</text>`).join('');
  const j = Math.floor(rnd() * 6); const at = data.map((d) => d[j]); const gap = [...at].sort((x, y) => y - x);
  const end = data.map((d) => d[5] - d[0]); const rose = series[end.indexOf(Math.max(...end))];
  const qs = [{ type: 'trend', q: 'Which series rose the most from Jan to Jun? Give the series name.', a: rose }];
  if (gap[0] - gap[1] > 6) qs.push({ type: 'series-at', q: `Which series is highest in ${xs[j]}? Give the series name.`, a: series[at.indexOf(gap[0])] });
  add('line-chart', title, base(t, title, `<svg width="1168" height="590">${grid}${lines}${xs.map((x, k) => `<text x="${X(k)}" y="556" text-anchor="middle" font-size="20" fill="${t.fg}">${x}</text>`).join('')}${legend}</svg>`), qs);
});
// 6 flow diagrams: boxes in scattered positions joined by arrows
[['Intake', 'Triage', 'Assign', 'Resolve', 'Review'], ['Draft', 'Legal check', 'Pricing', 'Approval', 'Publish'], ['Order', 'Payment', 'Packing', 'Shipping', 'Delivery'], ['Collect', 'Clean', 'Train', 'Evaluate', 'Deploy'], ['Request', 'Screen', 'Interview', 'Offer', 'Onboard'], ['Detect', 'Page', 'Mitigate', 'Recover', 'Postmortem']].forEach((steps, i) => {
  const t = T[i % 3]; const title = ['Support flow', 'Launch approval flow', 'Fulfilment flow', 'Model release flow', 'Hiring flow', 'Incident flow'][i];
  const pos = [[90, 60], [480, 300], [880, 60], [90, 420], [880, 420]]; const order = [0, 1, 2, 3, 4].sort(() => rnd() - 0.5); // step k sits at pos[order[k]]
  const P = (k) => pos[order[k]]; const boxes = steps.map((s, k) => `<rect x="${P(k)[0]}" y="${P(k)[1]}" width="230" height="84" rx="10" fill="none" stroke="${t.a[0]}" stroke-width="4"/><text x="${P(k)[0] + 115}" y="${P(k)[1] + 51}" text-anchor="middle" font-size="26" fill="${t.fg}">${s}</text>`).join('');
  const arrows = [0, 1, 2, 3].map((k) => `<line x1="${P(k)[0] + 115}" y1="${P(k)[1] + 42}" x2="${P(k + 1)[0] + 115}" y2="${P(k + 1)[1] + 42}" stroke="${t.fg}" stroke-width="3" marker-end="url(#m)" stroke-dasharray="1 0"/>`).join('');
  add('flow', title, base(t, title, `<svg width="1168" height="590"><defs><marker id="m" markerWidth="16" markerHeight="12" refX="60" refY="6" orient="auto"><path d="M0,0 L16,6 L0,12 z" fill="${t.fg}"/></marker></defs>${arrows}${boxes}</svg>`),
    [{ type: 'next', q: `Following the arrows, which step comes right after ${steps[1]}?`, a: steps[2] }, { type: 'last', q: 'Following the arrows, which step is the last one?', a: steps[4] }]);
});
fs.mkdirSync(`${dir}frames`, { recursive: true });
const list = await (await fetch('http://127.0.0.1:9333/json')).json();
const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl); await new Promise((r) => { ws.onopen = r; });
let id = 0; const send = (method, params = {}) => new Promise((res) => { const i = ++id; const h = (e) => { const m = JSON.parse(e.data); if (m.id === i) { ws.removeEventListener('message', h); res(m.result); } }; ws.addEventListener('message', h); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
for (const s of slides) { await send('Page.navigate', { url: 'data:text/html;charset=utf-8,' + encodeURIComponent(s.html) }); await new Promise((r) => setTimeout(r, 250)); const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 55 }); fs.writeFileSync(`${dir}frames/${s.id}.jpg`, Buffer.from(shot.data, 'base64')); delete s.html; }
await send('Emulation.clearDeviceMetricsOverride'); ws.close();
fs.writeFileSync(`${dir}hard.json`, JSON.stringify(slides, null, 1)); console.log(slides.length);
