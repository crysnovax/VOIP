import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createPlogmeVoip } from '../packages/plogme-voip/src/index.mjs';

class FakeCall extends EventEmitter {
  constructor(options) {
    super();
    this.callId = 'fake-call-1';
    this.peerJid = '123@s.whatsapp.net';
    this.options = options;
  }

  end() { this.emit('ended', 'fake-end'); }
}

class FakeTransport extends EventEmitter {
  async connect() { this.connected = true; }
  async disconnect() { this.disconnected = true; }
  async answerIncomingCall(_callId, options) {
    this.activeCall = new FakeCall(options);
    return this.activeCall;
  }
  async call(_number, options) {
    this.activeCall = new FakeCall(options);
    return this.activeCall;
  }
  rejectIncomingCall(callId) { this.rejected = callId; }
}

class FakeAsr {
  start() {
    const session = new EventEmitter();
    session.push = () => {};
    session.stop = () => { session.stopped = true; };
    this.session = session;
    return session;
  }
}

class FakeTts {
  async *stream(text) {
    assert.equal(text, 'I heard you.');
    yield new Float32Array([0.1, 0.2, 0.3]);
  }
}

const tick = () => new Promise(resolve => setImmediate(resolve));

test('umbrella package answers an incoming call and routes one CODY response to TTS', async () => {
  const transport = new FakeTransport();
  const asr = new FakeAsr();
  const audio = [];
  const voip = createPlogmeVoip({
    transport,
    asr,
    tts: new FakeTts(),
    autoAnswer: true,
    callerPolicy: () => true,
    respond: text => {
      assert.equal(text, 'hello cody');
      return 'I heard you.';
    },
  });
  await voip.start({ connect: false });
  transport.emit('incomingCall', { callId: 'incoming-1', callerJid: '123@s.whatsapp.net', isVideo: false });
  await tick();
  assert.ok(transport.activeCall);
  transport.activeCall.options.audioSource.on('data', chunk => audio.push(chunk));
  transport.activeCall.emit('connected');
  asr.session.emit('turnEnd', { type: 'turnEnd', text: 'hello cody' });
  await tick();
  await tick();
  assert.ok(audio.length > 0);
  assert.equal(voip.active.session.state, 'listening');
  transport.activeCall.end();
  await tick();
  assert.equal(voip.active, null);
});

test('umbrella package rejects a disallowed automatic caller', async () => {
  const transport = new FakeTransport();
  const voip = createPlogmeVoip({
    transport,
    autoAnswer: true,
    callerPolicy: () => false,
  });
  await voip.start({ connect: false });
  transport.emit('incomingCall', { callId: 'blocked-1', callerJid: 'blocked@s.whatsapp.net' });
  await tick();
  assert.equal(transport.rejected, 'blocked-1');
  assert.equal(transport.activeCall, undefined);
});

test('umbrella package can initiate an outgoing call through the same facade', async () => {
  const transport = new FakeTransport();
  const voip = createPlogmeVoip({ transport });
  await voip.start({ connect: false });
  const call = await voip.call('+123456789');
  assert.equal(call.options.audioSource.constructor.name, 'PassThrough');
  assert.equal(voip.active.session.direction, 'outgoing');
  call.emit('connected');
  assert.equal(voip.active.session.state, 'listening');
  call.end();
  await tick();
});
