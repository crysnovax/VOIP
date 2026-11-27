# plogme-voip

Reusable WhatsApp VoIP capability for CODY and compatible bots. This package is currently a private beta inside the `crysnovax/VOIP` monorepo.

## Ownership

The consuming bot owns its authenticated WhatsApp session, identity, caller policy, response handler, and TTS provider. `plogme-voip` owns call-local media orchestration and does not create a second bot or session.

## Facade example

```js
import {
  createPlogmeVoip,
  createPlogmeTransport,
  createTinyAsrAdapter,
  createTtsAdapter
} from 'plogme-voip';

const transport = createPlogmeTransport({
  clientOptions: {
    sock: codySock,
    resourcesPath: process.env.PLOGME_VOIP_RESOURCES
  }
});

const voip = createPlogmeVoip({
  transport,
  asr: createTinyAsrAdapter({
    sessionFactory: ({ sampleRate, channels, language }) => createTinyAsrSession({ sampleRate, channels, language })
  }),
  tts: createTtsAdapter({
    speak: (text, format) => codyTtsAsFloat32Stream(text, format)
  }),
  callerPolicy: info => codyCallerPolicy(info),
  respond: (text, context) => codyRespond(text, context),
  autoAnswer: false
});

await voip.start();
```

The names `createTinyAsrSession`, `codyTtsAsFloat32Stream`, `codyCallerPolicy`, and `codyRespond` are supplied by the consuming application. They are not hidden CODY dependencies.

## Supported facade operations

- `voip.start()` attaches to the existing transport and listens for incoming calls.
- `voip.answer(info)` answers a pending call and attaches inbound audio to ASR.
- `voip.call(phoneNumber)` starts an outgoing call through the transport.
- `voip.stop()` removes listeners and disconnects the transport.
- `incomingCall` is emitted before automatic answering.
- `response` is emitted after TTS has been queued.
- `ended` is emitted after call-local cleanup.

## Current limitation

The tinyasr adapter intentionally accepts an injected `sessionFactory`. The exact native C/WASM loading code must be selected and tested against the tinyasr build before it becomes a package default. This avoids shipping a false native binding contract.
