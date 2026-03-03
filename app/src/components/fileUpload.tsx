"use client";

import {
  FileArchiveIcon,
  FileIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  HeadphonesIcon,
  ImageIcon,
  UploadIcon,
  VideoIcon,
  XIcon,
  ArrowUpIcon,
  ChevronDown,
} from "lucide-react";

import {
  formatBytes,
  type FileUploadState,
  type FileUploadActions,
} from "@/hooks/use-file-upload";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";

const getFileIcon = (file: { file: File | { type: string; name: string } }) => {
  const fileType = file.file instanceof File ? file.file.type : file.file.type;
  const fileName = file.file instanceof File ? file.file.name : file.file.name;

  if (
    fileType.includes("pdf") ||
    fileName.endsWith(".pdf") ||
    fileType.includes("word") ||
    fileName.endsWith(".doc") ||
    fileName.endsWith(".docx")
  ) {
    return <FileTextIcon className="size-4 opacity-60" />;
  }
  if (
    fileType.includes("zip") ||
    fileType.includes("archive") ||
    fileName.endsWith(".zip") ||
    fileName.endsWith(".rar")
  ) {
    return <FileArchiveIcon className="size-4 opacity-60" />;
  }
  if (
    fileType.includes("excel") ||
    fileName.endsWith(".xls") ||
    fileName.endsWith(".xlsx")
  ) {
    return <FileSpreadsheetIcon className="size-4 opacity-60" />;
  }
  if (fileType.includes("video/")) {
    return <VideoIcon className="size-4 opacity-60" />;
  }
  if (fileType.includes("audio/")) {
    return <HeadphonesIcon className="size-4 opacity-60" />;
  }
  if (fileType.startsWith("image/")) {
    return <ImageIcon className="size-4 opacity-60" />;
  }
  return <FileIcon className="size-4 opacity-60" />;
};

interface FileUploadProps {
  className?: string;
  state: FileUploadState;
  actions: FileUploadActions;
  onSubmit: () => void;
}

export default function Component({
  className,
  state,
  actions,
  onSubmit,
}: FileUploadProps) {
  const { files, isDragging, errors } = state;
  const {
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    openFileDialog,
    removeFile,
    getInputProps,
  } = actions;

  const [selectedModel, setSelectedModel] = useState("Local (Free)");

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        className="relative flex min-h-40 flex-col items-center justify-center rounded-xl bg-muted/30 border border-input px-4 py-2 transition-colors has-[input:focus]:border-ring has-[input:focus]:ring-[3px] has-[input:focus]:ring-ring/50 data-[dragging=true]:bg-accent/50 grow"
        data-dragging={isDragging || undefined}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          {...getInputProps()}
          aria-label="Upload files"
          className="sr-only"
        />

        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center gap-2 pointer-events-none">
            <p className="font-medium text-sm text-muted-foreground">Drop files here</p>
          </div>
        ) : (
          <div className="w-full flex flex-col gap-4 z-10">
            <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between gap-3 p-2 rounded-md bg-background/50 border border-border/50"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="flex items-center justify-center size-8 rounded bg-muted">
                      {getFileIcon(file)}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium truncate">{file.file instanceof File ? file.file.name : file.file.name}</span>
                      <span className="text-xs text-muted-foreground">{formatBytes(file.file instanceof File ? file.file.size : file.file.size)}</span>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8 text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(file.id);
                    }}
                  >
                    <XIcon className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Click to upload overlay if empty, or just general area functionality */}
        {files.length === 0 && (
          <div
            className="absolute inset-0 cursor-pointer"
            onClick={openFileDialog}
          />
        )}

        {/* Footer area inside the dropzone */}
        <div className="w-full flex items-center justify-between mt-auto pt-4 border-t border-transparent z-10">
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="xs" className="bg-background">
                  {selectedModel} <ChevronDown className="ml-2 size-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSelectedModel("Local (Free)")}>
                  Local (Free)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedModel("Cloud (Best Quality)")}>
                  Cloud (Best Quality)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* File count or other info could go here */}
            {files.length > 0 && (
              <Button variant="outline" size="xs" onClick={openFileDialog}>
                <UploadIcon className="mr-2 size-3" />
                Add more
              </Button>
            )}
          </div>

          <div className="flex items-center gap-4">
            <Button
              size="icon"
              className="rounded-full size-8"
              onClick={onSubmit}
              disabled={files.length === 0}
            >
              <ArrowUpIcon className="size-4" />
            </Button>
          </div>
        </div>

      </div>

      {errors.length > 0 && (
        <div
          className="flex items-center gap-1 text-destructive text-xs"
          role="alert"
        >
          <span>{errors[0]}</span>
        </div>
      )}
    </div>
  );
}
