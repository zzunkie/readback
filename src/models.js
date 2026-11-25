// Every model call in the app. All of them go through Firebase AI Logic (firebase/ai).
// Following the screen runs on the device; working out what a table, chart or diagram means
// runs in the cloud. Each function says which and why.
import { getGenerativeModel, InferenceMode } from 'firebase/ai';
import { ai } from './firebase.js';

export const FAST_MODEL = 'gemini-3.5-flash-lite';
export const DEEP_MODEL = 'gemini-4-hydrogen';
const IMAGE_INPUT = { expectedInputs: [{ type: 'image' }, { type: 'text', languages: ['en'] }] };
const image = (base64) => ({ inlineData: { mimeType: 'image/jpeg', data: base64 } });
const parse = (raw) => JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
const within = (promise, seconds) => Promise.race([promise, new Promise((_, no) => setTimeout(() => no(new Error('timeout')), seconds * 1000))]);

// 'available' | 'downloadable' | 'downloading' | 'unavailable'
export async function deviceStatus() {
  if (!self.LanguageModel) return 'unavailable';
  try { return await within(self.LanguageModel.availability(IMAGE_INPUT), 20); } catch { return 'unavailable'; }
}
export const downloadDeviceModel = (onProgress) => self.LanguageModel.create({ ...IMAGE_INPUT, monitor(m) { m.addEventListener('downloadprogress', (e) => onProgress(e.loaded)); } });

// One schema for the on-device model (responseConstraint) and the cloud model (responseSchema).
const HEAD_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'The slide title exactly as written, or the most prominent line of text. Empty string if the screen shows no text' },
    kind: { type: 'string', enum: ['text', 'table', 'chart', 'diagram', 'code', 'photo', 'other'], description: 'What the screen mostly shows' },
  },
  required: ['title', 'kind'],
};
const LINES_SCHEMA = {
  type: 'object',
  properties: { lines: { type: 'array', items: { type: 'string' }, description: 'Every line of text on the screen in reading order, exactly as written, without the title' } },
  required: ['lines'],
};

// mode 'device': the frame never leaves the machine. mode 'cloud': used only when the browser
// has no on-device model and the person agreed to send frames.
const reader = (schema, where) => getGenerativeModel(ai, {
  mode: where === 'cloud' ? InferenceMode.ONLY_IN_CLOUD : InferenceMode.ONLY_ON_DEVICE,
  onDeviceParams: { createOptions: IMAGE_INPUT, promptOptions: { responseConstraint: schema } },
  inCloudParams: { model: FAST_MODEL, generationConfig: { responseMimeType: 'application/json', responseSchema: schema } },
}, { timeout: 30000 });

// The first on-device call loads the model into memory and takes several seconds, so it is made
// once before any screen needs reading.
export async function warmUp() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 36; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 64, 36);
  try { await readHead(c.toDataURL('image/jpeg').split(',')[1]); } catch { /* the first real screen will report the problem */ }
}

// The on-device model occasionally stalls on a call. A screen that gets no answer in eight seconds
// is read by the cloud model instead, so the person is never left without an announcement.
export async function readHeadWithFallback(base64, where) {
  if (where === 'cloud') return readHead(base64, 'cloud');
  try { return await readHead(base64, 'device', 8); } catch (e) { if (!navigator.onLine) throw e; return { ...(await readHead(base64, 'cloud')), fellBack: true }; }
}

// Called every time the shared screen changes: dozens to hundreds of times in one meeting.
// It has to answer within a couple of seconds, so it runs on the device.
export async function readHead(base64, where = 'device', seconds = 30) {
  const result = await within(reader(HEAD_SCHEMA, where).generateContent(['This is a frame from a screen shared in a video meeting. Give the title of what is shown, exactly as written, and what kind of content it is.', image(base64)]), seconds);
  return { ...parse(result.response.text()), source: result.response.inferenceSource || (where === 'cloud' ? 'in_cloud' : 'on_device') };
}
export async function readLines(base64, where = 'device') {
  const result = await within(reader(LINES_SCHEMA, where).generateContent(['This is a frame from a screen shared in a video meeting. Copy every line of text in reading order, exactly as written. Leave out the title at the top.', image(base64)]), 45);
  return { lines: (parse(result.response.text()).lines || []).map((l) => String(l).replace(/^[\s•·▪◦\-–*]+/, '').trim()).filter(Boolean), source: result.response.inferenceSource || (where === 'cloud' ? 'in_cloud' : 'on_device') };
}

// A table, chart or diagram as something a screen reader can walk through. The on-device model
// reads clean text well but loses dense tables, unlabeled charts and arrows, so this is cloud work.
const DETAIL_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: 'One or two plain sentences: what this table, chart or diagram shows and the main point a sighted viewer would take from it' },
    columns: { type: 'array', items: { type: 'string' }, description: 'Column headers of the data, first column included. For a chart, the category label followed by one header per series. Empty for a diagram' },
    rows: { type: 'array', items: { type: 'array', items: { type: 'string' } }, description: 'Data rows matching columns. For a chart without printed values, read each value from the axis and prefix it with "about". Empty for a diagram' },
    steps: { type: 'array', items: { type: 'string' }, description: 'For a diagram or flow: each step or connection in order, following the arrows, one per entry. Empty otherwise' },
  },
  required: ['summary', 'columns', 'rows', 'steps'],
};
export async function describeDetail(base64) {
  const model = getGenerativeModel(ai, { mode: InferenceMode.ONLY_IN_CLOUD, inCloudParams: { model: DEEP_MODEL, generationConfig: { responseMimeType: 'application/json', responseSchema: DETAIL_SCHEMA, thinkingConfig: { thinkingLevel: 'low' } } } }, { timeout: 60000 });
  const result = await model.generateContent(['This is a frame from a screen shared in a video meeting. A blind participant needs its table, chart or diagram as data. Copy numbers exactly as printed; do not round printed values.', image(base64)]);
  return { ...parse(result.response.text()), source: 'in_cloud' };
}

// Questions about the current screen. Online they go to the larger cloud model with the current
// frame and, when there is one, the previous frame. Offline the same call falls back to the
// on-device model, which sees only the current frame.
export async function ask(question, base64, previous, onText) {
  const model = getGenerativeModel(ai, {
    mode: InferenceMode.PREFER_IN_CLOUD,
    inCloudParams: { model: DEEP_MODEL, generationConfig: { thinkingConfig: { thinkingLevel: 'low' } } },
    onDeviceParams: { createOptions: IMAGE_INPUT },
  }, { timeout: 60000 });
  const online = navigator.onLine;
  const parts = [`You are helping a blind participant in a video meeting. They cannot see the shared screen. Answer their question about it in one to three plain sentences, with exact numbers and names from the screen. If the screen does not show the answer, say so.${online && previous ? ' The first image is the previous screen and the second image is the current screen.' : ''}\n\nQuestion: ${question}`];
  if (online && previous) parts.push(image(previous));
  parts.push(image(base64));
  const result = await model.generateContentStream(parts);
  let text = '';
  for await (const chunk of result.stream) { text += chunk.text(); onText(text); }
  const response = await result.response;
  return { text, source: response.inferenceSource || (online ? 'in_cloud' : 'on_device') };
}

// After the meeting: a short written summary from the text that was read, no images.
const NOTES_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: 'Three to five sentences on what the presentation covered' },
    key_points: { type: 'array', items: { type: 'string' }, description: 'The decisions, numbers and dates worth remembering, one per entry, at most eight' },
  },
  required: ['summary', 'key_points'],
};
export async function writeNotes(slides) {
  const model = getGenerativeModel(ai, { mode: InferenceMode.ONLY_IN_CLOUD, inCloudParams: { model: FAST_MODEL, generationConfig: { responseMimeType: 'application/json', responseSchema: NOTES_SCHEMA } } }, { timeout: 60000 });
  const text = slides.map((s, i) => `Screen ${i + 1}: ${s.title}\n${(s.lines || []).join('\n')}${s.detail ? `\n${s.detail.summary}` : ''}`).join('\n\n');
  const result = await model.generateContent(`These are the screens shared in a meeting, in order, as text. Write notes for someone who could not see them.\n\n${text}`);
  return parse(result.response.text());
}
