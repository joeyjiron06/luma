import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { downloadDir, join } from "@tauri-apps/api/path";
import { writeFile } from "@tauri-apps/plugin-fs";
import FileUpload from "./components/fileUpload";
import { TooltipProvider } from "./components/ui/tooltip";
import { useFileUpload } from "@/hooks/use-file-upload";
import { getColumns, type ProcessedFile } from "./components/columns";
import { DataTable } from "./components/ui/data-table";
import { processFile } from "@/services/audio/offlineDeepFilterV2";

import "./App.css";

function App() {
  const [fileState, fileActions] = useFileUpload({
    multiple: true,
  });

  const [processingQueue, setProcessingQueue] = useState<ProcessedFile[]>([]);
  const isProcessingRef = useRef(false);
  const queueRef = useRef<ProcessedFile[]>([]);

  useEffect(() => {
    queueRef.current = processingQueue;
  }, [processingQueue]);

  const handleSubmit = useCallback(() => {
    const run = async () => {
      if (isProcessingRef.current || fileState.files.length === 0) {
        return;
      }

      isProcessingRef.current = true;
      const uploads = fileState.files
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
            const result = await processFile(upload.file);
            const outputName = `${stripExtension(upload.file.name)}_enhanced.wav`;
            const outputUrl = URL.createObjectURL(result.wavBlob);
            setProcessingQueue((prev) =>
              prev.map((item) =>
                item.id === upload.id
                  ? {
                    ...item,
                    status: "completed",
                    outputUrl,
                    outputName,
                    format: "wav",
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
  }, [fileActions, fileState.files]);

  useEffect(() => {
    return () => {
      for (const item of queueRef.current) {
        if (item.outputUrl) {
          URL.revokeObjectURL(item.outputUrl);
        }
      }
    };
  }, []);

  const handleRemoveItem = useCallback((id: string) => {
    setProcessingQueue((prev) => {
      const match = prev.find((item) => item.id === id);
      if (match?.outputUrl) {
        URL.revokeObjectURL(match.outputUrl);
      }
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const handleDownloadItem = useCallback((id: string) => {
    const run = async () => {
      const row = processingQueue.find((item) => item.id === id);
      if (!row?.outputUrl || !row.outputName) {
        return;
      }

      try {
        await saveBlobToDownloads(row.outputUrl, row.outputName);
      } catch {
        // Fallback for non-Tauri browser contexts.
        downloadWithAnchor(row.outputUrl, row.outputName);
      }
    };

    void run();
  }, [processingQueue]);

  const columns = useMemo(
    () => getColumns({ handleRemoveItem, handleDownloadItem }),
    [handleDownloadItem, handleRemoveItem]
  );

  return (
    <TooltipProvider>
      <main className="h-screen bg-background text-foreground flex flex-col font-sans gap-8">
        {/* Header / Title Area */}
        <div className="px-8 pt-4">
          <h1 className="text-2xl font-bold mb-6">Luma</h1>
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
          <div className="overflow-auto grow min-h-0">
            <DataTable columns={columns} data={processingQueue} />
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

async function saveBlobToDownloads(blobUrl: string, filename: string): Promise<void> {
  const response = await fetch(blobUrl);
  if (!response.ok) {
    throw new Error(`Failed to read output audio: ${response.status}`);
  }

  const downloadsPath = await downloadDir();
  const outputPath = await join(downloadsPath, filename);
  const bytes = new Uint8Array(await response.arrayBuffer());

  await writeFile(outputPath, bytes);
}

function downloadWithAnchor(url: string, filename: string): void {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}
