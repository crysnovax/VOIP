import { EventEmitter } from 'node:events';

const transitions = {
  idle: new Set(['ringing', 'connecting']),
  ringing: new Set(['connecting', 'ended', 'failed']),
  connecting: new Set(['listening', 'ended', 'failed']),
  listening: new Set(['thinking', 'speaking', 'ended', 'failed']),
  thinking: new Set(['speaking', 'listening', 'ended', 'failed']),
  speaking: new Set(['listening', 'thinking', 'ended', 'failed']),
  ended: new Set(),
  failed: new Set()
};

export class CallSession extends EventEmitter {
  constructor({ id, direction }) {
    super();
    if (!id) throw new TypeError('CallSession requires an id');
    if (!['incoming', 'outgoing'].includes(direction)) {
      throw new TypeError('direction must be incoming or outgoing');
    }
    this.id = id;
    this.direction = direction;
    this.state = 'idle';
    this.createdAt = Date.now();
  }

  transition(next, details = {}) {
    if (next === this.state) return this;
    if (!transitions[this.state]?.has(next)) {
      throw new Error(`Invalid call transition: ${this.state} -> ${next}`);
    }
    const previous = this.state;
    this.state = next;
    this.emit('state', { id: this.id, previous, state: next, ...details });
    return this;
  }

  ring() { return this.transition('ringing'); }
  connect() { return this.transition('connecting'); }
  connected() { return this.transition('listening'); }
  think() { return this.transition('thinking'); }
  speak() { return this.transition('speaking'); }
  listen() { return this.transition('listening'); }
  interrupt() { return this.transition('listening', { reason: 'barge-in' }); }
  end(reason = 'normal') { return this.transition('ended', { reason }); }
  fail(error) { return this.transition('failed', { error }); }
}

export class BoundedPcmQueue {
  constructor({ maxBytes = 2 * 1024 * 1024 } = {}) {
    if (!Number.isInteger(maxBytes) || maxBytes <= 0) {
      throw new TypeError('maxBytes must be a positive integer');
    }
    this.maxBytes = maxBytes;
    this.bytes = 0;
    this.items = [];
    this.closed = false;
  }

  push(chunk) {
    if (this.closed) throw new Error('PCM queue is closed');
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength);
    if (this.bytes + buffer.byteLength > this.maxBytes) {
      throw new Error('PCM queue limit exceeded');
    }
    this.items.push(buffer);
    this.bytes += buffer.byteLength;
  }

  shift() {
    const chunk = this.items.shift();
    if (!chunk) return undefined;
    this.bytes -= chunk.byteLength;
    return chunk;
  }

  close() {
    this.closed = true;
    this.items.length = 0;
    this.bytes = 0;
  }
}
