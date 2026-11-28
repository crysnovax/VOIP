# voip-tinyasr

This package now includes a real Node WebAssembly adapter for crysnovax/tinyasr.

## Runtime artifacts

The adapter needs three files from the tinyasr repository:

- `web/tinyasr.wasm` or another compatible one-thread WASM build.
- A recognizer model such as `models/en-ru-uk.tzf.gz`.
- `models/silero_vad.onnx.gz`.

The model and VAD files may remain gzip-compressed. The adapter decompresses them in memory before calling `tinyasr_load()`.

## Usage

```js
import { createTinyAsrWasmAdapter } from 'voip-tinyasr';

const asr = await createTinyAsrWasmAdapter({
  wasmPath: '/opt/tinyasr/web/tinyasr.wasm',
  modelPath: '/opt/tinyasr/models/en-ru-uk.tzf.gz',
  vadPath: '/opt/tinyasr/models/silero_vad.onnx.gz',
  languages: 'en',
  startLanguage: 'en',
  beam: 1
});

const session = asr.start({ sampleRate: 16000, channels: 1 });
session.on('partial', event => console.log('partial:', event));
session.on('commit', event => console.log('commit:', event));
session.on('turnEnd', event => console.log('turn end:', event));

// Each chunk must be mono Float32 PCM at 16 kHz.
session.push(float32PcmChunk);
session.finish();
asr.close();
```

## What the adapter does

It instantiates the WASM module with the `env.now` import, allocates model/VAD memory, calls `tinyasr_load()`, creates a session with `tinyasr_session_new()`, writes Float32 PCM into WASM memory, calls `tinyasr_session_push()`, reads the returned JSON, normalizes `eou` into `turnEnd`, and frees the session/model memory.

The implementation follows tinyasr's published C header and web demo. tinyasr expects mono 16 kHz Float32 samples in the `[-1, 1]` range. Baileys audio must be checked and resampled before reaching this adapter if its negotiated format differs.

The `plogme-voip` facade performs that conversion with `PcmNormalizer`. It accepts interleaved Float32 PCM from the call, downmixes multiple channels by averaging them, and converts the input sample rate to 16 kHz with a stateful linear resampler. The state is preserved across WebRTC chunks, so a frame boundary cannot create a discontinuity in the speech stream. The normalizer currently emits mono only because that is the format tinyasr requires.

For a transport whose negotiated format is known, configure the facade with `audioFormat`:

```js
const voip = createPlogmeVoip({
  transport,
  audioFormat: { sampleRate: 48000, channels: 2 },
  asr,
  tts,
  respond
});
```

Do not resample each chunk independently. A streaming resampler must retain phase and the final source sample between chunks; otherwise calls can contain clicks, duplicated samples, or timing drift.

## Native path

The native tinyasr build currently produces a static library with `cargo build --release --features c-api`. Node cannot load a static `.a` file directly. A later native implementation needs either a small N-API/FFI shared-library bridge or a helper process that links `libtinyasr.a` and speaks a framed protocol. The WASM adapter is the first path because it is already built and has a documented host flow.
