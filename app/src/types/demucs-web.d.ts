declare module "demucs-web" {
  import type * as ort from "onnxruntime-web";

  export interface ProgressInfo {
    progress: number;
    currentSegment: number;
    totalSegments: number;
  }

  export interface StereoStem {
    left: Float32Array;
    right: Float32Array;
  }

  export interface SeparationResult {
    drums: StereoStem;
    bass: StereoStem;
    other: StereoStem;
    vocals: StereoStem;
  }

  export interface DemucsProcessorOptions {
    ort: typeof ort;
    onProgress?: (info: ProgressInfo) => void;
    onLog?: (phase: string, message: string) => void;
    onDownloadProgress?: (loaded: number, total: number) => void;
    sessionOptions?: ort.InferenceSession.SessionOptions;
  }

  export class DemucsProcessor {
    constructor(options: DemucsProcessorOptions);
    loadModel(pathOrBuffer?: string | ArrayBuffer): Promise<void>;
    separate(
      left: Float32Array,
      right: Float32Array
    ): Promise<SeparationResult>;
  }
}
