# Implementation status

## Implemented in VOIP

The repository is now a monorepo with one umbrella package and internal workspaces:

```text
packages/voip-core       call state and queue primitives
packages/voip-plogme     Plogme transport adapter
packages/voip-tinyasr    normalized tinyasr session events
packages/voip-tts        PCM TTS stream normalization
packages/plogme-voip     CODY-facing umbrella facade
```

The facade supports an injected transport, incoming-call handling, optional auto-answer with caller policy, outgoing calls, inbound PCM forwarding to ASR, committed/end-of-turn response callbacks, bounded Node stream backpressure, TTS PCM output, and call cleanup.

## Verified against local source

The adapter is based on the local `crysnovax/baileys` VOIP implementation:

- `VoipClient({ sock, resourcesPath })` can reuse CODY's connected socket.
- `connect()` initializes the VOIP runtime.
- `incomingCall` exposes `callId`, peer information, and video state.
- `answerIncomingCall(callId, options)` accepts an `audioSource`.
- `call(phoneNumber, options)` starts an outgoing call and accepts an `audioSource`.
- `ActiveCall` emits `connected`, `audio`, and `ended`.
- `audioSource` is a Node readable stream of Float32 PCM.

The CODY `.voipready` command confirms the intended session ownership model, but CODY itself has not been modified by this repository.

## Intentionally not claimed yet

- A working native tinyasr loader for every operating system.
- A verified live phone call using the facade.
- A guaranteed outgoing call on every WhatsApp account.
- A production-ready TTS provider or sample-rate converter.
- Automatic CODY integration.
- Video support.

## Next integration gate

Build a real tinyasr session factory or bridge, then run a controlled Baileys phone smoke test using the same facade. Only after that should CODY import the package or the package be published publicly.
