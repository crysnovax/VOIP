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

## D-005 — Reusable capability, layered packages

- **Date:** 2026-11-27
- **Decision:** Make VOIP reusable through a layered design: a provider-neutral core, a Plogme/WhatsApp transport adapter, optional ASR/TTS adapters, and a thin CODY integration layer.
- **Alternatives considered:** One large public package containing CODY logic, Plogme, tinyasr, TTS, and all provider code; or copying VOIP code into each bot.
- **Reason:** Other bots should reuse the call capability without importing CODY-specific behavior, while CODY remains the session and response owner. Do not publish until real phone tests validate the contracts.
- **Evidence:** Package strategy documented in `docs/PACKAGE_STRATEGY.md`.
- **Revisit when:** The first real CODY integration and transport adapter are working.

## D-006 — One monorepo with an umbrella package

- **Date:** 2026-11-27
- **Decision:** Keep the VOIP layers in one repository and expose one main installable facade package, tentatively named `plogme-voip`. The internal core, Plogme transport, ASR, and TTS modules should initially be workspace modules rather than four separately maintained public repositories.
- **Alternatives considered:** Making CODY install and coordinate four independent public packages immediately.
- **Reason:** One repository is cheaper to maintain, easier for one AI agent to debug, and still preserves reusable internal boundaries. CODY gets one simple dependency while advanced users can later access individual layers if they become stable and useful.
- **Evidence:** Package strategy updated with the monorepo/facade model.
- **Revisit when:** The first real phone integration reveals whether any internal layer needs independent publication.

## Template

### D-XXX — title

- **Date:**
- **Decision:**
- **Alternatives considered:**
- **Reason:**
- **Evidence:**
- **Revisit when:**
