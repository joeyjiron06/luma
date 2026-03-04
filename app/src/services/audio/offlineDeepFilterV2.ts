import {
  StandaloneDeepFilter,
  type DeepFilterConfig,
  type ProcessingStats,
} from "deepfilter-standalone";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import ffmpegCoreURL from "@ffmpeg/core?url";
import ffmpegWasmURL from "@ffmpeg/core/wasm?url";
import ffmpegWorkerURL from "@ffmpeg/ffmpeg/worker?url";

const TARGET_SAMPLE_RATE = 48000;
const LOCAL_DEEPFILTER_CDN = "/models/deepfilter-standalone";
const DEV_DEEPFILTER_PROXY_CDN = "/deepfilter-local";

type DenoiserState = {
  instance: StandaloneDeepFilter | null;
  initPromise: Promise<StandaloneDeepFilter> | null;
};

const denoiserState: DenoiserState = {
  instance: null,
  initPromise: null,
};

export type OfflineDeepFilterV2Result = {
  outputBlob: Blob;
  outputFormat: string;
  wavBlob: Blob;
  durationSec: number;
  inputSampleRate: number;
  outputSampleRate: number;
  stats: ProcessingStats;
};

export type ProcessFileConfig = {
  outputFormat?: string;
  deepFilterConfig?: DeepFilterConfig;
};

type FfmpegState = {
  instance: FFmpeg | null;
  loadPromise: Promise<FFmpeg> | null;
};

const ffmpegState: FfmpegState = {
  instance: null,
  loadPromise: null,
};

export async function processFile(
  file: File,
  config: ProcessFileConfig = {}
): Promise<OfflineDeepFilterV2Result> {
  const outputFormat = normalizeOutputFormat(config.outputFormat);
  const { mono48k, inputSampleRate } = await decodeToMono48k(file);
  return processMono48kBuffer(
    mono48k,
    inputSampleRate,
    config.deepFilterConfig,
    outputFormat
  );
}

export async function processRawAudio(
  samples: Float32Array,
  sampleRate: number,
  config: ProcessFileConfig = {}
): Promise<OfflineDeepFilterV2Result> {
  const outputFormat = normalizeOutputFormat(config.outputFormat);
  const mono48k = await ensure48k(samples, sampleRate);
  return processMono48kBuffer(
    mono48k,
    sampleRate,
    config.deepFilterConfig,
    outputFormat
  );
}

export function resetDeepFilterV2(): void {
  denoiserState.instance?.destroy();
  denoiserState.instance = null;
  denoiserState.initPromise = null;
}

async function processMono48kBuffer(
  mono48k: Float32Array,
  inputSampleRate: number,
  config?: DeepFilterConfig,
  outputFormat = "wav"
): Promise<OfflineDeepFilterV2Result> {
  const denoiser = await getDenoiser(config);
  const { audio, stats } = denoiser.processAudioWithStats(mono48k);
  const wavBlob = encodeWavFloat32(audio, TARGET_SAMPLE_RATE);
  const outputBlob = await convertWavBlobToFormat(wavBlob, outputFormat);
  return {
    outputBlob,
    outputFormat,
    wavBlob,
    durationSec: audio.length / TARGET_SAMPLE_RATE,
    inputSampleRate,
    outputSampleRate: TARGET_SAMPLE_RATE,
    stats,
  };
}

async function getDenoiser(
  config?: DeepFilterConfig
): Promise<StandaloneDeepFilter> {
  if (denoiserState.instance) {
    return denoiserState.instance;
  }
  if (!denoiserState.initPromise) {
    denoiserState.initPromise = (async () => {
      const denoiser = new StandaloneDeepFilter({
        cdnUrl: pickDeepFilterCdnUrl(),
        ...config,
      });
      await denoiser.initialize();
      denoiserState.instance = denoiser;
      return denoiser;
    })();
  }
  return denoiserState.initPromise;
}

function pickDeepFilterCdnUrl(): string {
  // In Vite dev, proxying to the upstream CDN avoids automatic .gz decoding
  // on local static files (which can break df_create model loading).
  return import.meta.env.DEV ? DEV_DEEPFILTER_PROXY_CDN : LOCAL_DEEPFILTER_CDN;
}

async function decodeToMono48k(
  file: File
): Promise<{ mono48k: Float32Array; inputSampleRate: number }> {
  const bytes = await file.arrayBuffer();
  const decodeContext = new AudioContext();
  const decoded = await decodeContext.decodeAudioData(bytes.slice(0));
  await decodeContext.close();

  const mono = mixToMono(decoded);
  const mono48k = await ensure48k(mono, decoded.sampleRate);
  return {
    mono48k,
    inputSampleRate: decoded.sampleRate,
  };
}

function mixToMono(buffer: AudioBuffer): Float32Array {
  const mono = new Float32Array(buffer.length);
  for (let i = 0; i < buffer.length; i += 1) {
    let sum = 0;
    for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) {
      sum += buffer.getChannelData(ch)[i] ?? 0;
    }
    mono[i] = sum / buffer.numberOfChannels;
  }
  return mono;
}

async function ensure48k(
  samples: Float32Array,
  inputSampleRate: number
): Promise<Float32Array> {
  if (samples.length === 0) {
    return samples;
  }
  if (inputSampleRate === TARGET_SAMPLE_RATE) {
    return samples.slice();
  }

  const sourceBuffer = new AudioBuffer({
    numberOfChannels: 1,
    length: samples.length,
    sampleRate: inputSampleRate,
  });
  sourceBuffer.getChannelData(0).set(samples);

  const targetLength = Math.max(
    1,
    Math.round((samples.length * TARGET_SAMPLE_RATE) / inputSampleRate)
  );
  const renderContext = new OfflineAudioContext(
    1,
    targetLength,
    TARGET_SAMPLE_RATE
  );
  const source = renderContext.createBufferSource();
  source.buffer = sourceBuffer;
  source.connect(renderContext.destination);
  source.start();

  const rendered = await renderContext.startRendering();
  return rendered.getChannelData(0).slice();
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
    const sample = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, value: string): void {
  for (let i = 0; i < value.length; i += 1) {
    view.setUint8(offset + i, value.charCodeAt(i));
  }
}

function normalizeOutputFormat(format?: string): string {
  if (!format || format.length === 0) {
    return "wav";
  }
  const normalized = format.trim().toLowerCase();
  return normalized === "wave" ? "wav" : normalized;
}

async function getFfmpeg(): Promise<FFmpeg> {
  if (ffmpegState.instance) {
    return ffmpegState.instance;
  }

  if (!ffmpegState.loadPromise) {
    ffmpegState.loadPromise = (async () => {
      const ffmpeg = new FFmpeg();
      await ffmpeg.load({
        coreURL: ffmpegCoreURL,
        wasmURL: ffmpegWasmURL,
        classWorkerURL: ffmpegWorkerURL,
      });
      ffmpegState.instance = ffmpeg;
      return ffmpeg;
    })();
  }

  return ffmpegState.loadPromise;
}

async function convertWavBlobToFormat(
  wavBlob: Blob,
  format: string
): Promise<Blob> {
  const ffmpeg = await getFfmpeg();
  const inputName = "input.wav";
  const outputName = `output.${format}`;

  await ffmpeg.writeFile(
    inputName,
    new Uint8Array(await wavBlob.arrayBuffer())
  );

  ffmpeg.on("log", ({ message }) => {
    console.log("ffmpeg:", message); // This will show you "File not found" or "Invalid argument" errors
  });
  await ffmpeg.exec([
    "-i",
    inputName,
    ...buildCodecArgs(format),
    "-af",
    [
      "highpass=f=100", // 1. Cut rumble
      "equalizer=f=400:width_type=h:width=200:g=-3", // 2. Remove mud
      "equalizer=f=4000:width_type=h:width=1000:g=3", // 3. Add presence
      "highshelf=f=12000:g=4", // 4. Add "air"
      "acompressor=threshold=-20dB:ratio=4:attack=5:release=50:makeup=6dB", // 5. Aggressive Compression
      "alimiter=limit=0.9:level=true", // 6. Prevent clipping
    ].join(","),
    outputName,
  ]);
  const outputData = await ffmpeg.readFile(outputName);
  await ffmpeg.deleteFile(inputName);
  await ffmpeg.deleteFile(outputName);
  const outputBytes =
    typeof outputData === "string"
      ? new TextEncoder().encode(outputData)
      : new Uint8Array(outputData);

  return new Blob([outputBytes], {
    type: mimeTypeForFormat(format),
  });
}

function buildCodecArgs(format: string): string[] {
  switch (format) {
    case "mp3":
      return ["-codec:a", "libmp3lame", "-q:a", "2"];
    case "aac":
      return ["-codec:a", "aac", "-b:a", "192k"];
    case "m4a":
      return ["-codec:a", "aac", "-b:a", "192k"];
    case "flac":
      return ["-codec:a", "flac"];
    case "ogg":
      return ["-codec:a", "libvorbis", "-q:a", "5"];
    case "aiff":
      return ["-codec:a", "pcm_s16be"];
    default:
      return [];
  }
}

function mimeTypeForFormat(format: string): string {
  switch (format) {
    case "mp3":
      return "audio/mpeg";
    case "aac":
      return "audio/aac";
    case "m4a":
      return "audio/mp4";
    case "flac":
      return "audio/flac";
    case "ogg":
      return "audio/ogg";
    case "aiff":
      return "audio/aiff";
    case "wav":
      return "audio/wav";
    default:
      return "application/octet-stream";
  }
}
