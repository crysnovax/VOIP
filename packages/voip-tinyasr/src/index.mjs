import { EventEmitter } from 'node:events';

const wordsToText = words => {
  if (!Array.isArray(words)) return '';
  return words.map(word => {
    if (typeof word === 'string') return word;
    return word?.text ?? word?.word ?? word?.token ?? '';
  }).filter(Boolean).join(' ').replace(/\s+([,.!?;:])/g, '$1').trim();
};

const normalizeEvents = value => {
  if (value == null) return [];
  if (typeof value === 'string') {
    try { return normalizeEvents(JSON.parse(value)); } catch { return []; }
  }
  if (Array.isArray(value)) return value.flatMap(normalizeEvents);
  if (Array.isArray(value.ev)) return value.ev.flatMap(normalizeEvents);
  if (value.type === 'events') return normalizeEvents(value.ev);
  if (value.type || value.event) return [value];
  return [];
};

const normalizeEvent = event => {
  const type = event.type ?? event.event;
  const text = event.text ?? event.transcript ?? wordsToText(event.words);
  if (type === 'partial' || type === 'commit' || type === 'turnEnd' || type === 'language') {
    return { ...event, type, ...(text ? { text } : {}) };
  }
  if (type === 'end_of_turn' || type === 'turn_end' || type === 'eot') {
    return { ...event, type: 'turnEnd', ...(text ? { text } : {}) };
  }
  return null;
};

/**
 * Adapter for a tinyasr session bridge. The bridge may be native C, WASM, or a
 * test double, but must expose push(Float32Array) and finish(). Results may be
 * event objects, arrays, or JSON returned by tinyasr.
 */
export class TinyAsrSession extends EventEmitter {
  constructor({ session, format }) {
    super();
    if (!session || typeof session.push !== 'function') {
      throw new TypeError('TinyAsrSession requires a session with push(pcm).');
    }
    this.session = session;
    this.format = format;
    this.stopped = false;
  }

  push(pcm) {
    if (this.stopped) return [];
    const events = this._emitResults(this.session.push(pcm));
    return events;
  }

  finish() {
    if (this.stopped) return [];
    const events = this._emitResults(this.session.finish?.());
    this.stop();
    return events;
  }

  stop() {
    if (this.stopped) return;
    this.stopped = true;
    this.session.stop?.();
    this.session.free?.();
    this.emit('stopped');
  }

  _emitResults(result) {
    const events = normalizeEvents(result).map(normalizeEvent).filter(Boolean);
    for (const event of events) this.emit(event.type, event);
    return events;
  }
}

export class TinyAsrAdapter {
  constructor({ sessionFactory, sampleRate = 16000, channels = 1, language = 'en' } = {}) {
    if (typeof sessionFactory !== 'function') {
      throw new TypeError('TinyAsrAdapter requires sessionFactory({ sampleRate, channels, language }).');
    }
    this.sessionFactory = sessionFactory;
    this.defaults = { sampleRate, channels, language };
  }

  start(format = {}) {
    const config = { ...this.defaults, ...format };
    const session = this.sessionFactory(config);
    return new TinyAsrSession({ session, format: config });
  }
}

export { normalizeEvents, normalizeEvent, wordsToText };
export const createTinyAsrAdapter = options => new TinyAsrAdapter(options);
