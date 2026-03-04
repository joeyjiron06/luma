import { useCallback, useMemo, useRef, useState } from "react";
import { downloadDir, join } from "@tauri-apps/api/path";
import { writeFile } from "@tauri-apps/plugin-fs";
import FileUpload from "./components/fileUpload";
import { TooltipProvider } from "./components/ui/tooltip";
import { useFileUpload } from "@/hooks/use-file-upload";
import { getColumns, type ProcessedFile } from "./components/columns";
import { DataTable } from "./components/ui/data-table";
import { processFile } from "@/services/audio/offlineDeepFilterV2";
import { Button } from "./components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "./components/ui/empty";
import { ArrowUpRightIcon, FileMusicIcon } from "lucide-react";

import "./App.css";

function App() {
  const [fileState, fileActions] = useFileUpload({
    multiple: true,
  });

  const { files, format, outputFolder } = fileState;
  const [processingQueue, setProcessingQueue] = useState<ProcessedFile[]>([]);
  const isProcessingRef = useRef(false);

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
            const resolvedFormat = resolveOutputFormat(format, upload.file.name);
            const result = await processFile(upload.file, {
              outputFormat: resolvedFormat,
            });
            const outputName = buildOutputName(
              upload.file.name,
              resolvedFormat
            );

            const destinationFolder = await resolveOutputFolder(outputFolder);

            console.log('destination folder', destinationFolder)
            const outputPath = await join(destinationFolder, outputName);

            console.log('saving file', outputPath)
            await saveBlobToPath(result.outputBlob, outputPath);
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
  }, [fileActions, files, format, outputFolder]);

  const columns = useMemo(() => getColumns(), []);

  return (
    <TooltipProvider>
      <main className="h-screen bg-background text-foreground flex flex-col font-sans gap-8">
        {/* Header / Title Area */}
        <div className="px-8 pt-4">
        </div>

        <div className="px-8 flex flex-col gap-8 grow overflow-hidden">

          {/* Top Section: Upload Area */}
          <div className="shrink-0">
            <FileUpload
              state={fileState}
              actions={fileActions}
              onSubmit={handleSubmit}
            />
          </div>

          {/* Table */}
          <div className={"grow min-h-0 " + (processingQueue.length > 0 ? "overflow-auto" : "")}>
            {processingQueue.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <FileMusicIcon className="size-4" />
                  </EmptyMedia>
                  <EmptyTitle>No files yet - let&apos;s fix that</EmptyTitle>
                  <EmptyDescription>
                    Drop in an audio file to get started, and we&apos;ll clean it up for you
                    in just a few clicks.
                  </EmptyDescription>
                </EmptyHeader>

                <Button
                  variant="link"
                  asChild
                  className="text-muted-foreground"
                  size="sm"
                >
                  <a href="#">
                    Learn More <ArrowUpRightIcon />
                  </a>
                </Button>
              </Empty>
            ) : (
              <DataTable columns={columns} data={processingQueue} />
            )}
          </div>
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
