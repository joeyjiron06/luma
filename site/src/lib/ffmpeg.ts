import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

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

  ffmpeg = new FFmpeg();
  if (onProgress) {
    ffmpeg.on("progress", ({ progress }) => onProgress(progress));
  }

  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(
      `${baseURL}/ffmpeg-core.wasm`,
      "application/wasm",
    ),
  });

  return ffmpeg;
}

export type Quality = "standard" | "high";

function getExtension(filename: string): string {
  const idx = filename.lastIndexOf(".");
  return idx >= 0 ? filename.slice(idx) : "";
}

export async function convertToWav(
  file: File,
  quality: Quality = "standard",
  onProgress?: (ratio: number) => void,
): Promise<Blob> {
  const ff = await getFFmpeg(onProgress);

  const inputName = "input" + getExtension(file.name);
  const outputName = "output.wav";

  await ff.writeFile(inputName, await fetchFile(file));

  const codec = quality === "high" ? "pcm_s24le" : "pcm_s16le";
  const sampleRate = quality === "high" ? "48000" : "44100";

  await ff.exec([
    "-i",
    inputName,
    "-vn",
    "-acodec",
    codec,
    "-ar",
    sampleRate,
    outputName,
  ]);

  const data = await ff.readFile(outputName);
  await ff.deleteFile(inputName);
  await ff.deleteFile(outputName);

  return new Blob([data], { type: "audio/wav" });
}
