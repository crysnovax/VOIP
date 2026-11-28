import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PcmNormalizer } from 'voip-core';
import { PlogmeTransport } from 'voip-plogme';
import { TinyAsrAdapter } from 'voip-tinyasr';
import { TtsAdapter } from 'voip-tts';

test('tinyasr adapter normalizes JSON commit words and end-of-turn events', () => {
  const adapter = new TinyAsrAdapter({ sessionFactory: () => ({
    push: () => JSON.stringify({ type: 'events', ev: [{ type: 'commit', words: [{ text: 'hello' }, { text: 'world' }] }] }),
    finish: () => [{ type: 'end_of_turn', text: 'hello world' }]
  }) });
  const session = adapter.start();
  const committed = [];
  const turns = [];
  session.on('commit', event => committed.push(event.text));
  session.on('turnEnd', event => turns.push(event.text));
  session.push(new Float32Array([0, 0]));
  session.finish();
  assert.deepEqual(committed, ['hello world']);
  assert.deepEqual(turns, ['hello world']);
});

test('TTS adapter accepts a Float32 PCM iterable', async () => {
  const tts = new TtsAdapter({ speak: async function* () { yield new Float32Array([0.25, -0.25]); } });
  const chunks = [];
  for await (const chunk of tts.stream('hello')) chunks.push(chunk);
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].byteLength, 8);
});

test('PCM normalizer downmixes stereo and converts 48 kHz to 16 kHz', () => {
  const normalizer = new PcmNormalizer({ inputSampleRate: 48000, inputChannels: 2 });
  const first = normalizer.push(new Float32Array([
    1, 0, 1, 0, 1, 0, 1, 0,
    1, 0, 1, 0, 1, 0, 1, 0,
    1, 0, 1, 0, 1, 0, 1, 0
  ]));
  const second = normalizer.push(new Float32Array([
    1, 0, 1, 0, 1, 0, 1, 0,
    1, 0, 1, 0, 1, 0, 1, 0,
    1, 0, 1, 0, 1, 0, 1, 0
  ]));
  const tail = normalizer.flush();
  const output = Float32Array.from([...first, ...second, ...tail]);
  assert.equal(output.length, 8);
  assert.ok([...output].every(sample => Math.abs(sample - 0.5) < 1e-6));
});

test('Plogme transport delegates to an injected VoipClient', async () => {
  const client = new EventEmitter();
  client.connect = async () => { client.didConnect = true; };
  client.disconnect = async () => { client.didDisconnect = true; };
  client.call = async (number, options) => ({ number, options });
  client.answerIncomingCall = async (id, options) => ({ id, options });
  client.rejectIncomingCall = id => { client.rejected = id; };
  const transport = new PlogmeTransport({ client });
  await transport.connect();
  assert.equal(client.didConnect, true);
  assert.equal((await transport.call('123', {})).number, '123');
  assert.equal((await transport.answerIncomingCall('call-1', {})).id, 'call-1');
  transport.rejectIncomingCall('call-1');
  assert.equal(client.rejected, 'call-1');
  await transport.disconnect();
  assert.equal(client.didDisconnect, true);
});
