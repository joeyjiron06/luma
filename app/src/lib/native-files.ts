import { basename } from "@tauri-apps/api/path";
import { readFile } from "@tauri-apps/plugin-fs";
import { open } from "@tauri-apps/plugin-dialog";

const MEDIA_EXTENSIONS = [
  "aac",
  "aiff",
  "aif",
  "flac",
  "m4a",
  "mp3",
  "mp4",
  "mov",
  "mkv",
  "avi",
  "wmv",
  "flv",
  "webm",
  "mpeg",
  "mpg",
  "3gp",
  "ogg",
  "opus",
  "wav",
  "wma",
] as const;

const MEDIA_EXTENSION_SET = new Set<string>(MEDIA_EXTENSIONS);

export function filterMediaPaths(paths: string[]): string[] {
  const seen = new Set<string>();

  return paths.filter((path) => {
    if (seen.has(path)) {
      return false;
    }

    const ext = path.split(".").pop()?.toLowerCase() ?? "";
    if (!MEDIA_EXTENSION_SET.has(ext)) {
      return false;
    }

    seen.add(path);
    return true;
  });
}

const MIME_BY_EXTENSION: Record<string, string> = {
  aac: "audio/aac",
  aiff: "audio/aiff",
  aif: "audio/aiff",
  flac: "audio/flac",
  m4a: "audio/mp4",
  mp3: "audio/mpeg",
  mp4: "video/mp4",
  mov: "video/quicktime",
  mkv: "video/x-matroska",
  avi: "video/x-msvideo",
  wmv: "video/x-ms-wmv",
  flv: "video/x-flv",
  webm: "video/webm",
  mpeg: "video/mpeg",
  mpg: "video/mpeg",
  "3gp": "video/3gpp",
  ogg: "audio/ogg",
  opus: "audio/opus",
  wav: "audio/wav",
  wma: "audio/x-ms-wma",
};

function mimeFromName(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXTENSION[ext] ?? "application/octet-stream";
}

export type FileWithSourcePath = {
  file: File;
  sourcePath: string;
};

export async function filesFromPaths(
  paths: string[]
): Promise<FileWithSourcePath[]> {
  return Promise.all(
    paths.map(async (sourcePath) => {
      const bytes = await readFile(sourcePath);
      const name = await basename(sourcePath);
      const file = new File([bytes], name, { type: mimeFromName(name) });
      return { file, sourcePath };
    })
  );
}

export async function pickMediaFiles(options?: {
  multiple?: boolean;
}): Promise<FileWithSourcePath[]> {
  const selected = await open({
    multiple: options?.multiple ?? true,
    filters: [{ name: "Media", extensions: [...MEDIA_EXTENSIONS] }],
    title: "Select media files",
  });

  if (!selected) {
    return [];
  }

  const paths = Array.isArray(selected) ? selected : [selected];
  return filesFromPaths(paths);
}
