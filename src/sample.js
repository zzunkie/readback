// The built-in sample meeting: a canvas that plays eight slides the way a shared screen would,
// with a presenter tile that keeps moving. It goes through the same capture path as a real share.
// The second slide builds: two bullets first, then all four.
const FILES = ['s1', 's2a', 's2', 's3', 's4', 's6', 's5', 's7', 's8'];
const SECONDS = [7, 8, 11, 20, 28, 18, 16, 18, 12];

export async function sampleMeeting() {
  const images = await Promise.all(SECONDS.map((_, i) => new Promise((ok, no) => { const img = new Image(); img.onload = () => ok(img); img.onerror = no; img.src = `/sample/${FILES[i]}.jpg`; })));
  const canvas = document.createElement('canvas'); canvas.width = 1280; canvas.height = 720;
  const ctx = canvas.getContext('2d'); const started = performance.now(); let done = false;
  const draw = () => {
    const t = (performance.now() - started) / 1000; let i = 0, left = t;
    while (i < SECONDS.length - 1 && left > SECONDS[i]) { left -= SECONDS[i]; i += 1; }
    ctx.drawImage(images[i], 0, 0, 1280, 720);
    // presenter tile: the kind of constant motion a camera thumbnail adds to a shared window
    ctx.fillStyle = '#111827'; ctx.fillRect(1090, 20, 170, 112); ctx.fillStyle = '#9ca3af'; ctx.beginPath(); ctx.arc(1175, 64, 26, 0, Math.PI * 2); ctx.fill();
    for (let k = 0; k < 9; k += 1) { ctx.fillStyle = '#34d399'; const h = 6 + Math.abs(Math.sin(t * 7 + k * 1.3)) * 18; ctx.fillRect(1118 + k * 13, 124 - h, 8, h); }
    done = i === SECONDS.length - 1 && left > SECONDS[i];
  };
  draw(); const timer = setInterval(draw, 100);
  const stream = canvas.captureStream(10);
  return { stream, finished: () => done, stop: () => { clearInterval(timer); stream.getTracks().forEach((tr) => tr.stop()); } };
}
