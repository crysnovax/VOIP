# Reusable package strategy

## Short answer

Yes, the VOIP capability can and should become reusable. The mistake would be publishing one large package that contains CODY's personality, WhatsApp session logic, ASR, TTS, and every provider together. Reusability comes from separating the stable call engine from replaceable integrations.

## Recommended structure: one repository, one main package, internal layers

The four layers do not need to become four separate repositories or four packages that CODY installs manually. We will keep them in one VOIP repository so one AI coding session can inspect, test, and fix the entire system together.

The repository can use internal workspaces:

```text
VOIP/
├── packages/
│   ├── voip-core/
│   ├── voip-plogme/
│   ├── voip-tinyasr/
│   └── voip-tts/
└── packages/plogme-voip/     <- public-facing umbrella/facade package
```

At the beginning, the internal packages can remain private workspace modules. They do not all need separate NPM releases.

The main installable package will be `plogme-voip` (or the final scoped name we choose). It connects the internal layers, exposes a simple API to CODY, and keeps CODY from importing four low-level packages directly.

Conceptually:

```text
CODY installs one package: plogme-voip
                         |
             umbrella package wires together
                         |
       core + Plogme adapter + ASR adapter + TTS adapter
```

This gives us one codebase to maintain and one primary package to document, while preserving internal boundaries so a future developer can reuse or replace an individual layer.

## Internal layers

### Layer 1: `@crysnova/voip-core`

This is the reusable engine. It should contain call-local state, lifecycle events, turn coordination, interruption rules, bounded PCM queues, timeouts, and adapter contracts.

It should not know about CODY, WhatsApp, Plogme, tinyasr, a particular LLM, or a particular TTS provider. Any bot should be able to use this layer if it can provide the required adapters.

This is currently represented by the private package skeleton in this repository. It is an internal workspace first, not a separate public release.

### Layer 2: `@crysnova/voip-plogme`

This is the WhatsApp/Plogme transport adapter. It translates the reusable core's operations into the actual Plogme/Baileys VOIP API: incoming calls, outgoing calls, answering, rejecting, inbound Float32 PCM, and outbound audio streams.

It may use Plogme as a dependency because this layer is intentionally Plogme-specific. The exact dependency style—regular dependency or peer dependency—must be chosen after the real VOIP API is tested and version compatibility is understood.

### Layer 3: provider adapters

Examples include:

- `@crysnova/voip-tinyasr` for tinyasr recognition.
- A local TTS adapter.
- A provider-specific TTS adapter if needed.
- A CODY response adapter, which should probably remain inside CODY because it knows CODY's session, history, personality, and commands.

These adapters remain replaceable inside the repository. The umbrella package can provide sensible defaults while allowing advanced users to override a layer. A user who only wants call transport should not be forced to use a particular AI provider.

### Layer 4: CODY integration

CODY remains the main bot and the owner of its existing WhatsApp session. CODY installs or imports the VOIP capability, supplies its authenticated session, caller policy, response handler, and TTS handler, and starts the feature.

Conceptually:

```js
const codyVoip = createVoip({
  transport: createPlogmeTransport({ session: codySock }),
  asr: createTinyAsrAdapter(),
  respond: (turn, context) => codyRespond(turn, context),
  speak: (text, options) => codySpeak(text, options),
  callerPolicy: codyCallerPolicy
});

codyVoip.start();
```

The actual function names will be decided after the first real integration. This example shows the ownership model, not a frozen API.

## Should the umbrella package be public?

Eventually, yes, if the umbrella API survives real calls and the licensing is understood. Other bots should be able to install one package without seeing CODY's private code.

Now, no. The current VOIP API is still experimental because the Plogme VOIP behavior, PCM formats, outgoing-call method, tinyasr bridge, and TTS streaming path have not passed real phone tests. Publishing now would create a public promise around guesses.

The staged release path is:

1. One private repository with internal layers and fake adapters.
2. One local `plogme-voip` facade used by CODY.
3. Real phone smoke tests.
4. A small `0.1.0-beta` release of the umbrella package if the facade is stable.
5. Public documentation and examples.
6. Publish individual internal layers only when another real user needs them independently.

Public NPM publication itself can be free. Hosting, AI APIs, and always-on execution are separate cost questions.

## Why not maintain four separate repositories?

A single monorepo with a facade is easier for our current budget and AI-credit limits than four separate repositories. One agent can inspect the entire call path, run one test command, and fix a cross-layer bug without cloning and understanding four projects.

The facade should not hide the internal boundaries in the source code. It only hides them from normal consumers such as CODY.

The better rule is:

> One repository for maintenance; one umbrella package for normal installation; stable engine in the core; provider behavior in adapters; CODY-specific behavior stays in CODY.

## What we build next

The immediate implementation target is still small:

1. Complete and test the core contracts.
2. Create a fake transport, fake ASR, and fake TTS loop.
3. Create the first Plogme transport adapter against the pinned Baileys API.
4. Connect that adapter to CODY's existing session without copying CODY code into the package.
5. Run the first real phone test.
6. Put the working layers behind one `plogme-voip` facade.
7. Decide whether the umbrella package deserves a beta release.
