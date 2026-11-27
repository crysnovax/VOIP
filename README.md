# CODY AI VOIP

A living engineering notebook for adding a WhatsApp voice-call capability inside CODY AI, starting with incoming and outgoing audio calls and leaving video for a later phase. CODY remains the bot, WhatsApp session owner, caller-facing bridge, and response generator; VOIP is a subsystem CODY controls.

## Honest feasibility statement

The design is technically plausible. The critical path is not the idea; it is proving the real WhatsApp media loop: answer a call, receive PCM, recognize speech, generate bounded audio, send PCM back, and cleanly end the call. Existing Baileys VOIP support, tinyasr streaming recognition, and CODY's existing audio/TTS paths make this a credible project, but they do not guarantee protocol compatibility, low latency, free hosting, or production reliability.

## Start here

1. Read [`VOIP_PLAN.txt`](./VOIP_PLAN.txt), the primary production reference.
2. Read [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) before implementation.
3. Follow [`docs/ROADMAP.md`](./docs/ROADMAP.md) in order; do not jump to video.
4. Use [`docs/TEST_PLAN.md`](./docs/TEST_PLAN.md) for every phone test.
5. Record important discoveries in [`docs/DECISIONS.md`](./docs/DECISIONS.md) and [`docs/EXPERIMENTS.md`](./docs/EXPERIMENTS.md).
6. Review [`docs/RISKS_AND_LIMITS.md`](./docs/RISKS_AND_LIMITS.md) before promising a capability.
7. Read [`docs/PACKAGE_STRATEGY.md`](./docs/PACKAGE_STRATEGY.md) for the reusable package boundaries.

## Repository boundary

This repository is documentation and future VOIP-specific implementation space. It describes a subsystem that will eventually be called by CODY. Do not modify CODY or Baileys from this repository unless a later task explicitly requests implementation work. Keep secrets, WhatsApp auth state, recordings, and private transcripts out of Git.

## Project principle

Build one reliable loop at a time. A ten-call audio proof is more valuable than an impressive but untested video demo.

## First executable step

The repository now contains a private, dependency-free internal package named `@crysnova/voip-core`. It models incoming and outgoing call lifecycles and provides a bounded PCM queue. Run `npm test` from the repository root. This core is deliberately not published to NPM yet; real Baileys, tinyasr, and TTS contracts must be verified first.

See [`docs/NEXT_STEP.md`](./docs/NEXT_STEP.md) for the missing adapters and the integration order.
