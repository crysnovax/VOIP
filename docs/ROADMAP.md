# Roadmap

## Phase 0: Safe notebook

Create the repository, documentation, `.gitignore`, experiment log, and test log. No secrets or recordings. Exit when the project can be resumed without relying on memory.

## Phase 1: Call lifecycle

Use the existing CODY VOIP readiness path. Detect, answer, connect, reject, hang up, and clean up. Test from a normal phone. Exit: five clean calls and no session reset required.

## Phase 2: Audio transport

Play known audio into the call and capture inbound audio. Measure format, delay, packet loss, underflow, and overflow. Exit: the caller hears a known sound and a local diagnostic confirms intelligible inbound audio.

## Phase 3: Streaming recognition

Build the tinyasr Node bridge. Test first with saved PCM, then with live phone audio. Exit: five known sentences produce useful committed text.

## Phase 4: Fixed voice responses

Map test phrases to fixed replies. Stream TTS or prerecorded responses into the call. Exit: ten request/reply turns with no overlap.

## Phase 5: CODY reasoning

Connect the call turn controller to CODY's response engine. Add timeout, maximum response size, fallback, and call-specific context. Exit: approved conversation script passes without runaway behavior.

## Phase 6: Interruption and reliability

Implement barge-in, queue cancellation, stale-call cleanup, reconnect behavior, observability, allowlists, duration limits, and process restart tests. Exit: 30-minute controlled run and restart matrix pass.

## Phase 7: Controlled beta

Use a small allowlist and explicit disclosure to testers. Monitor errors without retaining content. Exit: repeated real calls across more than one network.

## Phase 8: Video research

Only now investigate video upgrade, camera frames, NV12 conversion, vision processing, consent, and bandwidth. Video is not part of the first success definition.
