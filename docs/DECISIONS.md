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

## D-004 — CODY remains the bridge and owner

- **Date:** 2026-11-27
- **Decision:** CODY remains the WhatsApp bot, authenticated session owner, caller-facing bridge, response generator, and owner of the user relationship. VOIP is an internal capability that CODY invokes for call media and call-local state.
- **Alternatives considered:** Building a separate VOIP bot or separate WhatsApp session.
- **Reason:** CODY already has the session, identity, command system, response logic, and existing integrations. Creating another bot would duplicate state and make the system harder to reason about.
- **Evidence:** Existing CODY session and `.voipready` flow; corrected architecture discussion on 2026-11-27.
- **Revisit when:** The first CODY-integrated phone call is implemented and tested.

## Template

### D-XXX — title

- **Date:**
- **Decision:**
- **Alternatives considered:**
- **Reason:**
- **Evidence:**
- **Revisit when:**
