# Decisions

## D-001 — Audio before video

- **Date:** 2026-11-27
- **Decision:** Complete and stabilize incoming/outgoing audio before video.
- **Reason:** Audio exercises the essential call lifecycle, PCM transport, ASR, TTS, turn-taking, and reliability with fewer moving parts.
- **Revisit when:** Audio passes the ten-turn and restart acceptance gates.

## D-002 — Separate repository

- **Date:** 2026-11-27
- **Decision:** Keep VOIP planning and future VOIP-specific work in `crysnovax/VOIP`; do not change CODY or Baileys without an explicit implementation request.
- **Reason:** Preserve a durable reference and avoid mixing experimental work with production repositories.

## D-003 — Free-first, not free-guaranteed

- **Date:** 2026-11-27
- **Decision:** Prefer local/open-source components and free development resources, but document every dependency whose free tier or hosting is uncertain.
- **Reason:** Honest planning prevents a later surprise bill.

## Template

### D-XXX — title

- **Date:**
- **Decision:**
- **Alternatives considered:**
- **Reason:**
- **Evidence:**
- **Revisit when:**
