// Makes 50 synthetic presentation slides with known content, renders them at 1280x720 in the
// Chrome on port 9333, and saves them as JPEG the way a shared screen looks. usage: node gen.mjs
import fs from 'node:fs';
const dir = new URL('.', import.meta.url).pathname;
let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const pick = (a) => a[Math.floor(rnd() * a.length)];
const themes = [
  { bg: '#ffffff', fg: '#1f2937', accent: '#2563eb', font: 'Helvetica Neue, Arial, sans-serif' },
  { bg: '#0f172a', fg: '#f1f5f9', accent: '#38bdf8', font: 'Helvetica Neue, Arial, sans-serif' },
  { bg: '#fdf6e3', fg: '#3b2f2f', accent: '#b45309', font: 'Georgia, serif' },
  { bg: '#f1f5f9', fg: '#0f172a', accent: '#059669', font: 'Verdana, sans-serif' },
  { bg: '#1e1b4b', fg: '#e0e7ff', accent: '#f472b6', font: 'Trebuchet MS, sans-serif' },
];
const topics = [
  ['Q3 revenue by region', ['North America grew 12% year over year', 'Europe was flat after the pricing change', 'Asia Pacific added 41 new accounts', 'Latin America launches in January']],
  ['Hiring plan for 2027', ['Open 14 engineering roles in the first half', 'Move recruiting coordinators to the people team', 'Freeze contractor budgets until March']],
  ['Why checkout conversion dropped', ['Mobile load time rose from 2.1 to 3.4 seconds', 'The new address form added two required fields', 'Apple Pay was hidden behind a second tap']],
  ['Migration timeline', ['Freeze schema changes on February 3', 'Dual-write to both clusters for two weeks', 'Cut over read traffic on February 24', 'Decommission the old cluster in April']],
  ['Customer support backlog', ['Median first response is now 9 hours', 'Refund tickets make up 38% of volume', 'Weekend coverage starts next month']],
  ['Course overview: Statistics 201', ['Weekly problem sets are due on Thursdays', 'The midterm covers chapters 1 through 6', 'Office hours move to room 214']],
  ['Security review findings', ['Three services still accept TLS 1.0', 'Rotate the staging database credentials', 'Enable audit logs on the billing bucket']],
  ['Marketing budget reallocation', ['Shift 20% of paid search to partner events', 'Pause the podcast sponsorship in Q1', 'Double the customer webinar series']],
  ['Onboarding redesign goals', ['Cut time to first project below five minutes', 'Remove the mandatory team invite step', 'Show sample data before asking for imports']],
  ['Supply chain risks', ['Two suppliers share the same port', 'Lead times for sensors rose to 19 weeks', 'Qualify a second battery vendor by June']],
  ['Lecture 8: Photosynthesis', ['Light reactions happen in the thylakoid membrane', 'The Calvin cycle fixes carbon in the stroma', 'C4 plants separate the two steps in space']],
  ['Roadmap priorities', ['Offline mode for the mobile app', 'Bulk export to spreadsheets', 'Single sign-on for enterprise plans']],
  ['Incident review: November 12 outage', ['A config push removed the health check', 'Failover took 23 minutes instead of 5', 'Add a canary stage to config deploys']],
  ['Team survey results', ['82% say priorities are clear', 'Only 47% feel meetings are useful', 'Remote staff want overlapping core hours']],
  ['Pricing experiment', ['The annual plan discount moved from 15% to 20%', 'Trial length stayed at 14 days', 'Upgrade rate rose by 3.2 points']],
  ['Accessibility audit summary', ['41 images are missing alternative text', 'Focus order breaks in the settings dialog', 'Color contrast fails on the secondary button']],
  ['Research methods', ['We interviewed 18 participants in three cities', 'Sessions lasted 45 minutes on average', 'Transcripts were coded by two reviewers']],
  ['Next steps', ['Send the revised proposal by Friday', 'Book the vendor demo for next week', 'Review the budget with finance']],
  ['Energy use by building', ['The lab wing uses 44% of total power', 'Lighting retrofits saved 310 megawatt hours', 'Install submeters on floors 2 and 3']],
  ['Launch checklist', ['Legal approved the updated terms', 'Support macros are translated into six languages', 'The status page has a launch banner ready']],
];
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const base = (t, body) => `<!doctype html><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;width:1280px;height:720px;overflow:hidden;background:${t.bg};color:${t.fg};font-family:${t.font};padding:54px 72px}h1{font-size:46px;margin:0 0 30px;line-height:1.15}li{font-size:30px;margin:0 0 18px;line-height:1.3}ul{padding-left:36px}table{border-collapse:collapse;font-size:25px;width:100%}th,td{padding:13px 18px;border-bottom:1px solid ${t.fg}44;text-align:right}th:first-child,td:first-child{text-align:left}th{color:${t.accent}}.foot{position:absolute;left:72px;bottom:26px;font-size:17px;opacity:.6}.big{font-size:68px;font-weight:700;line-height:1.15;margin-top:150px}.sub{font-size:30px;opacity:.75;margin-top:26px}</style>${body}`;
const slides = [];
const add = (kind, title, html, truth) => slides.push({ id: `s${String(slides.length + 1).padStart(2, '0')}`, kind, title, html, ...truth });
// 20 title + bullets
topics.forEach(([title, bullets], i) => { const t = themes[i % 5]; add('bullets', title, base(t, `<h1>${esc(title)}</h1><ul>${bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul><div class="foot">Slide ${i + 2} · Quarterly review</div>`), { bullets }); });
// 12 tables
const tableTitles = ['Revenue by region, in millions of dollars', 'Support tickets by category', 'Headcount by department', 'Monthly active users by plan', 'Exam scores by section', 'Energy use in megawatt hours', 'Conversion rate by channel, percent', 'Shipping delays by carrier, in days', 'Budget versus actual, in thousands', 'Bug counts by severity', 'Survey responses by office', 'Inventory by warehouse'];
const rowSets = [['North America', 'Europe', 'Asia Pacific', 'Latin America'], ['Billing', 'Login', 'Shipping', 'Refunds'], ['Engineering', 'Sales', 'Support', 'Operations'], ['Free', 'Starter', 'Team', 'Enterprise']];
tableTitles.forEach((title, i) => {
  const t = themes[(i + 2) % 5]; const cols = ['Q1', 'Q2', 'Q3', 'Q4']; const rows = rowSets[i % 4];
  const dec = i % 3 === 0; const cells = rows.map(() => cols.map(() => (dec ? (rnd() * 90 + 5).toFixed(1) : String(Math.floor(rnd() * 900 + 60)))));
  add('table', title, base(t, `<h1>${esc(title)}</h1><table><tr><th></th>${cols.map((c) => `<th>${c}</th>`).join('')}</tr>${rows.map((r, k) => `<tr><td>${r}</td>${cells[k].map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</table><div class="foot">Source: internal dashboard</div>`),
    { table: { cols, rows, cells }, questions: [0, 1, 2].map(() => { const r = Math.floor(rnd() * 4), c = Math.floor(rnd() * 4); return { q: `What is the value for ${rows[r]} in ${cols[c]}?`, a: cells[r][c] }; }) });
});
// 10 bar charts with value labels
const chartTitles = ['Weekly sign-ups', 'Average response time in hours', 'Units sold by product line', 'Page load time in seconds by release', 'Students enrolled by year', 'Defects found per sprint', 'Rainfall by month in millimeters', 'Donations by campaign, in thousands', 'Battery life in hours by model', 'Churn rate by cohort, percent'];
const labelSets = [['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], ['Alpha', 'Beta', 'Gamma', 'Delta', 'Omega'], ['2022', '2023', '2024', '2025', '2026'], ['v1.0', 'v1.1', 'v1.2', 'v2.0', 'v2.1']];
chartTitles.forEach((title, i) => {
  const t = themes[(i + 1) % 5]; const labels = labelSets[i % 4]; const vals = labels.map(() => (i % 2 ? +(rnd() * 9 + 0.5).toFixed(1) : Math.floor(rnd() * 480 + 20)));
  const max = Math.max(...vals); const labelled = i % 2 === 0;
  const bars = vals.map((v, k) => { const h = Math.round((v / max) * 380); const x = 90 + k * 215; return `<rect x="${x}" y="${430 - h}" width="130" height="${h}" fill="${t.accent}"/>${labelled ? `<text x="${x + 65}" y="${420 - h}" text-anchor="middle" font-size="24" fill="${t.fg}">${v}</text>` : ''}<text x="${x + 65}" y="466" text-anchor="middle" font-size="24" fill="${t.fg}">${labels[k]}</text>`; }).join('');
  const ticks = labelled ? '' : [0, 0.25, 0.5, 0.75, 1].map((f) => `<line x1="70" x2="1130" y1="${430 - f * 380}" y2="${430 - f * 380}" stroke="${t.fg}33"/><text x="60" y="${437 - f * 380}" text-anchor="end" font-size="20" fill="${t.fg}">${+(max * f).toFixed(1)}</text>`).join('');
  const hi = vals.indexOf(max), lo = vals.indexOf(Math.min(...vals));
  add('chart', title, base(t, `<h1>${esc(title)}</h1><svg width="1136" height="490" style="font-family:inherit">${ticks}<line x1="70" x2="1130" y1="430" y2="430" stroke="${t.fg}"/>${bars}</svg>`),
    { chart: { labels, vals, labelled }, questions: [{ q: 'Which bar is the highest?', a: labels[hi] }, { q: 'Which bar is the lowest?', a: labels[lo] }, ...(labelled ? [{ q: `What is the value for ${labels[2]}?`, a: String(vals[2]) }] : [])] });
});
// 8 big statement / section slides
[['Thank you', 'Questions?'], ['Part 2', 'What we learned from the pilot'], ['Demo', 'Live walkthrough of the new dashboard'], ['Agenda', 'Results, risks, and next quarter'], ['Break', 'We resume at 2:15 PM'], ['Appendix', 'Detailed tables and methods'], ['Welcome', 'All-hands meeting, November 2026'], ['Key takeaway', 'Fix load time before adding features']].forEach(([title, sub], i) => { const t = themes[(i + 3) % 5]; add('section', title, base(t, `<div class="big">${esc(title)}</div><div class="sub">${esc(sub)}</div>`), { sub }); });

fs.mkdirSync(`${dir}frames`, { recursive: true });
const list = await (await fetch('http://127.0.0.1:9333/json')).json();
const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl); await new Promise((r) => { ws.onopen = r; });
let id = 0; const send = (method, params = {}) => new Promise((res) => { const i = ++id; const h = (e) => { const m = JSON.parse(e.data); if (m.id === i) { ws.removeEventListener('message', h); res(m.result); } }; ws.addEventListener('message', h); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
for (const s of slides) {
  await send('Page.navigate', { url: 'data:text/html;charset=utf-8,' + encodeURIComponent(s.html) }); await new Promise((r) => setTimeout(r, 250));
  // JPEG quality 55 stands in for the compression of a shared screen.
  const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 55 });
  fs.writeFileSync(`${dir}frames/${s.id}.jpg`, Buffer.from(shot.data, 'base64')); delete s.html;
}
await send('Emulation.clearDeviceMetricsOverride'); ws.close();
fs.writeFileSync(`${dir}slides.json`, JSON.stringify(slides, null, 1)); console.log(slides.length, 'slides');
