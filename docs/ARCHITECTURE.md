# Architecture

## Goal

CODY remains the WhatsApp bot, session owner, caller-facing bridge, and response owner. The VOIP subsystem is an internal capability that CODY invokes for call media and call-local state. It must not become a second WhatsApp bot or a replacement for CODY:

`WhatsApp/WebRTC -> Baileys ActiveCall -> PCM normalizer -> tinyasr -> turn controller -> CODY/LLM -> TTS -> bounded PCM queue -> Baileys AudioFeeder -> WhatsApp/WebRTC`

## Components

### 1. CODY integration and call manager

 CODY supplies the authenticated WhatsApp session, caller identity, command/configuration context, and response-generation path. The call manager is a CODY-owned subsystem responsible for allowlisting, answer/reject policy, one-call capacity, call timeout, lifecycle events, and cleanup. It must be able to stop a call even when ASR, LLM, or TTS is stuck.

It supports both directions. For an incoming call it validates the caller and answers or rejects the call. For an outgoing call it validates the destination, starts the call through the Baileys VOIP client, waits for the connected event, and then attaches the same inbound-ASR and outbound-audio pipeline. The media pipeline should not care who initiated the call.

### 2. PCM normalizer

Receives inbound Float32 frames from `ActiveCall`. Records the actual sample rate, channel count, and frame size. If tinyasr or TTS requires a different format, resamples explicitly. Every conversion is observable and testable.

### 3. tinyasr adapter

A narrow Node adapter around tinyasr native or WASM APIs. It accepts PCM chunks and emits normalized events:

```js
{ type: 'partial', text, confidence?, words? }
{ type: 'commit', text, confidence?, words? }
{ type: 'turnEnd', text? }
{ type: 'language', language }
```

The adapter must be replaceable. The rest of CODY should not depend on Rust symbols or tinyasr JSON details.

### 4. Turn controller

Buffers committed text into a call turn, waits for end-of-turn, prevents duplicate responses, and handles caller interruption. It owns the state machine:

`idle -> listening -> thinking -> speaking -> interrupted -> listening -> ended`

### 5. CODY response bridge

Starts with deterministic test responses. Then it calls the existing CODY reasoning path with a strict call context, timeout, maximum response length, and fallback message. The VOIP subsystem does not create a separate assistant personality or session; it hands a committed caller turn to CODY and receives the response to speak.

### 6. TTS adapter

Converts response text into the exact outbound PCM format required by the active call. The adapter must support streaming chunks or a temporary local file converted into a stream. It must expose cancellation.

### 7. Audio queue

A bounded queue between TTS and `AudioFeeder`. It prevents unlimited memory growth, supports cancellation on barge-in, and reports underruns/overruns. A response cannot begin until the call is connected.

## Invariants

- One active call has one call context and one cleanup owner.
- One committed caller turn causes at most one response.
- A canceled response cannot continue writing audio.
- All timers are cleared during cleanup.
- No provider credential enters a transcript or log.
- Content recording is disabled unless explicitly enabled for a local experiment.

## Minimal proof-of-concept pseudocode

```js
const outbound = new PassThrough({ highWaterMark: 64 * 1024 });
const queue = new BoundedPcmQueue(outbound, { maxBytes: 2 * 1024 * 1024 });

call.on('audio', frame => {
  const pcm = normalizeInbound(frame, callFormat);
  asr.push(pcm);
});

asr.on('turnEnd', async ({ text }) => {
  if (!text || turnController.busy) return;
  turnController.busy = true;
  try {
    const reply = await responseEngine.reply(text, { timeoutMs: 12_000 });
    await tts.stream(reply, chunk => queue.push(chunk));
  } finally {
    turnController.busy = false;
  }
});

const activeCall = await voip.answerIncomingCall(callId, {
  audioSource: outbound
});

// Outgoing calls use the same media pipeline after connection.
// The exact initiation method must be verified against the pinned Baileys API.
const outgoingCall = await voip.startOutgoingCall(destination, {
  audioSource: outbound
});

activeCall.on('ended', () => {
  asr.stop();
  queue.cancel();
  cleanupCallResources();
});
```

This is a design sketch, not a claim that these exact option names are already production-ready.
