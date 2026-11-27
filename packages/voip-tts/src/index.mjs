const isAsyncIterable = value => value && typeof value[Symbol.asyncIterator] === 'function';
const isIterable = value => value && typeof value[Symbol.iterator] === 'function' && typeof value !== 'string';

const asPcmChunk = chunk => {
  if (Buffer.isBuffer(chunk)) return chunk;
  if (chunk instanceof Uint8Array) return Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength);
  if (chunk instanceof Float32Array) return Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength);
  throw new TypeError('TTS chunks must be Buffer, Uint8Array, or Float32Array PCM data.');
};

export class TtsAdapter {
  constructor({ speak } = {}) {
    if (typeof speak !== 'function') throw new TypeError('TtsAdapter requires speak(text, options).');
    this.speak = speak;
  }

  async *stream(text, options = {}) {
    const result = await this.speak(text, options);
    if (isAsyncIterable(result)) {
      for await (const chunk of result) yield asPcmChunk(chunk);
      return;
    }
    if (isIterable(result)) {
      for (const chunk of result) yield asPcmChunk(chunk);
      return;
    }
    yield asPcmChunk(result);
  }
}

export const createTtsAdapter = options => new TtsAdapter(options);
export { asPcmChunk };
