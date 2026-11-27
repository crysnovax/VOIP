import { gunzipSync } from 'node:zlib';
import { readFile } from 'node:fs/promises';
import { TinyAsrSession, normalizeEvents, normalizeEvent } from './index.mjs';

const asBytes = bytes => {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return data[0] === 0x1f && data[1] === 0x8b ? gunzipSync(data) : data;
};

const nowSeconds = () => performance.now() / 1000;

const readCString = (memory, pointer) => {
  if (!pointer) return '';
  const bytes = new Uint8Array(memory.buffer);
  let end = pointer;
  while (bytes[end] !== 0) end += 1;
  return new TextDecoder().decode(bytes.subarray(pointer, end));
};

class WasmMemory {
  constructor(exports) {
    this.exports = exports;
    this.memory = exports.memory;
  }

  putBytes(bytes) {
    const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    const pointer = this.exports.tinyasr_alloc(data.byteLength);
    new Uint8Array(this.memory.buffer, pointer, data.byteLength).set(data);
    return { pointer, length: data.byteLength };
  }

  putCString(value) {
    return this.putBytes(new TextEncoder().encode(`${value ?? ''}\0`));
  }

  putPcm(pcm) {
    if (!(pcm instanceof Float32Array)) pcm = Float32Array.from(pcm);
    const bytes = pcm.length * Float32Array.BYTES_PER_ELEMENT;
    const pointer = this.exports.tinyasr_alloc(bytes);
    new Float32Array(this.memory.buffer, pointer, pcm.length).set(pcm);
    return { pointer, samples: pcm.length, length: bytes };
  }

  free(block) {
    if (block?.pointer) this.exports.tinyasr_dealloc(block.pointer, block.length);
  }

  readString(pointer) {
    return readCString(this.memory, pointer);
  }
}

export class TinyAsrWasmModel {
  constructor({ instance, modelPointer, modelBytes, wasmPath, modelPath, vadPath }) {
    this.instance = instance;
    this.exports = instance.exports;
    this.mem = new WasmMemory(this.exports);
    this.modelPointer = modelPointer;
    this.modelBytes = modelBytes;
    this.wasmPath = wasmPath;
    this.modelPath = modelPath;
    this.vadPath = vadPath;
    this.closed = false;
  }

  static async load({ wasmPath, modelPath, vadPath }) {
    if (!wasmPath || !modelPath || !vadPath) {
      throw new TypeError('WASM tinyasr requires wasmPath, modelPath, and vadPath.');
    }
    const [wasmBytes, modelRaw, vadRaw] = await Promise.all([
      readFile(wasmPath), readFile(modelPath), readFile(vadPath)
    ]);
    const modelBytes = asBytes(modelRaw);
    const vadBytes = asBytes(vadRaw);
    const { instance } = await WebAssembly.instantiate(wasmBytes, { env: { now: nowSeconds } });
    const mem = new WasmMemory(instance.exports);
    const model = mem.putBytes(modelBytes);
    const vad = mem.putBytes(vadBytes);
    const error = instance.exports.tinyasr_alloc(256);
    const handle = instance.exports.tinyasr_load(model.pointer, model.length, vad.pointer, vad.length, error, 256);
    const message = mem.readString(error);
    mem.free(model);
    mem.free(vad);
    instance.exports.tinyasr_dealloc(error, 256);
    if (!handle) throw new Error(`tinyasr WASM model failed to load: ${message || 'unknown error'}`);
    return new TinyAsrWasmModel({ instance, modelPointer: handle, modelBytes, wasmPath, modelPath, vadPath });
  }

  get version() { return this.exports.tinyasr_version(); }
  get chunkMs() { return this.exports.tinyasr_chunk_ms(this.modelPointer); }

  languages() {
    const count = this.exports.tinyasr_lang_count(this.modelPointer);
    return Array.from({ length: count }, (_, index) => this.mem.readString(this.exports.tinyasr_lang(this.modelPointer, index)));
  }

  createSession({ languages = '', startLanguage = '', beam = 1 } = {}) {
    if (this.closed) throw new Error('tinyasr WASM model is closed.');
    const lang = this.mem.putCString(languages);
    const start = startLanguage ? this.mem.putCString(startLanguage) : null;
    const clock = this.exports.tinyasr_clock();
    const sessionPointer = this.exports.tinyasr_session_new(
      this.modelPointer,
      lang.pointer,
      start?.pointer ?? 0,
      clock,
      beam
    );
    this.mem.free(lang);
    if (start) this.mem.free(start);
    if (!sessionPointer) throw new Error('tinyasr WASM session could not be created.');
    return new TinyAsrWasmSession({ model: this, sessionPointer });
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.exports.tinyasr_free(this.modelPointer);
    this.modelPointer = 0;
  }
}

export class TinyAsrWasmSession {
  constructor({ model, sessionPointer }) {
    this.model = model;
    this.exports = model.exports;
    this.mem = model.mem;
    this.sessionPointer = sessionPointer;
    this.closed = false;
  }

  push(pcm) {
    if (this.closed) return [];
    const block = this.mem.putPcm(pcm);
    const result = this.exports.tinyasr_session_push(this.sessionPointer, block.pointer, block.samples);
    const json = this.mem.readString(result);
    this.mem.free(block);
    return normalizeEvents(json).map(normalizeEvent).filter(Boolean);
  }

  finish() {
    if (this.closed) return [];
    const result = this.exports.tinyasr_session_finish(this.sessionPointer);
    return normalizeEvents(this.mem.readString(result)).map(normalizeEvent).filter(Boolean);
  }

  free() {
    if (this.closed) return;
    this.closed = true;
    this.exports.tinyasr_session_free(this.sessionPointer);
    this.sessionPointer = 0;
  }

  stop() { this.free(); }
}

export class TinyAsrWasmAdapter {
  constructor({ model, languages = '', startLanguage = '', beam = 1, sampleRate = 16000, channels = 1 }) {
    if (!(model instanceof TinyAsrWasmModel)) throw new TypeError('TinyAsrWasmAdapter requires a TinyAsrWasmModel.');
    this.model = model;
    this.defaults = { languages, startLanguage, beam, sampleRate, channels };
  }

  start(format = {}) {
    const config = { ...this.defaults, ...format };
    const session = this.model.createSession(config);
    return new TinyAsrSession({ session, format: config });
  }

  close() { this.model.close(); }
}

export const createTinyAsrWasmAdapter = async options => {
  const model = await TinyAsrWasmModel.load(options);
  return new TinyAsrWasmAdapter({ ...options, model });
};
