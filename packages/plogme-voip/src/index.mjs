import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { CallSession } from '@crysnova/voip-core';
import { PlogmeTransport } from '@crysnova/voip-plogme';
import { TinyAsrAdapter } from '@crysnova/voip-tinyasr';
import { TtsAdapter } from '@crysnova/voip-tts';

const writeChunk = async (stream, chunk) => {
  if (stream.destroyed) throw new Error('Call audio stream is closed.');
  if (stream.write(chunk)) return;
  await new Promise((resolve, reject) => {
    const onDrain = () => { cleanup(); resolve(); };
    const onError = error => { cleanup(); reject(error); };
    const cleanup = () => {
      stream.off('drain', onDrain);
      stream.off('error', onError);
    };
    stream.once('drain', onDrain);
    stream.once('error', onError);
  });
};

const withTimeout = async (promise, timeoutMs, label) => {
  if (!timeoutMs || timeoutMs <= 0) return promise;
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs); })
    ]);
  } finally { clearTimeout(timer); }
};

/**
 * CODY-facing facade. CODY supplies its existing session through the transport,
 * and its own response/TTS handlers through callbacks. This class does not own a
 * second WhatsApp session or assistant identity.
 */
export class PlogmeVoip extends EventEmitter {
  constructor({
    transport,
    asr,
    tts,
    respond,
    callerPolicy = () => true,
    autoAnswer = false,
    responseTimeoutMs = 12000,
    maxResponseChars = 2000,
    durationMs = 120000,
  } = {}) {
    super();
    if (!transport) throw new TypeError('plogme-voip requires a transport.');
    this.transport = transport;
    this.asr = asr;
    this.tts = tts;
    this.respond = respond;
    this.callerPolicy = callerPolicy;
    this.autoAnswer = autoAnswer;
    this.responseTimeoutMs = responseTimeoutMs;
    this.maxResponseChars = maxResponseChars;
    this.durationMs = durationMs;
    this.active = null;
    this.started = false;
    this._onIncoming = info => void this._handleIncoming(info);
  }

  async start({ connect = true } = {}) {
    if (this.started) return this;
    this.transport.on('incomingCall', this._onIncoming);
    this.started = true;
    if (connect) await this.transport.connect();
    this.emit('started');
    return this;
  }

  async stop() {
    if (!this.started) return;
    this.transport.off?.('incomingCall', this._onIncoming);
    await this.transport.disconnect?.();
    this.started = false;
    this.emit('stopped');
  }

  async answer(info, options = {}) {
    if (this.active) throw new Error('A VOIP call is already active.');
    const audio = new PassThrough({ highWaterMark: 64 * 1024 });
    const session = new CallSession({ id: info.callId, direction: 'incoming' }).ring();
    const activeCall = await this.transport.answerIncomingCall(info.callId, {
      ...options,
      audioSource: audio,
      durationMs: options.durationMs ?? this.durationMs,
    });
    session.connect();
    return this._attach({ info, activeCall, audio, session });
  }

  async call(phoneNumber, options = {}) {
    if (this.active) throw new Error('A VOIP call is already active.');
    const audio = new PassThrough({ highWaterMark: 64 * 1024 });
    const session = new CallSession({ id: `outgoing:${phoneNumber}`, direction: 'outgoing' }).connect();
    const activeCall = await this.transport.call(phoneNumber, {
      ...options,
      audioSource: audio,
      durationMs: options.durationMs ?? this.durationMs,
    });
    return this._attach({ info: { callId: activeCall.callId, peerJid: activeCall.peerJid, phoneNumber }, activeCall, audio, session });
  }

  async _handleIncoming(info) {
    this.emit('incomingCall', info);
    if (!this.autoAnswer) return;
    try {
      const allowed = await this.callerPolicy(info);
      if (!allowed) {
        this.transport.rejectIncomingCall(info.callId);
        this.emit('rejected', info);
        return;
      }
      await this.answer(info);
    } catch (error) {
      this.emit('error', error);
    }
  }

  _attach({ info, activeCall, audio, session }) {
    if (this.active) {
      activeCall.end?.();
      throw new Error('A VOIP call is already active.');
    }
    this.active = { info, activeCall, audio, session, asrSession: null, responseBusy: false };
    session.on('state', event => this.emit('state', event));
    activeCall.on('connected', () => session.connected());
    activeCall.on('ended', reason => void this._cleanup(reason));
    activeCall.on('audio', pcm => this._onAudio(pcm));
    this.emit('call', { info, activeCall, session });
    if (this.asr?.start) {
      this.active.asrSession = this.asr.start({ sampleRate: 16000, channels: 1 });
      this.active.asrSession.on('turnEnd', event => void this._onTurn(event));
    }
    return activeCall;
  }

  _onAudio(pcm) {
    if (!this.active?.asrSession) return;
    this.active.asrSession.push(pcm);
    this.emit('audio', pcm);
  }

  async _onTurn(event) {
    const call = this.active;
    if (!call || call.responseBusy || !event?.text || typeof this.respond !== 'function' || !this.tts) return;
    call.responseBusy = true;
    call.session.think();
    try {
      const result = await withTimeout(Promise.resolve(this.respond(event.text, {
        callId: call.info.callId,
        direction: call.session.direction,
        caller: call.info.peerJid ?? call.info.callerJid,
        transcript: event,
      })), this.responseTimeoutMs, 'CODY response');
      const text = String(result ?? '').trim().slice(0, this.maxResponseChars);
      if (!text) return;
      call.session.speak();
      for await (const chunk of this.tts.stream(text, { sampleRate: 16000, channels: 1 })) {
        await writeChunk(call.audio, chunk);
      }
      call.session.listen();
      this.emit('response', { callId: call.info.callId, text });
    } catch (error) {
      this.emit('responseError', { callId: call.info.callId, error });
    } finally {
      call.responseBusy = false;
    }
  }

  async _cleanup(reason) {
    const call = this.active;
    if (!call) return;
    this.active = null;
    call.asrSession?.stop?.();
    call.audio.destroy();
    if (call.session.state !== 'ended' && call.session.state !== 'failed') call.session.end(reason);
    this.emit('ended', { callId: call.info.callId, reason });
  }
}

export const createPlogmeVoip = options => new PlogmeVoip(options);
export { PlogmeTransport } from '@crysnova/voip-plogme';
export { TinyAsrAdapter } from '@crysnova/voip-tinyasr';
export { TtsAdapter } from '@crysnova/voip-tts';
export { CallSession, BoundedPcmQueue } from '@crysnova/voip-core';
