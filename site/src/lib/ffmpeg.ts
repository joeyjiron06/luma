import type { FFmpeg } from "@ffmpeg/ffmpeg";

let ffmpeg: FFmpeg | null = null;

export async function getFFmpeg(
  onProgress?: (ratio: number) => void,
): Promise<FFmpeg> {
  if (ffmpeg && ffmpeg.loaded) {
    if (onProgress) {
      ffmpeg.on("progress", ({ progress }) => onProgress(progress));
    }
    return ffmpeg;
  }

  const { FFmpeg } = await import("@ffmpeg/ffmpeg");

  ffmpeg = new FFmpeg();
  ffmpeg.on("log", ({ message }) => console.log("[ffmpeg]", message));
  if (onProgress) {
    ffmpeg.on("progress", ({ progress }) => onProgress(progress));
  }

  await ffmpeg.load({
    coreURL: "/ffmpeg/ffmpeg-core.js",
    wasmURL: "/ffmpeg/ffmpeg-core.wasm",
    classWorkerURL: "/ffmpeg/ffmpeg-worker.js",
  });

  return ffmpeg;
}

export type AudioFormat =
  | "wav"
  | "mp3"
  | "aac"
  | "m4a"
  | "flac"
  | "ogg"
  | "opus"
  | "aiff";

export const AUDIO_FORMATS: { value: AudioFormat; label: string }[] = [
  { value: "wav", label: "Wav" },
  { value: "mp3", label: "Mp3" },
  { value: "aac", label: "Aac" },
  { value: "m4a", label: "M4a" },
  { value: "flac", label: "Flac" },
  { value: "ogg", label: "Ogg" },
  { value: "opus", label: "Opus" },
  { value: "aiff", label: "Aiff" },
];

function getExtension(filename: string): string {
  const idx = filename.lastIndexOf(".");
  return idx >= 0 ? filename.slice(idx) : "";
}

export type AudioConvertOptions = {
  channels: 1 | 2;
  sampleRate: number;
  bitrate: number;
  /** 0–300; 128 is unity gain */
  volume: number;
};

function buildCodecArgs(format: AudioFormat, bitrate: number): string[] {
  switch (format) {
    case "wav":
      return ["-acodec", "pcm_s16le"];
    case "mp3":
      return ["-codec:a", "libmp3lame", "-b:a", `${bitrate}k`];
    case "aac":
    case "m4a":
      return ["-codec:a", "aac", "-b:a", `${bitrate}k`];
    case "flac":
      return ["-codec:a", "flac"];
    case "ogg":
      return ["-codec:a", "libvorbis", "-b:a", `${bitrate}k`];
    case "opus":
      return ["-codec:a", "libopus", "-b:a", `${bitrate}k`];
    case "aiff":
      return ["-codec:a", "pcm_s16be"];
    default:
      return [];
  }
}

function buildAudioArgs(format: AudioFormat, options: AudioConvertOptions): string[] {
  const args: string[] = ["-vn"];

  if (options.volume !== 128) {
    args.push("-af", `volume=${options.volume / 128}`);
  }

  args.push("-ac", String(options.channels));
  args.push("-ar", String(options.sampleRate));
  args.push(...buildCodecArgs(format, options.bitrate));

  return args;
}

function mimeTypeForFormat(format: AudioFormat): string {
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
    case "opus":
      return "audio/opus";
    case "aiff":
      return "audio/aiff";
    default:
      return "audio/wav";
  }
}

export async function convertToAudio(
  file: File,
  format: AudioFormat = "wav",
  options: AudioConvertOptions,
  onProgress?: (ratio: number) => void,
): Promise<Blob> {
  const ff = await getFFmpeg(onProgress);

  const inputName = "input" + getExtension(file.name);
  const outputName = `output.${format}`;

  const { fetchFile } = await import("@ffmpeg/util");
  await ff.writeFile(inputName, await fetchFile(file));

  await ff.exec(["-i", inputName, ...buildAudioArgs(format, options), outputName]);

  const data = await ff.readFile(outputName);
  await ff.deleteFile(inputName);
  await ff.deleteFile(outputName);

  return new Blob([data], { type: mimeTypeForFormat(format) });
}
