# Next step: build the smallest executable core

## Recommendation

Do not publish an NPM package yet. First create a private, local package inside this repository named `voip-core`. It will contain only pure call-session logic and a bounded PCM queue. It will not depend on Baileys, tinyasr, CODY, an LLM, or a TTS provider.

Publishing too early would freeze an API before we know the real media formats and call lifecycle. The internal package gives us a clean structure without creating distribution work.

## What we are lacking now

1. **A VOIP call subsystem inside CODY.** CODY already owns the WhatsApp session, user identity, bot commands, response generation, and user-facing communication. We need a small call-specific module that CODY can invoke to own one call from ringing to cleanup; it must not become a second bot.
2. **A Node tinyasr adapter.** tinyasr can recognize streaming PCM, but CODY does not yet have a stable Node-facing adapter with normalized events.
3. **A media-format boundary.** We must validate sample rate, channels, frame size, and Float32 PCM conversions instead of guessing.
4. **A bounded outbound queue.** TTS audio needs cancellation, backpressure, and a maximum size so speech cannot grow forever.
5. **Turn-taking state.** Partial text, committed text, end-of-turn, thinking, speaking, and barge-in need explicit state transitions.
6. **A fake test harness.** Before a phone call, we need tests that prove the core logic with fake ASR, TTS, and transport adapters.
7. **A real integration runner.** After the fake tests pass, we need one controlled Baileys runner for the actual phone test. It can be developed in VOIP first, but its final responsibility is to plug into CODY's existing session and command flow rather than replace CODY.
8. **Verified outgoing-call behavior.** Incoming answering is already identified; the exact outgoing-call entry point and lifecycle still need to be tested against the pinned Baileys code.

## Why these gaps exist

The existing projects provide powerful pieces, but they have different responsibilities and data contracts. CODY is the bridge: it owns the WhatsApp session and the relationship with the caller, and it remains responsible for generating and sending the response. Baileys handles the call media, tinyasr handles recognition, and the VOIP subsystem supplies the call-specific adapters, state, queue, and timing needed by CODY.

## Immediate sequence

1. Test the pure `voip-core` package.
2. Add fake ASR/TTS/transport adapters and run a deterministic audio-loop simulation.
3. Add a tinyasr adapter behind the same interface.
4. Add a Baileys transport adapter that can later be called by CODY without replacing CODY's session.
5. Run the first real phone smoke test.
6. Only then decide whether a public NPM package is useful.

## Later package boundary

If the core becomes useful outside this repository, publish it only after the API has survived real calls. A possible future split is:

- `voip-core`: call state, events, queue, contracts.
- `voip-plogme`: Baileys transport adapter.
- `voip-tinyasr`: tinyasr adapter.
- `voip-tts-*`: provider-specific adapters.

These are future boundaries, not four packages to build now.
