# Next step: build the smallest executable core

## Recommendation

Do not publish an NPM package yet. First create a private, local package inside this repository named `@crysnova/voip-core`. It will contain only pure call-session logic and a bounded PCM queue. It will not depend on Baileys, tinyasr, CODY, an LLM, or a TTS provider.

Publishing too early would freeze an API before we know the real media formats and call lifecycle. The internal package gives us a clean structure without creating distribution work.

## What we are lacking now

1. **An executable orchestrator.** We have a reference design, but no small program that owns one call from ringing to cleanup.
2. **A Node tinyasr adapter.** tinyasr can recognize streaming PCM, but CODY does not yet have a stable Node-facing adapter with normalized events.
3. **A media-format boundary.** We must validate sample rate, channels, frame size, and Float32 PCM conversions instead of guessing.
4. **A bounded outbound queue.** TTS audio needs cancellation, backpressure, and a maximum size so speech cannot grow forever.
5. **Turn-taking state.** Partial text, committed text, end-of-turn, thinking, speaking, and barge-in need explicit state transitions.
6. **A fake test harness.** Before a phone call, we need tests that prove the core logic with fake ASR, TTS, and transport adapters.
7. **A real integration runner.** After the fake tests pass, we need one controlled Baileys runner for the actual phone test. This belongs in VOIP first; CODY integration comes later and only by explicit request.
8. **Verified outgoing-call behavior.** Incoming answering is already identified; the exact outgoing-call entry point and lifecycle still need to be tested against the pinned Baileys code.

## Why these gaps exist

The existing projects provide powerful pieces, but they have different responsibilities and data contracts. Baileys handles WhatsApp/WebRTC media, tinyasr handles recognition, and CODY handles the assistant experience. None of them should silently become the owner of the entire conversation lifecycle. The missing work is the adapter and orchestration layer between them.

## Immediate sequence

1. Test the pure `@crysnova/voip-core` package.
2. Add fake ASR/TTS/transport adapters and run a deterministic audio-loop simulation.
3. Add a tinyasr adapter behind the same interface.
4. Add a Baileys transport adapter without changing CODY.
5. Run the first real phone smoke test.
6. Only then decide whether a public NPM package is useful.

## Later package boundary

If the core becomes useful outside this repository, publish it only after the API has survived real calls. A possible future split is:

- `@crysnova/voip-core`: call state, events, queue, contracts.
- `@crysnova/voip-baileys`: Baileys transport adapter.
- `@crysnova/voip-tinyasr`: tinyasr adapter.
- `@crysnova/voip-tts-*`: provider-specific adapters.

These are future boundaries, not four packages to build now.
