# CODY AI VOIP

A living engineering notebook for giving CODY AI a WhatsApp voice-call interface, starting with incoming and outgoing audio calls and leaving video for a later phase.

## Honest feasibility statement

The design is technically plausible. The critical path is not the idea; it is proving the real WhatsApp media loop: answer a call, receive PCM, recognize speech, generate bounded audio, send PCM back, and cleanly end the call. Existing Baileys VOIP support, tinyasr streaming recognition, and CODY's existing audio/TTS paths make this a credible project, but they do not guarantee protocol compatibility, low latency, free hosting, or production reliability.

## Start here

1. Read [`VOIP_PLAN.txt`](./VOIP_PLAN.txt), the primary production reference.
2. Read [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) before implementation.
3. Follow [`docs/ROADMAP.md`](./docs/ROADMAP.md) in order; do not jump to video.
4. Use [`docs/TEST_PLAN.md`](./docs/TEST_PLAN.md) for every phone test.
5. Record important discoveries in [`docs/DECISIONS.md`](./docs/DECISIONS.md) and [`docs/EXPERIMENTS.md`](./docs/EXPERIMENTS.md).
6. Review [`docs/RISKS_AND_LIMITS.md`](./docs/RISKS_AND_LIMITS.md) before promising a capability.

## Repository boundary

This repository is documentation and future VOIP-specific implementation space. Do not modify CODY or Baileys from this repository unless a later task explicitly requests implementation work. Keep secrets, WhatsApp auth state, recordings, and private transcripts out of Git.

## Project principle

Build one reliable loop at a time. A ten-call audio proof is more valuable than an impressive but untested video demo.
