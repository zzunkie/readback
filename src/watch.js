// Watches a shared-screen video stream and reports when the picture has changed and settled.
// No model is involved: this is pixel arithmetic on a small grayscale copy of each frame.

const W = 96, H = 54;           // size of the comparison copy
const STEP = 350;               // milliseconds between samples
const CELL_DIFF = 22;           // a pixel counts as changed when its brightness moved this much (0-255)
const STILL = 0.004;            // share of changed pixels between two samples that still counts as "not moving"
const CHANGED = 0.008;          // share of changed pixels against the last reported frame that counts as new content
const NEW_SCREEN = 0.3;         // above this share it is a new screen, below it an update to the same screen

export function watch(video, { onChange, onSample = () => {} }) {
  const small = document.createElement('canvas'); small.width = W; small.height = H;
  const ctx = small.getContext('2d', { willReadFrequently: true });
  let last = null, reported = null, still = 0, timer = 0, stopped = false;
  // A camera tile or an animation never stops moving. Pixels that changed in most recent samples
  // are left out of the comparison, so the rest of the screen can still settle.
  const busy = new Float32Array(W * H);

  const gray = () => {
    ctx.drawImage(video, 0, 0, W, H);
    const { data } = ctx.getImageData(0, 0, W, H); const g = new Uint8Array(W * H);
    for (let i = 0; i < g.length; i += 1) g[i] = (data[i * 4] * 3 + data[i * 4 + 1] * 6 + data[i * 4 + 2]) / 10;
    return g;
  };
  const share = (a, b, mark) => { let n = 0, of = 0; for (let i = 0; i < a.length; i += 1) { const moved = Math.abs(a[i] - b[i]) > CELL_DIFF; if (mark) busy[i] = busy[i] * 0.85 + (moved ? 0.15 : 0); if (busy[i] > 0.5) continue; of += 1; if (moved) n += 1; } return of ? n / of : 0; };

  const tick = () => {
    if (stopped) return;
    if (video.readyState >= 2 && video.videoWidth) {
      const now = gray();
      if (last) {
        const moving = share(now, last, true);
        still = moving <= STILL ? still + 1 : 0;
        const against = reported ? share(now, reported, false) : 1;
        onSample({ moving, against });
        // Two quiet samples in a row: the presenter has stopped on something.
        if (still >= 2 && against > CHANGED) { reported = now; onChange({ kind: against > NEW_SCREEN ? 'screen' : 'update', frame: grab(video) }); }
      }
      last = now;
    }
    timer = setTimeout(tick, STEP);
  };
  tick();
  return () => { stopped = true; clearTimeout(timer); };
}

// The frame handed to the models: at most 1280 pixels wide, JPEG.
export function grab(video) {
  const scale = Math.min(1, 1280 / video.videoWidth);
  const c = document.createElement('canvas'); c.width = Math.round(video.videoWidth * scale); c.height = Math.round(video.videoHeight * scale);
  c.getContext('2d').drawImage(video, 0, 0, c.width, c.height);
  const url = c.toDataURL('image/jpeg', 0.85);
  return { url, base64: url.split(',')[1], bytes: Math.round(url.length * 0.75), width: c.width, height: c.height };
}
