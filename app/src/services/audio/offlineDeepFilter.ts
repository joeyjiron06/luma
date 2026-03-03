import * as ort from "onnxruntime-web";

const MODEL_ROOT = "/models/deepFilterNet3";
const TARGET_SAMPLE_RATE = 48000;
const FFT_SIZE = 960;
const HOP_SIZE = 480;
const NB_ERB = 32;
const NB_DF = 96;
const DF_ORDER = 5;
const DF_LOOKAHEAD = 2;
const EPSILON = 1e-8;

type ComplexFrame = {
  re: Float32Array;
  im: Float32Array;
};

type DeepFilterSessions = {
  enc: ort.InferenceSession;
  erbDec: ort.InferenceSession;
  dfDec: ort.InferenceSession;
};

type FeatureSet = {
  frames: ComplexFrame[];
  erbLog: Float32Array;
  frameCount: number;
  bins: number;
};

type EnhancementOutputs = {
  erbGains?: Float32Array;
  dfCoefs?: Float32Array;
};

type ModelTensorMetadata = {
  type: string;
  dimensions: Array<number | string | null | undefined>;
};

type CachedState = {
  sessions: Promise<DeepFilterSessions> | null;
};

const state: CachedState = {
  sessions: null,
};

const hannWindow = buildHannWindow(FFT_SIZE);
const erbWeights = buildErbProjectionMatrix(
  FFT_SIZE / 2 + 1,
  NB_ERB,
  TARGET_SAMPLE_RATE
);

export type OfflineDeepFilterResult = {
  wavBlob: Blob;
  durationSec: number;
};

export async function processFile(
  file: File
): Promise<OfflineDeepFilterResult> {
  const mono48k = await decodeToMono48k(file);
  const features = computeFeatures(mono48k);
  const sessions = await getSessions();
  const outputs = await runModelInference(features, sessions);
  const enhanced = reconstructWaveform(features, outputs);
  const wavBlob = encodeWavFloat32(mono48k, TARGET_SAMPLE_RATE);
  return {
    wavBlob,
    durationSec: enhanced.length / TARGET_SAMPLE_RATE,
  };
}

async function decodeToMono48k(file: File): Promise<Float32Array> {
  const bytes = await file.arrayBuffer();
  const decodeContext = new AudioContext();
  const decoded = await decodeContext.decodeAudioData(bytes.slice(0));
  await decodeContext.close();

  const targetLength = Math.max(
    1,
    Math.round((decoded.length * TARGET_SAMPLE_RATE) / decoded.sampleRate)
  );
  const renderContext = new OfflineAudioContext(
    1,
    targetLength,
    TARGET_SAMPLE_RATE
  );
  const monoBuffer = renderContext.createBuffer(
    1,
    decoded.length,
    decoded.sampleRate
  );
  const output = monoBuffer.getChannelData(0);

  for (let i = 0; i < decoded.length; i += 1) {
    let sum = 0;
    for (let ch = 0; ch < decoded.numberOfChannels; ch += 1) {
      sum += decoded.getChannelData(ch)[i] ?? 0;
    }
    output[i] = sum / decoded.numberOfChannels;
  }

  const source = renderContext.createBufferSource();
  source.buffer = monoBuffer;
  source.connect(renderContext.destination);
  source.start();
  const rendered = await renderContext.startRendering();
  return rendered.getChannelData(0).slice();
}

function computeFeatures(samples: Float32Array): FeatureSet {
  const bins = FFT_SIZE / 2 + 1;
  const padded = padForStft(samples, FFT_SIZE, HOP_SIZE);
  const frameCount = Math.max(
    1,
    Math.floor((padded.length - FFT_SIZE) / HOP_SIZE) + 1
  );
  const frames: ComplexFrame[] = new Array(frameCount);
  const erbLog = new Float32Array(frameCount * NB_ERB);

  for (let t = 0; t < frameCount; t += 1) {
    const offset = t * HOP_SIZE;
    const frame = padded.subarray(offset, offset + FFT_SIZE);
    const windowed = new Float32Array(FFT_SIZE);
    for (let i = 0; i < FFT_SIZE; i += 1) {
      windowed[i] = frame[i] * hannWindow[i];
    }
    const complex = realDft(windowed);
    const re = complex.re.subarray(0, bins);
    const im = complex.im.subarray(0, bins);
    frames[t] = { re: new Float32Array(re), im: new Float32Array(im) };

    const magnitudes = new Float32Array(bins);
    for (let f = 0; f < bins; f += 1) {
      magnitudes[f] = Math.hypot(frames[t].re[f], frames[t].im[f]);
    }
    for (let b = 0; b < NB_ERB; b += 1) {
      let sum = 0;
      for (let f = 0; f < bins; f += 1) {
        sum += magnitudes[f] * erbWeights[f * NB_ERB + b];
      }
      erbLog[t * NB_ERB + b] = Math.log(sum + EPSILON);
    }
  }

  return { frames, erbLog, frameCount, bins };
}

async function getSessions(): Promise<DeepFilterSessions> {
  if (!state.sessions) {
    state.sessions = loadSessions();
  }
  return state.sessions;
}

async function loadSessions(): Promise<DeepFilterSessions> {
  ort.env.debug = false;
  ort.env.wasm.simd = true;
  ort.env.wasm.numThreads = 1;
  ort.env.logLevel = "warning";
  const ortVersion = "1.24.2";
  const ortDist = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ortVersion}/dist`;
  (ort.env.wasm as { wasmPaths: { mjs: string; wasm: string } }).wasmPaths = {
    mjs: `${ortDist}/ort-wasm-simd-threaded.jsep.mjs`,
    wasm: `${ortDist}/ort-wasm-simd-threaded.jsep.wasm`,
  };

  const [enc, erbDec, dfDec] = await Promise.all([
    ort.InferenceSession.create(`${MODEL_ROOT}/enc.onnx`, {
      executionProviders: ["wasm"],
      graphOptimizationLevel: "all",
    }),
    ort.InferenceSession.create(`${MODEL_ROOT}/erb_dec.onnx`, {
      executionProviders: ["wasm"],
      graphOptimizationLevel: "all",
    }),
    ort.InferenceSession.create(`${MODEL_ROOT}/df_dec.onnx`, {
      executionProviders: ["wasm"],
      graphOptimizationLevel: "all",
    }),
  ]);

  assertSessionHasInputs(enc, ["feat_erb", "feat_spec"]);
  return { enc, erbDec, dfDec };
}

function assertSessionHasInputs(
  session: ort.InferenceSession,
  required: string[]
): void {
  for (const input of required) {
    if (!session.inputNames.includes(input)) {
      throw new Error(
        `Missing required model input "${input}" in ${session.inputNames.join(
          ", "
        )}.`
      );
    }
  }
}

async function runModelInference(
  features: FeatureSet,
  sessions: DeepFilterSessions
): Promise<EnhancementOutputs> {
  const featErb = toErbTensor(
    features.erbLog,
    features.frameCount,
    getInputMetadata(sessions.enc, "feat_erb", [1, 1, 1, NB_ERB])
  );
  const featSpec = toSpecTensor(
    features.frames,
    features.frameCount,
    getInputMetadata(sessions.enc, "feat_spec", [1, 2, 1, NB_DF])
  );

  const encFeeds = buildFeedsForSession(sessions.enc, {
    feat_erb: featErb,
    feat_spec: featSpec,
  });
  const encOut = await sessions.enc.run(encFeeds);

  const erbFeeds = buildFeedsForSession(sessions.erbDec, {
    feat_erb: featErb,
    feat_spec: featSpec,
    ...encOut,
  });
  const dfFeeds = buildFeedsForSession(sessions.dfDec, {
    feat_erb: featErb,
    feat_spec: featSpec,
    ...encOut,
  });

  const [erbOut, dfOut] = await Promise.all([
    sessions.erbDec.run(erbFeeds),
    sessions.dfDec.run(dfFeeds),
  ]);

  const erbGains = pickErbGains(erbOut, features.frameCount);
  const dfCoefs = pickDfCoefs(dfOut, features.frameCount);
  return { erbGains, dfCoefs };
}

function getInputMetadata(
  session: ort.InferenceSession,
  name: string,
  fallbackDims: [number, number, number, number]
): ModelTensorMetadata {
  const inputMetadata = session.inputMetadata as unknown as Record<
    string,
    ModelTensorMetadata
  >;
  const direct = inputMetadata[name];
  if (direct) {
    return direct;
  }

  // Some ORT builds/models do not expose full metadata in browser.
  // If input exists by name, use a stable fallback shape for DFN feature tensors.
  if (session.inputNames.includes(name)) {
    return {
      type: "float32",
      dimensions: fallbackDims,
    };
  }

  const bySuffix = Object.entries(inputMetadata).find(([key]) =>
    key.endsWith(name)
  );
  if (bySuffix) {
    return bySuffix[1];
  }

  throw new Error(`Missing metadata for input "${name}".`);
}

function buildFeedsForSession(
  session: ort.InferenceSession,
  known: Record<string, ort.Tensor>
): Record<string, ort.Tensor> {
  const feeds: Record<string, ort.Tensor> = {};
  const inputMetadata = session.inputMetadata as unknown as Record<
    string,
    ModelTensorMetadata
  >;
  for (const name of session.inputNames) {
    const existing = known[name];
    if (existing) {
      feeds[name] = existing;
      continue;
    }
    const metadata = inputMetadata[name];
    if (!metadata) {
      throw new Error(`Missing metadata for input "${name}".`);
    }
    feeds[name] = zeroTensorForMetadata(metadata);
  }
  return feeds;
}

function zeroTensorForMetadata(metadata: ModelTensorMetadata): ort.Tensor {
  if (metadata.type !== "float32") {
    throw new Error(`Unsupported input type "${metadata.type}".`);
  }
  const dims = metadata.dimensions.map(
    (d: number | string | null | undefined) => {
      if (typeof d === "number" && d > 0) return d;
      return 1;
    }
  );
  const size = dims.reduce((acc: number, value: number) => acc * value, 1);
  return new ort.Tensor("float32", new Float32Array(size), dims);
}

function toErbTensor(
  erbLog: Float32Array,
  frameCount: number,
  metadata: ModelTensorMetadata
): ort.Tensor {
  const dims = resolveDimsForFeatureTensor(metadata, frameCount, NB_ERB);
  const erbAxis = findFeatureAxis(dims, NB_ERB, [2, 3]);
  const timeAxis = findTimeAxis(dims, erbAxis);
  const data = new Float32Array(sizeFromDims(dims));

  for (let t = 0; t < frameCount; t += 1) {
    for (let b = 0; b < NB_ERB; b += 1) {
      const idx = [0, 0, 0, 0];
      idx[erbAxis] = b;
      idx[timeAxis] = t;
      data[flatIndex4d(dims, idx)] = erbLog[t * NB_ERB + b];
    }
  }
  return new ort.Tensor("float32", data, dims);
}

function toSpecTensor(
  frames: ComplexFrame[],
  frameCount: number,
  metadata: ModelTensorMetadata
): ort.Tensor {
  const dims = resolveDimsForSpecTensor(metadata, frameCount);
  const complexAxis = findFeatureAxis(dims, 2, [1, 0]);
  const freqAxis = findFeatureAxis(dims, NB_DF, [2, 3]);
  const timeAxis = findTimeAxis(dims, complexAxis, freqAxis);
  const freqSize = dims[freqAxis];
  const maxFreq = Math.min(freqSize, NB_DF);
  const data = new Float32Array(sizeFromDims(dims));

  for (let t = 0; t < frameCount; t += 1) {
    for (let f = 0; f < maxFreq; f += 1) {
      const idxRe = [0, 0, 0, 0];
      idxRe[timeAxis] = t;
      idxRe[freqAxis] = f;
      idxRe[complexAxis] = 0;
      data[flatIndex4d(dims, idxRe)] = frames[t].re[f];

      const idxIm = [0, 0, 0, 0];
      idxIm[timeAxis] = t;
      idxIm[freqAxis] = f;
      idxIm[complexAxis] = 1;
      data[flatIndex4d(dims, idxIm)] = frames[t].im[f];
    }
  }
  return new ort.Tensor("float32", data, dims);
}

function resolveDimsForFeatureTensor(
  metadata: ModelTensorMetadata,
  frameCount: number,
  featureSize: number
): [number, number, number, number] {
  const raw = metadata.dimensions;
  if (raw.length !== 4) {
    throw new Error(`Expected 4D tensor input, got ${raw.length}D.`);
  }

  const featureAxis = findFeatureAxisFromMetadata(raw, featureSize, [2, 3]);
  const timeAxis = featureAxis === 2 ? 3 : 2;

  const dims = raw.map((d, axis) => {
    if (axis === featureAxis) return featureSize;
    if (axis === timeAxis) return frameCount;
    if (typeof d === "number" && d > 0) return d;
    return 1;
  });

  return as4d(dims);
}

function resolveDimsForSpecTensor(
  metadata: ModelTensorMetadata,
  frameCount: number
): [number, number, number, number] {
  const raw = metadata.dimensions;
  if (raw.length !== 4) {
    throw new Error(`Expected 4D tensor input, got ${raw.length}D.`);
  }

  const complexAxis = findFeatureAxisFromMetadata(raw, 2, [1, 0]);
  const freqAxis = findFeatureAxisFromMetadata(raw, NB_DF, [2, 3]);
  const timeAxis =
    [0, 1, 2, 3].find(
      (axis) => axis !== complexAxis && axis !== freqAxis && axis >= 2
    ) ?? 3;

  const dims = raw.map((d, axis) => {
    if (axis === complexAxis) return 2;
    if (axis === freqAxis) return typeof d === "number" && d > 0 ? d : NB_DF;
    if (axis === timeAxis) return frameCount;
    if (typeof d === "number" && d > 0) return d;
    return 1;
  });

  return as4d(dims);
}

function as4d(values: number[]): [number, number, number, number] {
  return [values[0], values[1], values[2], values[3]];
}

function findFeatureAxisFromMetadata(
  dims: Array<number | string | null | undefined>,
  expected: number,
  fallbackOrder: number[]
): number {
  const exact = dims.findIndex((d) => d === expected);
  if (exact >= 0) {
    return exact;
  }
  for (const axis of fallbackOrder) {
    if (axis < dims.length) {
      return axis;
    }
  }
  return dims.length - 1;
}

function findFeatureAxis(
  dims: [number, number, number, number],
  expected: number,
  fallbackOrder: number[]
): number {
  const exact = dims.findIndex((d) => d === expected);
  if (exact >= 0) {
    return exact;
  }
  return fallbackOrder.find((axis) => axis >= 0 && axis < 4) ?? 3;
}

function findTimeAxis(
  dims: [number, number, number, number],
  ...exclude: number[]
): number {
  const candidates = [2, 3].filter((axis) => !exclude.includes(axis));
  if (candidates.length > 0) {
    return candidates[0];
  }
  const fallback = [0, 1, 2, 3].find((axis) => !exclude.includes(axis));
  if (fallback == null) {
    throw new Error(`Unable to infer time axis from dims ${dims.join("x")}.`);
  }
  return fallback;
}

function sizeFromDims(dims: [number, number, number, number]): number {
  return dims[0] * dims[1] * dims[2] * dims[3];
}

function flatIndex4d(
  dims: [number, number, number, number],
  idx: [number, number, number, number] | number[]
): number {
  return ((idx[0] * dims[1] + idx[1]) * dims[2] + idx[2]) * dims[3] + idx[3];
}

function pickErbGains(
  outputs: Record<string, ort.Tensor>,
  frameCount: number
): Float32Array | undefined {
  const candidates = Object.values(outputs);
  for (const tensor of candidates) {
    if (tensor.type !== "float32") continue;
    if (!(tensor.data instanceof Float32Array)) continue;
    const dims = tensor.dims;
    const hasErbAxis = dims.some((d) => d === NB_ERB);
    if (!hasErbAxis) continue;
    if (tensor.data.length < frameCount * NB_ERB) continue;
    return tensor.data;
  }
  return undefined;
}

function pickDfCoefs(
  outputs: Record<string, ort.Tensor>,
  frameCount: number
): Float32Array | undefined {
  const candidates = Object.values(outputs);
  for (const tensor of candidates) {
    if (tensor.type !== "float32") continue;
    if (!(tensor.data instanceof Float32Array)) continue;
    const dims = tensor.dims;
    const hasDfAxis = dims.some((d) => d === NB_DF);
    const hasOrderAxis = dims.some((d) => d === DF_ORDER);
    if (!hasDfAxis || !hasOrderAxis) continue;
    if (tensor.data.length < frameCount * NB_DF * DF_ORDER) continue;
    return tensor.data;
  }
  return undefined;
}

function reconstructWaveform(
  features: FeatureSet,
  outputs: EnhancementOutputs
): Float32Array {
  const enhancedFrames: ComplexFrame[] = new Array(features.frameCount);
  const erbGains = outputs.erbGains;

  for (let t = 0; t < features.frameCount; t += 1) {
    const re = new Float32Array(features.bins);
    const im = new Float32Array(features.bins);

    for (let f = 0; f < features.bins; f += 1) {
      let gain = 1;
      if (erbGains) {
        const band = Math.min(
          NB_ERB - 1,
          Math.floor((f / features.bins) * NB_ERB)
        );
        const candidate = erbGains[band * features.frameCount + t];
        if (Number.isFinite(candidate)) {
          gain = Math.exp(candidate);
        }
      }
      re[f] = features.frames[t].re[f] * gain;
      im[f] = features.frames[t].im[f] * gain;
    }

    enhancedFrames[t] = applyDfTapFilter(
      features.frames,
      t,
      re,
      im,
      outputs.dfCoefs
    );
  }

  return overlapAddIstft(enhancedFrames);
}

function applyDfTapFilter(
  frames: ComplexFrame[],
  t: number,
  inRe: Float32Array,
  inIm: Float32Array,
  dfCoefs?: Float32Array
): ComplexFrame {
  if (!dfCoefs) {
    return { re: inRe, im: inIm };
  }

  const outRe = inRe.slice();
  const outIm = inIm.slice();
  for (let f = 0; f < Math.min(NB_DF, inRe.length); f += 1) {
    let accRe = 0;
    let accIm = 0;
    for (let tap = 0; tap < DF_ORDER; tap += 1) {
      const frameIndex = clamp(t + (DF_LOOKAHEAD - tap), 0, frames.length - 1);
      const coefIndex =
        ((tap * NB_DF + f) * frames.length + t) % dfCoefs.length;
      const coef = dfCoefs[coefIndex];
      const srcRe = frames[frameIndex].re[f];
      const srcIm = frames[frameIndex].im[f];
      accRe += coef * srcRe;
      accIm += coef * srcIm;
    }
    outRe[f] = accRe;
    outIm[f] = accIm;
  }
  return { re: outRe, im: outIm };
}

function overlapAddIstft(frames: ComplexFrame[]): Float32Array {
  const totalLength = (frames.length - 1) * HOP_SIZE + FFT_SIZE;
  const output = new Float32Array(totalLength);
  const windowSums = new Float32Array(totalLength);

  for (let t = 0; t < frames.length; t += 1) {
    const fullRe = new Float32Array(FFT_SIZE);
    const fullIm = new Float32Array(FFT_SIZE);
    const bins = FFT_SIZE / 2 + 1;

    for (let f = 0; f < bins; f += 1) {
      fullRe[f] = frames[t].re[f];
      fullIm[f] = frames[t].im[f];
    }
    for (let f = 1; f < bins - 1; f += 1) {
      const mirror = FFT_SIZE - f;
      fullRe[mirror] = fullRe[f];
      fullIm[mirror] = -fullIm[f];
    }

    const time = inverseDft(fullRe, fullIm);
    const offset = t * HOP_SIZE;
    for (let i = 0; i < FFT_SIZE; i += 1) {
      const sample = time[i] * hannWindow[i];
      output[offset + i] += sample;
      windowSums[offset + i] += hannWindow[i] * hannWindow[i];
    }
  }

  for (let i = 0; i < output.length; i += 1) {
    if (windowSums[i] > EPSILON) {
      output[i] /= windowSums[i];
    }
  }
  return output;
}

function encodeWavFloat32(samples: Float32Array, sampleRate: number): Blob {
  const dataLength = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataLength, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i += 1) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, value: string): void {
  for (let i = 0; i < value.length; i += 1) {
    view.setUint8(offset + i, value.charCodeAt(i));
  }
}

function padForStft(
  samples: Float32Array,
  fftSize: number,
  hop: number
): Float32Array {
  const paddedLength =
    Math.ceil((samples.length + fftSize) / hop) * hop + fftSize;
  const padded = new Float32Array(paddedLength);
  padded.set(samples, 0);
  return padded;
}

function buildHannWindow(size: number): Float32Array {
  const out = new Float32Array(size);
  for (let i = 0; i < size; i += 1) {
    out[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
  }
  return out;
}

function realDft(input: Float32Array): { re: Float32Array; im: Float32Array } {
  const n = input.length;
  const re = new Float32Array(n);
  const im = new Float32Array(n);
  for (let k = 0; k < n; k += 1) {
    let sumRe = 0;
    let sumIm = 0;
    for (let t = 0; t < n; t += 1) {
      const phase = (-2 * Math.PI * k * t) / n;
      sumRe += input[t] * Math.cos(phase);
      sumIm += input[t] * Math.sin(phase);
    }
    re[k] = sumRe;
    im[k] = sumIm;
  }
  return { re, im };
}

function inverseDft(re: Float32Array, im: Float32Array): Float32Array {
  const n = re.length;
  const out = new Float32Array(n);
  for (let t = 0; t < n; t += 1) {
    let sum = 0;
    for (let k = 0; k < n; k += 1) {
      const phase = (2 * Math.PI * k * t) / n;
      sum += re[k] * Math.cos(phase) - im[k] * Math.sin(phase);
    }
    out[t] = sum / n;
  }
  return out;
}

function buildErbProjectionMatrix(
  bins: number,
  bands: number,
  sampleRate: number
): Float32Array {
  const out = new Float32Array(bins * bands);
  const nyquist = sampleRate / 2;
  const minHz = 0;
  const maxHz = nyquist;
  const erbMin = hzToErb(minHz);
  const erbMax = hzToErb(maxHz);
  const erbPoints = new Float32Array(bands + 2);
  for (let i = 0; i < bands + 2; i += 1) {
    erbPoints[i] = erbMin + ((erbMax - erbMin) * i) / (bands + 1);
  }
  const hzPoints = new Float32Array(bands + 2);
  for (let i = 0; i < bands + 2; i += 1) {
    hzPoints[i] = erbToHz(erbPoints[i]);
  }

  for (let b = 0; b < bands; b += 1) {
    const left = hzPoints[b];
    const center = hzPoints[b + 1];
    const right = hzPoints[b + 2];
    for (let f = 0; f < bins; f += 1) {
      const hz = (f / (bins - 1)) * nyquist;
      let weight = 0;
      if (hz >= left && hz <= center) {
        weight = (hz - left) / Math.max(EPSILON, center - left);
      } else if (hz > center && hz <= right) {
        weight = (right - hz) / Math.max(EPSILON, right - center);
      }
      out[f * bands + b] = Math.max(0, weight);
    }
  }
  return out;
}

function hzToErb(hz: number): number {
  return 21.4 * Math.log10(4.37e-3 * hz + 1);
}

function erbToHz(erb: number): number {
  return (10 ** (erb / 21.4) - 1) / 4.37e-3;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
