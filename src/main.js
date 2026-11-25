import { deviceStatus, downloadDeviceModel, warmUp, readHeadWithFallback, readLines, describeDetail, ask, writeNotes } from './models.js';
import { watch, grab } from './watch.js';
import { sampleMeeting } from './sample.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const main = $('#main');
const state = { status: 'checking', speak: true, auto: true, full: true, where: 'device', screens: [], stats: { samples: 0, device: 0, cloud: 0, keptBytes: 0, sentBytes: 0 }, session: null };
const KIND = { text: 'Text', table: 'Table', chart: 'Chart', diagram: 'Diagram', code: 'Code', photo: 'Picture', other: 'Screen' };
const NEEDS_DETAIL = ['table', 'chart', 'diagram'];

// Everything the app says goes into one polite live region, which a screen reader reads on its
// own. "Speak aloud" adds the browser's speech for people who do not run a screen reader.
function say(text, { interrupt = false } = {}) {
  const live = $('#live'); if (live) { live.textContent = ''; setTimeout(() => { live.textContent = text; }, 30); }
  const shown = $('#said'); if (shown) shown.textContent = text;
  (window.__said ||= []).push({ at: performance.now(), text, interrupt });
  if (!state.speak || !self.speechSynthesis) return;
  if (interrupt) speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text); u.rate = 1.1; speechSynthesis.speak(u);
}

function pill() {
  const text = { checking: 'Checking the on-device model', available: 'On-device model ready', downloadable: 'On-device model not downloaded', downloading: 'Downloading the on-device model', unavailable: 'On-device model unavailable in this browser' }[state.status];
  const el = $('#device'); el.textContent = text; el.className = `pill ${state.status === 'available' ? 'on' : state.status === 'checking' ? '' : 'off'}`;
}

function home() {
  main.innerHTML = `<div class="start"><div>
    <h1>Read shared meeting screens as they change</h1>
    <p class="lead">In a video meeting, a shared screen reaches you as video, so a screen reader has nothing to read. Readback watches the shared screen in Chrome. The on-device model announces each new screen within seconds, and Gemini in the cloud turns tables, charts, and diagrams into structured tables and lists your screen reader can navigate.</p>
    <div class="row" style="margin-top:22px"><button id="share">Follow a shared screen</button><button id="sample" class="ghost">Play the sample meeting</button></div>
    ${state.status === 'downloadable' || state.status === 'downloading' ? `<p style="margin-top:14px"><button id="download" class="ghost"${state.status === 'downloading' ? ' disabled' : ''}>Download the on-device model (about 4 GB, once)</button> <span id="progress"></span></p>` : ''}
    <fieldset class="opts" style="border:0;padding:0"><legend class="sr">Options</legend>
      <label><input type="checkbox" id="speak"${state.speak ? ' checked' : ''}> Speak announcements aloud (turn off if your screen reader is running)</label>
      <label><input type="checkbox" id="full"${state.full ? ' checked' : ''}> Read body text on each screen in addition to its title</label>
      <label><input type="checkbox" id="auto"${state.auto ? ' checked' : ''}> Describe tables, charts, and diagrams automatically in the cloud</label>
    </fieldset></div>
    <aside class="how" aria-labelledby="how-h"><h2 id="how-h" style="margin-top:0">How to use it in a meeting</h2><ol>
      <li>Join your meeting in a Chrome tab or desktop meeting app.</li>
      <li>Press "Follow a shared screen" and choose the meeting tab or window.</li>
      <li>Keep this tab open. Each new screen is announced with its title.</li>
      <li>Type a question about the current screen at any time.</li>
      <li>Press "End and write notes" to summarize and save everything that was shown.</li></ol></aside></div>
    <div id="live" class="sr" aria-live="polite" role="status"></div>`;
  ['speak', 'full', 'auto'].forEach((k) => { $(`#${k}`).onchange = (e) => { state[k] = e.target.checked; }; });
  $('#share').onclick = () => begin('share'); $('#sample').onclick = () => begin('sample');
  if ($('#download')) $('#download').onclick = async () => { state.status = 'downloading'; pill(); $('#download').disabled = true; try { await downloadDeviceModel((p) => { $('#progress').textContent = `${Math.round(p * 100)}%`; }); state.status = 'available'; } catch { state.status = await deviceStatus(); } pill(); home(); };
}

async function begin(kind) {
  state.where = 'device';
  if (state.status !== 'available') {
    if (!confirm('The on-device model is not ready in this browser, so each new screen will be sent to Gemini in the cloud for reading. Continue?')) return;
    state.where = 'cloud';
  }
  let stream, sample = null;
  try {
    if (kind === 'sample') { sample = await sampleMeeting(); stream = sample.stream; } else stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 5 }, audio: false });
  } catch { say('No screen was chosen.'); return; }
  state.screens = []; state.stats = { samples: 0, device: 0, cloud: 0, keptBytes: 0, sentBytes: 0 }; state.notes = null;
  main.innerHTML = `<h1 class="sr">Following the shared screen</h1><div class="live">
    <figure class="screen" style="margin:0"><video id="video" muted playsinline aria-hidden="true"></video><figcaption>${kind === 'sample' ? 'Sample meeting. It is read through the same capture as a real shared screen.' : 'The screen you are sharing with this tab. Frames stay on this device unless a badge says "Cloud".'}</figcaption>
      <div class="row" style="margin-top:14px"><button id="end">End and write notes</button><button id="again" class="ghost">Read this screen again</button></div>
      <p class="saidbox" aria-hidden="true"><span>Last announcement</span><span id="said">None yet.</span></p>
      <p class="stats" id="stats"></p></figure>
    <div><section class="now" aria-labelledby="now-h"><h2 id="now-h">Current screen</h2><div id="now"><p>Waiting for the first screen.</p></div></section>
      <section aria-labelledby="ask-h"><h2 id="ask-h">Ask about the current screen</h2>
        <form class="ask" id="ask"><label class="sr" for="q">Your question</label><input id="q" autocomplete="off" placeholder="Which region grew the most?"><button>Ask</button></form><div id="answers"></div></section>
      <section aria-labelledby="hist-h"><h2 id="hist-h">Screens so far</h2><ol class="history" id="history"></ol></section></div></div>
    <div id="live" class="sr" aria-live="polite" role="status"></div>`;
  const video = $('#video'); video.srcObject = stream; await video.play();
  const stop = watch(video, { onSample: () => { state.stats.samples += 1; }, onChange: (change) => onChange(change) });
  const end = () => { stop(); sample?.stop(); stream.getTracks().forEach((t) => t.stop()); finish(); };
  stream.getVideoTracks()[0].addEventListener('ended', end);
  state.session = { video, end };
  $('#end').onclick = end;
  $('#again').onclick = () => onChange({ kind: 'screen', frame: grab(video) });
  $('#ask').onsubmit = (e) => { e.preventDefault(); const q = $('#q').value.trim(); if (q) { $('#q').value = ''; question(q); } };
  say(kind === 'sample' ? 'Sample meeting started.' : 'Following the shared screen.');
}

const badge = (source) => `<span class="badge ${source === 'in_cloud' ? 'cloud' : 'device'}">${source === 'in_cloud' ? 'Cloud' : 'On device'}</span>`;
const count = (source, bytes) => { if (source === 'in_cloud') { state.stats.cloud += 1; state.stats.sentBytes += bytes; } else { state.stats.device += 1; state.stats.keptBytes += bytes; } };

function detailHtml(d, title) {
  if (!d) return '';
  const table = d.columns?.length && d.rows?.length ? `<table class="data"><caption>${esc(title)}</caption><thead><tr>${d.columns.map((c) => `<th scope="col">${esc(c)}</th>`).join('')}</tr></thead><tbody>${d.rows.map((r) => `<tr>${r.map((c, i) => (i ? `<td>${esc(c)}</td>` : `<th scope="row">${esc(c)}</th>`)).join('')}</tr>`).join('')}</tbody></table>` : '';
  const steps = d.steps?.length ? `<ol class="steps">${d.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>` : '';
  return `<p style="margin-top:12px">${badge('in_cloud')}${esc(d.summary)}</p>${table}${steps}`;
}
const screenHtml = (s, n) => `<p class="title">${esc(s.title || 'Untitled screen')}</p><p>${badge(s.source)}Screen ${n} · ${KIND[s.kind] || 'Screen'}${s.seconds ? ` · read ${s.seconds.toFixed(1)} s after it settled` : ''}</p>
  ${s.lines?.length ? `<ul class="lines">${s.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}${s.detailPending ? '<p class="stats">Describing the data in the cloud…</p>' : ''}${detailHtml(s.detail, s.title)}${s.error ? `<p class="err">${esc(s.error)}</p>` : ''}`;

function paint() {
  const n = state.screens.length; if (!n) return;
  const cur = state.screens[n - 1];
  $('#now').innerHTML = screenHtml(cur, n);
  $('#history').innerHTML = state.screens.slice(0, -1).map((s, i) => `<li><h3>${i + 1}. ${esc(s.title || 'Untitled screen')}</h3>${s.lines?.length ? `<ul class="lines">${s.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}${detailHtml(s.detail, s.title)}</li>`).reverse().join('');
  const st = state.stats; const mb = (b) => (b / 1048576).toFixed(1);
  $('#stats').textContent = `${st.samples} frame${st.samples === 1 ? '' : 's'} checked for changes without a model · ${st.device} read${st.device === 1 ? '' : 's'} on this device (${mb(st.keptBytes)} MB of frames never uploaded) · ${st.cloud} cloud request${st.cloud === 1 ? '' : 's'} (${mb(st.sentBytes)} MB sent)`;
}

// One change at a time matters: if the presenter moves on while a screen is being read,
// the rest of that reading is dropped and the new screen is read instead.
let turn = 0;
async function onChange({ kind, frame }) {
  const mine = ++turn; const t0 = performance.now(); const current = () => mine === turn;
  const prev = state.screens[state.screens.length - 1];
  try {
    const head = await readHeadWithFallback(frame.base64, state.where); count(head.source, frame.bytes);
    if (!current()) return;
    const sameScreen = kind === 'update' && prev && prev.title === head.title;
    const s = sameScreen ? prev : { title: head.title, kind: head.kind, source: head.source, lines: [], frame, seconds: (performance.now() - t0) / 1000 };
    if (!sameScreen) { state.screens.push(s); paint(); say(`Screen ${state.screens.length}. ${head.title || 'No title'}. ${KIND[head.kind] || ''}.`, { interrupt: true }); } else s.frame = frame;
    // The cloud description does not wait for the on-device reading, and it is kept even if the
    // presenter has moved on by the time it arrives.
    const wantsDetail = state.auto && NEEDS_DETAIL.includes(s.kind) && navigator.onLine;
    if (wantsDetail && !(sameScreen && s.detail)) {
      s.detailPending = true; paint();
      describeDetail(frame.base64).then((d) => { s.detail = d; count('in_cloud', frame.bytes); if (current()) say(`${d.summary}${d.rows?.length ? ` The data is in a table with ${d.rows.length} rows.` : ''}${d.steps?.length ? ` ${d.steps.length} steps are listed.` : ''}`); })
        .catch((e) => { console.error(e); s.error = 'The cloud description did not arrive. Ask a question or press "Read this screen again".'; })
        .finally(() => { s.detailPending = false; if ($('#now')) paint(); });
    }
    // Copying a dense table cell by cell on the device is slow, and the loose labels of a chart or
    // diagram mean little when read aloud, so their text is left to the cloud description.
    if ((state.full || sameScreen) && !wantsDetail) {
      // Lines already heard are not repeated: the earlier state of a building slide, and footers
      // that sit on every screen.
      const key = (l) => l.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
      const before = new Set([...s.lines, ...(sameScreen ? [] : prev?.lines || [])].map(key));
      const body = await readLines(frame.base64, state.where); count(body.source, frame.bytes);
      if (!current()) return;
      s.lines = body.lines.filter((l) => l !== s.title); paint();
      const added = s.lines.filter((l) => !before.has(key(l)));
      if (added.length) say(`${sameScreen ? 'Added: ' : ''}${added.join('. ')}`);
    }
  } catch (e) { console.error(e); if (current()) say('This screen could not be read. Press "Read this screen again".'); }
}

async function question(q) {
  const { video } = state.session; const frame = grab(video);
  const prev = state.screens.length > 1 ? state.screens[state.screens.length - 2].frame : null;
  const block = document.createElement('div'); block.className = 'qa'; block.innerHTML = `<p class="q">${esc(q)}</p><p class="a">…</p>`; $('#answers').prepend(block);
  try {
    const r = await ask(q, frame.base64, prev?.base64, (text) => { block.querySelector('.a').textContent = text; });
    count(r.source, frame.bytes + (r.source === 'in_cloud' && prev ? prev.bytes : 0));
    block.querySelector('.a').innerHTML = `${badge(r.source)}${esc(r.text)}${r.source === 'on_device' ? ' <span class="stats">You are offline, so the on-device model answered.</span>' : ''}`;
    say(r.text, { interrupt: true }); paint();
  } catch (e) { console.error(e); block.querySelector('.a').innerHTML = '<span class="err">No answer arrived. Check your connection and ask again.</span>'; say('No answer arrived.'); }
}

// The notes file is plain HTML with headings, lists and real tables, so it reads well in any screen reader.
function notesFile(notes) {
  const body = state.screens.map((s, i) => `<h2>${i + 1}. ${esc(s.title || 'Untitled screen')}</h2>${s.lines?.length ? `<ul>${s.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}${s.detail ? `<p>${esc(s.detail.summary)}</p>${s.detail.columns?.length && s.detail.rows?.length ? `<table border="1"><caption>${esc(s.title)}</caption><thead><tr>${s.detail.columns.map((c) => `<th scope="col">${esc(c)}</th>`).join('')}</tr></thead><tbody>${s.detail.rows.map((r) => `<tr>${r.map((c, k) => (k ? `<td>${esc(c)}</td>` : `<th scope="row">${esc(c)}</th>`)).join('')}</tr>`).join('')}</tbody></table>` : ''}${s.detail.steps?.length ? `<ol>${s.detail.steps.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>` : ''}` : ''}`).join('\n');
  return `<!doctype html><html lang="en"><meta charset="utf-8"><title>Meeting screens</title><h1>Meeting screens</h1>${notes ? `<p>${esc(notes.summary)}</p><h2>Key points</h2><ul>${notes.key_points.map((k) => `<li>${esc(k)}</li>`).join('')}</ul>` : ''}\n${body}</html>`;
}

async function finish() {
  turn += 1; speechSynthesis?.cancel();
  const n = state.screens.length;
  main.innerHTML = `<h1>${n} screen${n === 1 ? '' : 's'} read</h1><div id="notes"><p>${n ? 'Writing notes…' : 'No screen was read.'}</p></div>
    <div class="row" style="margin-top:16px">${n ? '<a id="save" download="meeting-screens.html"><button class="ghost">Download notes as HTML</button></a>' : ''}<button id="home">Start again</button></div>
    <section aria-labelledby="all-h"><h2 id="all-h">Everything that was shown</h2><ol class="history">${state.screens.map((s, i) => `<li><h3>${i + 1}. ${esc(s.title || 'Untitled screen')}</h3>${s.lines?.length ? `<ul class="lines">${s.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}${detailHtml(s.detail, s.title)}</li>`).join('')}</ol></section>
    <div id="live" class="sr" aria-live="polite" role="status"></div>`;
  $('#home').onclick = home;
  if (!n) return;
  const link = () => { $('#save').href = URL.createObjectURL(new Blob([notesFile(state.notes)], { type: 'text/html' })); };
  link();
  try {
    state.notes = await writeNotes(state.screens); state.stats.cloud += 1;
    $('#notes').innerHTML = `<p>${badge('in_cloud')}${esc(state.notes.summary)}</p><h2>Key points</h2><ul class="lines">${state.notes.key_points.map((k) => `<li>${esc(k)}</li>`).join('')}</ul>`;
    link(); say(`Notes are ready. ${state.notes.summary}`);
  } catch (e) { console.error(e); $('#notes').innerHTML = '<p class="note">The summary could not be written, but the screens below are saved in the download.</p>'; }
}

window.__readback = state;
pill(); home();
deviceStatus().then((s) => { state.status = s; pill(); if (!state.session) home(); if (s === 'available') warmUp().then(() => { state.warm = true; }); });
