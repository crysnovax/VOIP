
## Current implementation

The repository now contains the first `plogme-voip` facade and its internal layers:

```text
packages/voip-core       provider-neutral call state and queue
packages/voip-plogme     verified Plogme/WhatsApp transport boundary
packages/voip-tinyasr    normalized streaming ASR event boundary
packages/voip-tts        PCM TTS output boundary
packages/plogme-voip     one CODY-facing package
```

Run `npm test` to execute the dependency-free tests. Read [`packages/plogme-voip/README.md`](./packages/plogme-voip/README.md) for the facade contract and [`docs/IMPLEMENTATION_STATUS.md`](./docs/IMPLEMENTATION_STATUS.md) for the verified local API surface and remaining gates.
