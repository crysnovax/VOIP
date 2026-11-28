const assertPositiveInteger = (value, name) => {
  if (!Number.isInteger(value) || value <= 0) throw new TypeError(`${name} must be a positive integer`);
};

/**
 * Converts interleaved Float32 PCM to the format required by tinyasr.
 * The resampler is linear interpolation and keeps phase/sample history between
 * chunks, so a call can feed it one WebRTC frame at a time.
 */
export class PcmNormalizer {
  constructor({ inputSampleRate, inputChannels, outputSampleRate = 16000, outputChannels = 1 } = {}) {
    assertPositiveInteger(inputSampleRate, 'inputSampleRate');
    assertPositiveInteger(inputChannels, 'inputChannels');
    assertPositiveInteger(outputSampleRate, 'outputSampleRate');
    assertPositiveInteger(outputChannels, 'outputChannels');
    if (outputChannels !== 1) throw new Error('PcmNormalizer currently supports mono output only.');
    this.inputSampleRate = inputSampleRate;
    this.inputChannels = inputChannels;
    this.outputSampleRate = outputSampleRate;
    this.outputChannels = outputChannels;
    this.step = inputSampleRate / outputSampleRate;
    this.position = 0;
    this.mono = new Float32Array(0);
  }

  push(pcm) {
    const input = pcm instanceof Float32Array ? pcm : Float32Array.from(pcm);
    if (input.length % this.inputChannels !== 0) {
      throw new Error(`PCM frame has ${input.length} samples, not divisible by ${this.inputChannels} channels.`);
    }
    const frames = input.length / this.inputChannels;
    const downmixed = new Float32Array(frames);
    for (let frame = 0; frame < frames; frame += 1) {
      let sum = 0;
      for (let channel = 0; channel < this.inputChannels; channel += 1) sum += input[frame * this.inputChannels + channel];
      downmixed[frame] = sum / this.inputChannels;
    }
    this.mono = concatFloat32(this.mono, downmixed);
    return this._produce(false);
  }

  flush() {
    return this._produce(true);
  }

  reset() {
    this.position = 0;
    this.mono = new Float32Array(0);
  }

  _produce(final) {
    if (this.mono.length === 0) return new Float32Array(0);
    const output = [];
    const last = this.mono.length - 1;
    while (this.position < last || (final && this.position <= last)) {
      const left = Math.floor(this.position);
      const fraction = this.position - left;
      const right = Math.min(left + 1, last);
      output.push(this.mono[left] + (this.mono[right] - this.mono[left]) * fraction);
      this.position += this.step;
    }
    const consumed = Math.max(0, Math.floor(this.position));
    if (consumed > 0) {
      this.mono = this.mono.slice(Math.min(consumed, this.mono.length));
      this.position -= consumed;
    }
    if (final) this.reset();
    return Float32Array.from(output);
  }
}

const concatFloat32 = (a, b) => {
  if (a.length === 0) return b;
  const result = new Float32Array(a.length + b.length);
  result.set(a);
  result.set(b, a.length);
  return result;
};

export const pcmFormat = ({ sampleRate, channels }) => ({ sampleRate, channels, encoding: 'f32le' });
