import { useState, useCallback } from "react";
import { FileUpload } from "@/components/ui/file-upload";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { convertToWav, type Quality } from "@/lib/ffmpeg";

type State = "idle" | "fileSelected" | "loading" | "converting" | "done" | "error";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getStem(filename: string): string {
  const idx = filename.lastIndexOf(".");
  return idx >= 0 ? filename.slice(0, idx) : filename;
}

export default function Mp4ToWavConverter() {
  const [state, setState] = useState<State>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [quality, setQuality] = useState<Quality>("standard");
  const [progress, setProgress] = useState(0);
  const [outputBlob, setOutputBlob] = useState<Blob | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const handleFileSelected = useCallback((f: File) => {
    setFile(f);
    setState("fileSelected");
    setErrorMessage("");
  }, []);

  const handleConvert = useCallback(async () => {
    if (!file) return;

    try {
      setState("loading");
      setProgress(0);

      const blob = await convertToWav(file, quality, (ratio) => {
        setState("converting");
        setProgress(Math.min(Math.round(ratio * 100), 100));
      });

      setOutputBlob(blob);
      setState("done");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Conversion failed. Please try again.",
      );
      setState("error");
    }
  }, [file, quality]);

  const handleDownload = useCallback(() => {
    if (!outputBlob || !file) return;
    const url = URL.createObjectURL(outputBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${getStem(file.name)}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [outputBlob, file]);

  const handleReset = useCallback(() => {
    setState("idle");
    setFile(null);
    setProgress(0);
    setOutputBlob(null);
    setErrorMessage("");
  }, []);

  return (
    <div className="space-y-6">
      {(state === "idle" || state === "fileSelected") && (
        <>
          <FileUpload
            onFileSelected={handleFileSelected}
            disabled={state !== "idle" && state !== "fileSelected"}
          />

          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-4 py-3">
            <div>
              <p className="text-sm font-medium">High quality</p>
              <p className="text-xs text-muted-foreground">
                {quality === "high"
                  ? "48 kHz, 24-bit"
                  : "44.1 kHz, 16-bit"}
              </p>
            </div>
            <Switch
              checked={quality === "high"}
              onCheckedChange={(checked) =>
                setQuality(checked ? "high" : "standard")
              }
              size="sm"
            />
          </div>

          {state === "fileSelected" && (
            <Button
              onClick={handleConvert}
              className="w-full rounded-full h-10"
            >
              Convert to WAV
            </Button>
          )}
        </>
      )}

      {state === "loading" && (
        <div className="flex flex-col items-center gap-4 py-12">
          <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">
            Loading converter...
          </p>
        </div>
      )}

      {state === "converting" && (
        <div className="space-y-3 py-8">
          <Progress value={progress} className="h-2" />
          <p className="text-center text-sm text-muted-foreground">
            Converting... {progress}%
          </p>
        </div>
      )}

      {state === "done" && outputBlob && (
        <div className="flex flex-col items-center gap-4 py-8">
          <p className="text-sm text-muted-foreground">
            Conversion complete — {formatBytes(outputBlob.size)}
          </p>
          <Button
            onClick={handleDownload}
            className="rounded-full h-10 px-8"
          >
            Download WAV
          </Button>
          <button
            onClick={handleReset}
            className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
          >
            Convert another
          </button>
        </div>
      )}

      {state === "error" && (
        <div className="flex flex-col items-center gap-4 py-8">
          <p className="text-sm text-destructive">{errorMessage}</p>
          <button
            onClick={handleReset}
            className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
