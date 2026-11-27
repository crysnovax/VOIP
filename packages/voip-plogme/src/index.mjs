import { EventEmitter } from 'node:events';

const loadDefaultClient = async (options) => {
  const mod = await import('plogme');
  const VoipClient = mod.VoipClient ?? mod.default?.VoipClient;
  if (typeof VoipClient !== 'function') {
    throw new Error('The installed plogme package does not expose VoipClient.');
  }
  return new VoipClient(options);
};

/**
 * Thin adapter over Plogme's VoipClient. It deliberately accepts an injected
 * client or factory so tests and CODY can supply an existing session.
 */
export class PlogmeTransport extends EventEmitter {
  constructor({ client, clientFactory = loadDefaultClient, clientOptions = {} } = {}) {
    super();
    this.client = client ?? null;
    this.clientFactory = clientFactory;
    this.clientOptions = clientOptions;
    this.started = false;
    this._listeners = [];
  }

  async connect() {
    if (!this.client) this.client = await this.clientFactory(this.clientOptions);
    if (this.started) return this;
    this._bind('incomingCall', info => this.emit('incomingCall', info));
    this._bind('incomingCallEnded', info => this.emit('incomingCallEnded', info));
    this._bind('videoError', info => this.emit('videoError', info));
    this._bind('recordingError', info => this.emit('recordingError', info));
    await this.client.connect();
    this.started = true;
    this.emit('connected');
    return this;
  }

  async call(phoneNumber, options = {}) {
    this._assertClient();
    return this.client.call(phoneNumber, options);
  }

  async answerIncomingCall(callId, options = {}) {
    this._assertClient();
    return this.client.answerIncomingCall(callId, options);
  }

  rejectIncomingCall(callId) {
    this._assertClient();
    return this.client.rejectIncomingCall(callId);
  }

  async disconnect() {
    if (!this.client) return;
    await this.client.disconnect();
    for (const [event, listener] of this._listeners) this.client.off?.(event, listener);
    this._listeners = [];
    this.started = false;
    this.emit('disconnected');
  }

  _bind(event, listener) {
    this.client.on(event, listener);
    this._listeners.push([event, listener]);
  }

  _assertClient() {
    if (!this.client) throw new Error('PlogmeTransport is not connected.');
  }
}

export const createPlogmeTransport = options => new PlogmeTransport(options);
