import { FFmpeg } from "@ffmpeg/ffmpeg";
import ffmpegCoreURL from "@ffmpeg/core?url";
import ffmpegWasmURL from "@ffmpeg/core/wasm?url";
import ffmpegWorkerURL from "@ffmpeg/ffmpeg/worker?url";

type FfmpegState = {
  instance: FFmpeg | null;
  loadPromise: Promise<FFmpeg> | null;
};

const ffmpegState: FfmpegState = {
  instance: null,
  loadPromise: null,
};

let ffmpegPromise: Promise<FFmpeg> | null = null;

async function getFfmpeg(): Promise<FFmpeg> {
  if (!ffmpegPromise) {
    const ffmpeg = new FFmpeg();

    ffmpegPromise = new Promise((resolve, reject) => {
      ffmpeg
        .load({
          coreURL: ffmpegCoreURL,
          wasmURL: ffmpegWasmURL,
          classWorkerURL: ffmpegWorkerURL,
        })
        .then(() => resolve(ffmpeg))
        .catch(reject);
    });
  }

  return ffmpegPromise!;
}

export async function processWaveBlob(
  wavBlob: Blob,
  format: string
): Promise<Blob> {
  format = normalizeOutputFormat(format);

  const ffmpeg = await getFfmpeg();
  const inputName = "input.wav";
  const outputName = `output.${format}`;
  await ffmpeg.writeFile(
    inputName,
    new Uint8Array(await wavBlob.arrayBuffer())
  );
  await ffmpeg.exec([
    "-i",
    inputName,
    ...buildCodecArgs(format),
    ...buildAudioFilters(),
    outputName,
  ]);
  const outputData = await ffmpeg.readFile(outputName);
  await ffmpeg.deleteFile(inputName);
  await ffmpeg.deleteFile(outputName);

  const outputBytes =
    typeof outputData === "string"
      ? new TextEncoder().encode(outputData)
      : new Uint8Array(outputData);
  return new Blob([outputBytes], { type: mimeTypeForFormat(format) });
}

function normalizeOutputFormat(format?: string): string {
  if (!format || format.length === 0) {
    return "wav";
  }
  const normalized = format.trim().toLowerCase();
  return normalized === "wave" ? "wav" : normalized;
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

function buildAudioFilters(): string[] {
  return [
    "-af",
    [
      "highpass=f=100", // 1. Cut rumble
      "equalizer=f=400:width_type=h:width=200:g=-3", // 2. Remove mud
      "equalizer=f=4000:width_type=h:width=1000:g=3", // 3. Add presence
      "highshelf=f=12000:g=4", // 4. Add "air"
      "acompressor=threshold=-20dB:ratio=4:attack=5:release=50:makeup=6dB", // 5. Aggressive Compression
      "alimiter=limit=0.9:level=true", // 6. Prevent clipping
    ].join(","),
  ];
}

export async function extractAudioFromVideo(videoFile: File): Promise<Blob> {
  const ffmpeg = await getFfmpeg();
  const ext = videoFile.name.split(".").pop()?.toLowerCase() ?? "mp4";
  const inputName = `input_video.${ext}`;
  const outputName = "extracted_audio.wav";

  await ffmpeg.writeFile(inputName, new Uint8Array(await videoFile.arrayBuffer()));
  await ffmpeg.exec(["-i", inputName, "-vn", "-acodec", "pcm_s16le", outputName]);

  const outputData = await ffmpeg.readFile(outputName);
  await ffmpeg.deleteFile(inputName);
  await ffmpeg.deleteFile(outputName);

  const outputBytes =
    typeof outputData === "string"
      ? new TextEncoder().encode(outputData)
      : new Uint8Array(outputData);
  return new Blob([outputBytes], { type: "audio/wav" });
}

export async function replaceAudioInVideo(
  videoFile: File,
  audioBlob: Blob
): Promise<Blob> {
  const ffmpeg = await getFfmpeg();
  const ext = videoFile.name.split(".").pop()?.toLowerCase() ?? "mp4";
  const videoInputName = `original_video.${ext}`;
  const audioInputName = "new_audio.wav";
  const outputName = `output_video.${ext}`;

  await ffmpeg.writeFile(videoInputName, new Uint8Array(await videoFile.arrayBuffer()));
  await ffmpeg.writeFile(audioInputName, new Uint8Array(await audioBlob.arrayBuffer()));

  await ffmpeg.exec([
    "-i", videoInputName,
    "-i", audioInputName,
    "-c:v", "copy",
    "-map", "0:v:0",
    "-map", "1:a:0",
    "-shortest",
    outputName,
  ]);

  const outputData = await ffmpeg.readFile(outputName);
  await ffmpeg.deleteFile(videoInputName);
  await ffmpeg.deleteFile(audioInputName);
  await ffmpeg.deleteFile(outputName);

  const outputBytes =
    typeof outputData === "string"
      ? new TextEncoder().encode(outputData)
      : new Uint8Array(outputData);
  return new Blob([outputBytes], { type: videoFile.type || "video/mp4" });
}
