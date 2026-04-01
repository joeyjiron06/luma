import { useCallback, useMemo, useRef, useState } from "react";
import { downloadDir, join } from "@tauri-apps/api/path";
import { writeFile } from "@tauri-apps/plugin-fs";
import FileUpload from "./components/fileUpload";
import { TooltipProvider } from "./components/ui/tooltip";
import { useFileUpload } from "@/hooks/use-file-upload";
import { getColumns, type ProcessedFile } from "./components/columns";
import { DataTable } from "./components/ui/data-table";
import * as DeepFilterNet3 from "@/services/deepFilternet3";
import * as Demucs from "@/services/demucs";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "./components/ui/empty";
import { FileMusicIcon } from "lucide-react";

import "./App.css";
import { processWaveBlob, extractAudioFromVideo, replaceAudioInVideo } from "./services/ffmpeg";

function App() {
  const [fileState, fileActions] = useFileUpload({
    multiple: true,
    accept: "audio/aac,audio/x-aac,audio/x-aiff,audio/ogg,audio/mpeg,audio/mp3,audio/mpeg3,audio/x-mpeg-3,audio/opus,audio/wav,audio/x-wav,audio/webm,audio/flac,audio/x-flac,audio/mp4,audio/aiff,audio/x-m4a,video/mp4,video/x-msvideo,video/x-matroska,video/quicktime,video/x-ms-wmv,video/x-flv,video/webm,video/mpeg,video/3gpp",
  });

  const { files, format, outputFolder, selectedModel, attenuationLimit } = fileState;
  const [processingQueue, setProcessingQueue] = useState<ProcessedFile[]>([]);
  const [activeAudio, setActiveAudio] = useState<{
    id: string;
    src: string;
    fileName: string;
  } | null>(null);
  const isProcessingRef = useRef(false);

  const handlePlayFile = useCallback(
    (file: { id: string; src: string; fileName: string }) => {
      setActiveAudio(file);
    },
    []
  );

  const handleSubmit = useCallback(() => {
    const run = async () => {
      if (isProcessingRef.current || files.length === 0) {
        return;
      }

      isProcessingRef.current = true;
      const uploads = files
        .map((upload) => ({
          id: upload.id,
          file: upload.file instanceof File ? upload.file : null,
        }))
        .filter((item): item is { id: string; file: File } => item.file instanceof File);

      if (uploads.length === 0) {
        isProcessingRef.current = false;
        return;
      }

      setProcessingQueue((prev) => [
        ...uploads.map((upload) => ({
          id: upload.id,
          file: upload.file,
          status: "queued" as const,
          originalName: upload.file.name,
          timestamp: Date.now(),
        })),
        ...prev,
      ]);

      fileActions.clearFiles();

      try {
        for (const upload of uploads) {
          setProcessingQueue((prev) =>
            prev.map((item) =>
              item.id === upload.id
                ? { ...item, status: "processing", error: undefined }
                : item
            )
          );
          try {
            const isVideo = isVideoFile(upload.file);

            const audioFile = isVideo
              ? new File(
                  [await extractAudioFromVideo(upload.file)],
                  "extracted.wav",
                  { type: "audio/wav" }
                )
              : upload.file;

            const result =
              selectedModel === "demucs"
                ? await Demucs.filterVocals(audioFile)
                : await DeepFilterNet3.filterVocals(audioFile, {
                  attenuationLimit,
                });

            let finalBlob: Blob;
            let outputName: string;
            let resolvedFormat: string;

            if (isVideo) {
              finalBlob = await replaceAudioInVideo(upload.file, result.wavBlob);
              resolvedFormat = getFileExtension(upload.file.name) || "mp4";
              outputName = buildOutputName(upload.file.name, resolvedFormat);
            } else {
              resolvedFormat = resolveOutputFormat(format, upload.file.name);
              finalBlob = await processWaveBlob(result.wavBlob, resolvedFormat);
              outputName = buildOutputName(upload.file.name, resolvedFormat);
            }

            const destinationFolder = await resolveOutputFolder(outputFolder);
            const outputPath = await join(destinationFolder, outputName);

            await saveBlobToPath(finalBlob, outputPath);

            setProcessingQueue((prev) =>
              prev.map((item) =>
                item.id === upload.id
                  ? {
                    ...item,
                    status: "completed",
                    outputName,
                    outputPath,
                    format: resolvedFormat,
                    durationSec: result.durationSec,
                  }
                  : item
              )
            );
          } catch (error) {
            console.error(error);
            setProcessingQueue((prev) =>
              prev.map((item) =>
                item.id === upload.id
                  ? { ...item, status: "error", error: String(error) }
                  : item
              )
            );
          }
        }
      } finally {
        isProcessingRef.current = false;
      }
    };

    void run();
  }, [attenuationLimit, fileActions, files, format, outputFolder, selectedModel]);

  const columns = useMemo(() => getColumns(), []);

  const activeAudioStillExists = useMemo(() => {
    if (!activeAudio) return false;
    return files.some((file) => file.id === activeAudio.id);
  }, [activeAudio, files]);

  const visibleActiveAudio = activeAudioStillExists ? activeAudio : null;

  return (
    <TooltipProvider>
      <main className="h-screen bg-background text-foreground flex font-sans">
        {/* sidebar */}
        {/* <div className="px-8 pt-4 bg-muted/30  w-64 h-full ">
        </div> */}

        {/* main content */}
        <div className="w-full px-4 py-4 flex flex-col gap-5">
          {/* Table */}
          <div className={"h-auto w-full  rounded-xl p-4 grow min-h-0 " + (processingQueue.length > 0 ? "overflow-auto" : "flex items-center justify-center")}>
            {processingQueue.length === 0 ? (
              <Empty className="select-none relative">
                <div className="absolute inset-0 bg-grid z-0 opacity-30"></div>
                <EmptyHeader className="z-10">
                  <EmptyMedia variant="icon">
                    <FileMusicIcon className="size-4" />
                  </EmptyMedia>
                  <EmptyTitle>No files yet - let&apos;s fix that</EmptyTitle>
                  <EmptyDescription>
                    Drop in an audio file below to get started, and we&apos;ll clean it up for you
                    in just a few clicks.
                  </EmptyDescription>
                </EmptyHeader>

                {/* <Button
                  variant="link"
                  asChild
                  className="text-muted-foreground z-10"
                  size="sm"
                >
                  <a href="#">
                    Learn More <ArrowUpRightIcon />
                  </a>
                </Button> */}
              </Empty>
            ) : (
              <DataTable columns={columns} data={processingQueue} />
            )}
          </div>

          <FileUpload
            className="w-full"
            state={fileState}
            actions={fileActions}
            onSubmit={handleSubmit}
            onPlayFile={handlePlayFile}
            activeAudioId={visibleActiveAudio?.id ?? null}
          />
        </div>

      </main>
    </TooltipProvider>
  );
}

export default App;

function stripExtension(name: string): string {
  const index = name.lastIndexOf(".");
  if (index <= 0) {
    return name;
  }
  return name.slice(0, index);
}

async function saveBlobToPath(blob: Blob, outputPath: string): Promise<void> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  await writeFile(outputPath, bytes);
}

async function resolveOutputFolder(outputFolder: string): Promise<string> {
  if (outputFolder !== "same-as-input") {
    return outputFolder;
  }
  return downloadDir();
}

function resolveOutputFormat(format: string, inputName: string): string {
  if (format !== "same-as-input") {
    return format;
  }
  const ext = getFileExtension(inputName);
  return ext || "wav";
}

function buildOutputName(inputName: string, format: string): string {
  return `${stripExtension(inputName)}_enhanced.${format}`;
}

function getFileExtension(name: string): string {
  const index = name.lastIndexOf(".");
  if (index <= 0 || index >= name.length - 1) {
    return "";
  }
  return name.slice(index + 1).toLowerCase();
}

function isVideoFile(file: File): boolean {
  return file.type.startsWith("video/");
}
