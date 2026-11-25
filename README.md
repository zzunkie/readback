# Readback

Readback follows a screen shared in a video meeting and reads it to blind and low-vision participants. A shared screen reaches the other participants as video, so a screen reader finds no text in it. Gemini Nano in Chrome announces each new screen on the device within a few seconds, and Gemini in the cloud turns tables, charts, and diagrams into tables and lists a screen reader can navigate. Both run through Firebase AI Logic hybrid inference.

- App: https://readback-meet.web.app (Chrome 139 or later on a desktop computer)
- Built for #BuildHybridAI 2026

## What it does

1. Open Readback in Chrome next to your meeting and press "Follow a shared screen", then choose the meeting tab or window. "Play the sample meeting" runs an eight-slide presentation through the same capture path, so you can try it without a call.
2. Readback checks the shared video feed a few times a second using plain pixel comparison without calling a model. It ignores regions that never stop moving, such as a camera tile, and it does not react when the presenter only moves the pointer.
3. When the screen changes and settles, Gemini Nano reads the frame in Chrome and Readback announces its title and content type: "Screen 3. Revenue by region, in millions of dollars. Table." The announcement goes to an ARIA live region so your screen reader speaks it, or Readback can speak it aloud itself. On text screens, Gemini Nano also reads the body lines on the device.
4. When Gemini Nano identifies a screen as a table, chart, or diagram, Readback sends that single frame to Gemini in the cloud. The cloud model returns a one-sentence summary and structured content: an HTML table with row and column headers that screen reader table commands can walk through, values read off the axis of an unlabeled chart, or the steps of a flowchart ordered along its arrows.
5. You can type a question about the current screen at any time, such as "Which region grew the most?" or "What changed from the previous slide?" When online, Gemini in the cloud answers using both the current and previous frames. When offline, Readback falls back to Gemini Nano on the current frame and notes that the on-device model answered.
6. Every screen stays in a list under headings, with its text and data, so you can go back while the presenter moves on.
7. When the meeting ends, Readback writes a short summary and exports everything that was shown as one HTML file with headings, lists, and tables.

Each item on screen carries an "On device" or "Cloud" badge based on `response.inferenceSource`, and a counter shows how many reads ran on the device and how many megabytes of frames were never uploaded.

## Where Firebase AI Logic is used

Every model call goes through the Firebase AI Logic Web SDK (`firebase/ai`). App Check with reCAPTCHA Enterprise is enforced on the Firebase AI Logic API.

| Step | Firebase AI Logic call | Why it runs there |
|---|---|---|
| Announce each new screen: title and kind of content | `InferenceMode.ONLY_ON_DEVICE`, image input, `onDeviceParams.promptOptions.responseConstraint` | It runs on every screen change for the whole meeting and has to answer in about two seconds. Running on the device, it works the same on a congested connection, and the meeting's screens are not uploaded one by one. |
| Read the body lines of a text screen | `InferenceMode.ONLY_ON_DEVICE`, image input, `onDeviceParams.promptOptions.responseConstraint` | Runs on the device so body text is ready within seconds without uploading frames. |
| Decide whether a screen needs the cloud | The `kind` field of the on-device answer | Only tables, charts, and diagrams go to the cloud. In the sample meeting, that is 5 of 8 screens. |
| Turn a table, chart, or diagram into data | `InferenceMode.ONLY_IN_CLOUD` on `gemini-4-hydrogen` with `responseSchema` and `thinkingConfig` | On our test set, the on-device model answered 45 and 53 of 91 questions about dense tables, unlabeled charts, and flowcharts in two runs, while this model answered 90 and 91. |
| Answer a question about the screen | `InferenceMode.PREFER_IN_CLOUD` with `generateContentStream()` (current and previous frames when online; current frame offline) | Comparing two screens to read values needs the larger cloud model, while `PREFER_IN_CLOUD` falls back to Gemini Nano when offline. |
| Read a screen when the on-device model stalls | The same schema sent with `InferenceMode.ONLY_IN_CLOUD` on `gemini-3.5-flash-lite` | If Gemini Nano gives no answer in eight seconds, that one screen is read in the cloud, so an announcement always arrives. |
| Write the meeting summary | `InferenceMode.ONLY_IN_CLOUD`, text only | It works from the text already read. No image is sent. |

The on-device call and the cloud fallback share one JSON schema: the cloud takes it as `responseSchema` and Gemini Nano as `responseConstraint`. In a browser without Gemini Nano, Readback asks for consent and then reads each screen with the cloud model through the same schema.

`src/watch.js` runs the change detection. It compares a 96 by 54 grayscale copy of each sample with the previous sample and with the last reported screen, waits for two quiet samples in a row, and excludes pixels that changed in most of the recent samples. When more than 30% of the frame changes, Readback announces a new screen; a smaller change is announced as an addition to the current screen, so a bullet revealed on click is read as "Added:".

The app is plain JavaScript with Vite, hosted on Firebase Hosting.

## Results on the test set

We built 86 test slides at 1280 by 720 with JPEG compression similar to a shared screen: 50 everyday slides (bullet lists, tables, bar charts, section titles) and 36 hard ones (12-row tables with 8 columns, bar charts with no printed values, three-series line charts, and flowcharts whose boxes are placed out of order). `eval/follow.html` plays them as a meeting, with a camera tile that keeps moving and a pointer that moves once per slide, and runs the app's own watcher and reader on the stream.

| Following 86 screens | Gemini Nano on the device (two runs) | Same app with the cloud model reading every screen |
|---|---|---|
| Screens announced | 86 of 86, 86 of 86 | 86 of 86 |
| Announcements with no new screen | 0, 0 | 0 |
| Title read exactly | 83 of 86, 82 of 86 | 86 of 86 |
| Time from the screen appearing to the announcement, median | 2.7 s, 2.6 s | 2.7 s |
| Frames uploaded | 0 | 86 (3.3 MB) |

About one second of that time is spent waiting for the frame to settle, and the rest is model inference. The titles Gemini Nano missed in the first run were two section slides where it included the subtitle and one where it changed "Fulfilment" to "Fulfillment".

| 91 questions about the 36 hard slides (two runs) | Gemini Nano | `gemini-3.5-flash-lite` | `gemini-4-hydrogen` |
|---|---|---|---|
| One cell of a 12 by 8 table (10) | 7, 7 | 10, 10 | 10, 10 |
| Which row is highest in a column (10) | 2, 3 | 9, 10 | 10, 10 |
| Sum of one row (10) | 0, 0 | 3, 3 | 10, 10 |
| Value of a bar read from the axis, within 8% of the scale (10) | 7, 8 | 10, 10 | 10, 10 |
| Tallest bar (10) | 10, 9 | 10, 10 | 10, 10 |
| Second tallest bar (10) | 4, 6 | 10, 10 | 10, 10 |
| Which line rose the most; which line is highest in a month (19) | 9, 12 | 15, 15 | 18, 19 |
| Next step and last step of a flowchart (12) | 6, 8 | 10, 10 | 12, 12 |
| Total (91) | 45, 53 | 77, 78 | 90, 91 |

These results show why Readback splits the work between models. Gemini Nano reads titles and plain text quickly and accurately; on the 12 clean four-by-four tables in the everyday set, it also answered 36 of 36 single-cell questions. Accuracy drops when a question requires combining many cells, estimating from an axis, or following arrows, so Readback sends those screens to the cloud.

For the data descriptions themselves, `eval/detail.html` runs the app's cloud description on the 22 table and chart slides in the everyday set against their ground-truth values: 217 of 217 printed values came back right, 25 of 25 values read from an axis were within 8% of the scale, and a description took a median of 5.5 seconds.

All timings are from an Apple M5 Max test machine. `eval/out/` has the per-slide results of each run.

## Run it locally

Create a Firebase project with Firebase AI Logic (Gemini Developer API) and App Check with reCAPTCHA Enterprise, then:

```
cp firebase-config.example.json firebase-config.json   # paste your web app config
echo "VITE_RECAPTCHA_SITE_KEY=<your site key>" > .env.production
echo "VITE_APPCHECK_DEBUG_TOKEN=<a debug token registered in App Check>" > .env.development.local
npm install
npm run dev        # http://localhost:5184
```

To reproduce the measurements, start Chrome with `--remote-debugging-port=9333`, open the app once so the on-device model is downloaded, and run:

```
node eval/run.mjs "follow.html" follow-device          # following 86 screens on the device
node eval/run.mjs "follow.html?where=cloud" follow-cloud # the same with the cloud model reading every screen
node eval/run.mjs "detail.html" detail                   # cloud data descriptions on 22 table and chart slides
node eval/run.mjs "questions.html" questions             # 91 questions, on-device model against two cloud models
```

The test slides are in `public/eval/` with their answer key in `public/eval/slides.json`. The sample presentation in `public/sample/` is made by `tools/make-sample.mjs`; the company and every number in it are invented.

## License

Apache 2.0
