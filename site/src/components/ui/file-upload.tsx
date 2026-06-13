import { UploadSimple, X, File as FileIcon } from "@phosphor-icons/react";
import { useFileUpload, type FileUploadError } from "@/hooks/use-file-upload";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onFileSelected: (file: File) => void;
  onFileRemoved?: () => void;
  accept?: string;
  maxSize?: number;
  disabled?: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function FileUpload({
  onFileSelected,
  onFileRemoved,
  accept = "video/mp4,video/x-matroska,video/quicktime,video/x-msvideo,video/webm,audio/mp4,audio/aac,audio/ogg,audio/flac,audio/mpeg",
  maxSize = 2 * 1024 * 1024 * 1024,
  disabled = false,
}: FileUploadProps) {
  const {
    files,
    isDragging,
    errors,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    openFileDialog,
    removeFile,
    getInputProps,
  } = useFileUpload({
    maxSize,
    accept,
    multiple: false,
    onFilesChange: (f) => {
      if (f.length > 0) {
        onFileSelected(f[0].file);
      } else {
        onFileRemoved?.();
      }
    },
  });

  const selectedFile = files[0];

  return (
    <div className="w-full space-y-2">
      <div
        role="button"
        tabIndex={0}
        onClick={disabled || selectedFile ? undefined : openFileDialog}
        onKeyDown={(e) => {
          if (!disabled && !selectedFile && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            openFileDialog();
          }
        }}
        onDragEnter={selectedFile ? undefined : handleDragEnter}
        onDragLeave={selectedFile ? undefined : handleDragLeave}
        onDragOver={selectedFile ? undefined : handleDragOver}
        onDrop={selectedFile ? undefined : handleDrop}
        className={cn(
          "relative flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors",
          selectedFile
            ? "border-border bg-muted/30"
            : cn(
                "cursor-pointer",
                isDragging
                  ? "border-primary bg-accent"
                  : "border-border hover:border-primary/50 hover:bg-accent/50",
              ),
          disabled && "pointer-events-none opacity-50",
        )}
      >
        {selectedFile && (
          <Card
            size="sm"
            className="absolute inset-x-6 top-6 z-10 gap-0 py-0"
          >
            <CardContent className="flex items-center gap-2 py-1">
              <FileIcon className="size-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1 text-left">
                <CardTitle className="truncate">
                  {selectedFile.file.name}
                </CardTitle>
                <CardDescription className="text-xs">
                  {formatBytes(selectedFile.file.size)}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(selectedFile.id);
                }}
                aria-label="Remove file"
              >
                <X className="size-3.5" />
              </Button>
            </CardContent>
          </Card>
        )}
        <div
          className={cn(
            "flex size-12 items-center justify-center rounded-full bg-muted",
            selectedFile && "invisible",
          )}
        >
          <UploadSimple className="size-5 text-muted-foreground" />
        </div>
        <div className={cn(selectedFile && "invisible")}>
          <p className="text-sm font-medium">
            Drag & drop or click to browse
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            MP4, MOV, MKV, AVI, WebM, and audio files
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Up to {formatBytes(maxSize)}
          </p>
        </div>
      </div>

      <input {...getInputProps()} />

      {errors.length > 0 && (
        <div className="space-y-1">
          {errors.map((error: FileUploadError, i: number) => (
            <p key={i} className="text-xs text-destructive">
              {error.message}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
