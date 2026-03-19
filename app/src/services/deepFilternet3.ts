import {
  StandaloneDeepFilter,
  type DeepFilterConfig,
  type ProcessingStats,
} from "deepfilter-standalone";

const TARGET_SAMPLE_RATE = 48000;
const LOCAL_DEEPFILTER_CDN = "/models/deepfilter-standalone";
// const DEV_DEEPFILTER_PROXY_CDN = "/deepfilter-local";

type DenoiserState = {
  instance: StandaloneDeepFilter | null;
  initPromise: Promise<StandaloneDeepFilter> | null;
};

const denoiserState: DenoiserState = {
  instance: null,
  initPromise: null,
};

export type DeepFilterNet3Result = {
  wavBlob: Blob;
  durationSec: number;
  inputSampleRate: number;
  outputSampleRate: number;
  stats: ProcessingStats;
};

export type ProcessFileConfig = DeepFilterConfig;

export async function filterVocals(
  file: File,
  config: ProcessFileConfig = {}
): Promise<DeepFilterNet3Result> {
  const { mono48k, inputSampleRate } = await decodeToMono48k(file);
  return processMono48kBuffer(mono48k, inputSampleRate, config);
}

async function processMono48kBuffer(
  mono48k: Float32Array,
  inputSampleRate: number,
  config?: DeepFilterConfig
): Promise<DeepFilterNet3Result> {
  const denoiser = await getDenoiser(config);
  const { audio, stats } = denoiser.processAudioWithStats(mono48k);
  const wavBlob = encodeWavFloat32(audio, TARGET_SAMPLE_RATE);

  return {
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
        cdnUrl: LOCAL_DEEPFILTER_CDN,
        ...config,
      });
      await denoiser.initialize();
      denoiserState.instance = denoiser;
      return denoiser;
    })();
  }
  return denoiserState.initPromise;
}

// function pickDeepFilterCdnUrl(): string {
//   // In Vite dev, proxying to the upstream CDN avoids automatic .gz decoding
//   // on local static files (which can break df_create model loading).
//   return import.meta.env.DEV ? DEV_DEEPFILTER_PROXY_CDN : LOCAL_DEEPFILTER_CDN;
// }

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

// function normalizeOutputFormat(format?: string): string {
//   if (!format || format.length === 0) {
//     return "wav";
//   }
//   const normalized = format.trim().toLowerCase();
//   return normalized === "wave" ? "wav" : normalized;
// }

// async function convertWavBlobToFormat(
//   wavBlob: Blob,
//   format: string
// ): Promise<Blob> {
//   const ffmpeg = await getFfmpeg();
//   const inputName = "input.wav";
//   const outputName = `output.${format}`;

//   await ffmpeg.writeFile(
//     inputName,
//     new Uint8Array(await wavBlob.arrayBuffer())
//   );

//   ffmpeg.on("log", ({ message }) => {
//     console.log("ffmpeg:", message); // This will show you "File not found" or "Invalid argument" errors
//   });
//   await ffmpeg.exec([
//     "-i",
//     inputName,
//     ...buildCodecArgs(format),
//     "-af",
//     [
//       "highpass=f=100", // 1. Cut rumble
//       "equalizer=f=400:width_type=h:width=200:g=-3", // 2. Remove mud
//       "equalizer=f=4000:width_type=h:width=1000:g=3", // 3. Add presence
//       "highshelf=f=12000:g=4", // 4. Add "air"
//       "acompressor=threshold=-20dB:ratio=4:attack=5:release=50:makeup=6dB", // 5. Aggressive Compression
//       "alimiter=limit=0.9:level=true", // 6. Prevent clipping
//     ].join(","),
//     outputName,
//   ]);
//   const outputData = await ffmpeg.readFile(outputName);
//   await ffmpeg.deleteFile(inputName);
//   await ffmpeg.deleteFile(outputName);
//   const outputBytes =
//     typeof outputData === "string"
//       ? new TextEncoder().encode(outputData)
//       : new Uint8Array(outputData);

//   return new Blob([outputBytes], {
//     type: mimeTypeForFormat(format),
//   });
// }
