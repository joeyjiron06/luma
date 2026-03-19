import * as ort from "onnxruntime-web/all";
import { DemucsProcessor } from "demucs-web";

const DEMUCS_SAMPLE_RATE = 44100;
const LOCAL_DEMUCS_MODEL_PATH = "/models/demucs/htdemucs_embedded.onnx";

type StereoTrack = {
  left: Float32Array;
  right: Float32Array;
};

type SeparationResult = {
  vocals: StereoTrack;
};

type DemucsProcessorLike = {
  loadModel: (pathOrBuffer?: string | ArrayBuffer) => Promise<void>;
  separate: (
    left: Float32Array,
    right: Float32Array
  ) => Promise<SeparationResult>;
};

type DemucsState = {
  instance: DemucsProcessorLike | null;
  initPromise: Promise<DemucsProcessorLike> | null;
};

const demucsState: DemucsState = {
  instance: null,
  initPromise: null,
};

export type DemucsResult = {
  wavBlob: Blob;
  durationSec: number;
  inputSampleRate: number;
  outputSampleRate: number;
};

export async function filterVocals(file: File): Promise<DemucsResult> {
  const { left, right, inputSampleRate } = await decodeToStereo44100(file);
  const demucs = await getDemucsProcessor();
  const separated = await demucs.separate(left, right);
  const wavBlob = encodeStereoWavFloat32(
    separated.vocals.left,
    separated.vocals.right,
    DEMUCS_SAMPLE_RATE
  );

  return {
    wavBlob,
    durationSec:
      Math.max(separated.vocals.left.length, separated.vocals.right.length) /
      DEMUCS_SAMPLE_RATE,
    inputSampleRate,
    outputSampleRate: DEMUCS_SAMPLE_RATE,
  };
}

async function getDemucsProcessor(): Promise<DemucsProcessorLike> {
  if (demucsState.instance) {
    return demucsState.instance;
  }
  if (!demucsState.initPromise) {
    demucsState.initPromise = (async () => {
      // ort.env.wasm.wasmPaths = {
      //   wasm: ortWasmURL,
      // };
      ort.env.wasm.numThreads = navigator.hardwareConcurrency || 4;

      const processor = new DemucsProcessor({
        ort,
        onProgress: ({ progress, currentSegment, totalSegments }) => {
          console.log(
            "demucs:",
            `${(progress * 100).toFixed(
              1
            )}% (${currentSegment}/${totalSegments})`
          );
        },
        onLog: (phase, message) => {
          console.log(`demucs [${phase}]`, message);
        },
      });
      await processor.loadModel(LOCAL_DEMUCS_MODEL_PATH);
      demucsState.instance = processor;
      return processor;
    })();
  }
  return demucsState.initPromise;
}

async function decodeToStereo44100(file: File): Promise<{
  left: Float32Array;
  right: Float32Array;
  inputSampleRate: number;
}> {
  const bytes = await file.arrayBuffer();
  const decodeContext = new AudioContext();
  const decoded = await decodeContext.decodeAudioData(bytes.slice(0));
  await decodeContext.close();

  const leftInput = decoded.getChannelData(0);
  const rightInput =
    decoded.numberOfChannels > 1 ? decoded.getChannelData(1) : leftInput;

  const { left, right } = await ensureStereo44100(
    leftInput,
    rightInput,
    decoded.sampleRate
  );
  return {
    left,
    right,
    inputSampleRate: decoded.sampleRate,
  };
}

async function ensureStereo44100(
  leftInput: Float32Array,
  rightInput: Float32Array,
  inputSampleRate: number
): Promise<{ left: Float32Array; right: Float32Array }> {
  if (leftInput.length === 0) {
    return {
      left: leftInput,
      right: rightInput,
    };
  }
  if (inputSampleRate === DEMUCS_SAMPLE_RATE) {
    return {
      left: leftInput.slice(),
      right: rightInput.slice(),
    };
  }

  const inputLength = Math.max(leftInput.length, rightInput.length);
  const sourceBuffer = new AudioBuffer({
    numberOfChannels: 2,
    length: inputLength,
    sampleRate: inputSampleRate,
  });
  sourceBuffer.getChannelData(0).set(leftInput);
  sourceBuffer.getChannelData(1).set(rightInput);

  const targetLength = Math.max(
    1,
    Math.round((inputLength * DEMUCS_SAMPLE_RATE) / inputSampleRate)
  );
  const renderContext = new OfflineAudioContext(
    2,
    targetLength,
    DEMUCS_SAMPLE_RATE
  );
  const source = renderContext.createBufferSource();
  source.buffer = sourceBuffer;
  source.connect(renderContext.destination);
  source.start();
  const rendered = await renderContext.startRendering();
  return {
    left: rendered.getChannelData(0).slice(),
    right: rendered.getChannelData(1).slice(),
  };
}

function encodeStereoWavFloat32(
  left: Float32Array,
  right: Float32Array,
  sampleRate: number
): Blob {
  const frameCount = Math.max(left.length, right.length);
  const channelCount = 2;
  const dataLength = frameCount * channelCount * 2;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channelCount, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channelCount * 2, true);
  view.setUint16(32, channelCount * 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataLength, true);

  let offset = 44;
  for (let i = 0; i < frameCount; i += 1) {
    const l = Math.max(-1, Math.min(1, left[i] ?? 0));
    const r = Math.max(-1, Math.min(1, right[i] ?? 0));
    view.setInt16(offset, l < 0 ? l * 0x8000 : l * 0x7fff, true);
    offset += 2;
    view.setInt16(offset, r < 0 ? r * 0x8000 : r * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, value: string): void {
  for (let i = 0; i < value.length; i += 1) {
    view.setUint8(offset + i, value.charCodeAt(i));
  }
}
