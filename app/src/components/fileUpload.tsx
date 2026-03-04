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
  SettingsIcon,
  FolderSearchIcon,
  FolderIcon,
  AudioLinesIcon
} from "lucide-react";

import {
  type FileUploadState,
  type FileUploadActions,
} from "@/hooks/use-file-upload";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useRef, useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { open } from "@tauri-apps/plugin-dialog";

const ffmpegExportFormats = [
  { value: "same-as-input", text: "Same as input" },
  { value: "wav", text: "Wav" },
  { value: "mp3", text: "Mp3" },
  { value: "aac", text: "Aac" },
  { value: "m4a", text: "M4a" },
  { value: "flac", text: "Flac" },
  { value: "ogg", text: "Ogg" },
  { value: "aiff", text: "Aiff" },
];

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

const formatDuration = (durationInSeconds: number): string => {
  if (!Number.isFinite(durationInSeconds) || durationInSeconds < 0) {
    return "--:--";
  }

  const totalSeconds = Math.floor(durationInSeconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
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
  const { files, isDragging, errors, format, outputFolder } = state;
  const {
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    openFileDialog,
    removeFile,
    setFormat,
    setOutputFolder,
    getInputProps,
  } = actions;

  const [selectedModel, setSelectedModel] = useState("Deep Filter Net 3");
  const [fileDurations, setFileDurations] = useState<Record<string, string>>({});
  const requestedDurationIdsRef = useRef<Set<string>>(new Set());
  const selectedExportFormat = ffmpegExportFormats.find(
    (item) => item.value === format
  );

  const handleBrowseOutputFolder = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Choose output folder",
    });
    if (typeof selected === "string" && selected.length > 0) {
      setOutputFolder(selected);
    }
  };

  useEffect(() => {
    const activeFileIds = new Set(files.map((file) => file.id));
    setFileDurations((prev) =>
      Object.fromEntries(
        Object.entries(prev).filter(([id]) => activeFileIds.has(id))
      )
    );

    requestedDurationIdsRef.current = new Set(
      Array.from(requestedDurationIdsRef.current).filter((id) => activeFileIds.has(id))
    );

    files.forEach((file) => {
      const fileType = file.file instanceof File ? file.file.type : file.file.type;
      const isMediaFile = fileType.includes("audio/") || fileType.includes("video/");
      const src = file.preview;
      if (
        !isMediaFile ||
        !src ||
        requestedDurationIdsRef.current.has(file.id)
      ) {
        return;
      }

      requestedDurationIdsRef.current.add(file.id);
      setFileDurations((prev) => ({ ...prev, [file.id]: "--:--" }));

      const media = document.createElement(
        fileType.includes("video/") ? "video" : "audio"
      );
      media.preload = "metadata";

      const handleLoadedMetadata = () => {
        setFileDurations((prev) => ({
          ...prev,
          [file.id]: formatDuration(media.duration),
        }));
      };

      const handleError = () => {
        setFileDurations((prev) => ({ ...prev, [file.id]: "--:--" }));
      };

      media.addEventListener("loadedmetadata", handleLoadedMetadata);
      media.addEventListener("error", handleError);
      media.src = src;
    });
  }, [files]);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        className="relative flex min-h-40 flex-col items-center justify-center rounded-xl border border-input px-2 py-2 transition-colors has-[input:focus]:border-ring has-[input:focus]:ring-[3px] has-[input:focus]:ring-ring/50 data-[dragging=true]:bg-accent/50 grow bg-muted/30"
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
          <div className="flex flex-col items-center justify-center text-center gap-2 pointer-events-none rounded-xl w-full grow ">
            <div className="bg-muted rounded-full p-2">
              <AudioLinesIcon className="size-4 text-background" />
            </div>
            <p className="font-medium text-sm text-muted-foreground">Drop files here or click here to upload
            </p>
          </div>
        ) : (
          <div className="w-full flex flex-col gap-4 z-10">
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-40 overflow-y-auto">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between gap-3 p-2 rounded-md bg-background/50 border border-border/50 min-w-0"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="flex items-center justify-center size-8 rounded bg-muted">
                      {getFileIcon(file)}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium truncate">{file.file instanceof File ? file.file.name : file.file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {fileDurations[file.id] ?? "--:--"}
                      </span>
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
                <DropdownMenuLabel>Model</DropdownMenuLabel>

                <DropdownMenuItem onClick={() => setSelectedModel("Deep Filter Net 3")}>
                  Deep Filter Net 3
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedModel("Cloud (Best Quality)")}>
                  Cloud (Best Quality)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger>
                  <Button variant="outline" size="xs" onClick={openFileDialog} aria-label="Add media files">
                    <UploadIcon className="size-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Add media files
                </TooltipContent>
              </Tooltip>

              {format !== "same-as-input" && (
                <Badge variant="secondary" className="bg-primary text-primary-foreground">
                  {selectedExportFormat?.text ?? "Wav"}
                </Badge>
              )}
            </div>


          </div>

          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="xs" aria-label="Settings">
                  <SettingsIcon className="size-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>

                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Format</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
                    <DropdownMenuRadioGroup
                      value={format}
                      onValueChange={setFormat}
                    >
                      {ffmpegExportFormats.map((format) => (
                        <DropdownMenuRadioItem key={format.value} value={format.value}>
                          {format.text}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSub>
                  <DropdownMenuSubTrigger><FolderIcon className="size-3" /> Output folder</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuRadioGroup
                      value={outputFolder}
                      onValueChange={setOutputFolder}
                    >
                      <DropdownMenuRadioItem value="same-as-input">
                        Same as input
                      </DropdownMenuRadioItem>
                      {outputFolder !== "same-as-input" && (
                        <DropdownMenuRadioItem value={outputFolder}>
                          {outputFolder}
                        </DropdownMenuRadioItem>
                      )}
                    </DropdownMenuRadioGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleBrowseOutputFolder}>
                      <FolderSearchIcon className="size-3" /> Browse...
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

              </DropdownMenuContent>
            </DropdownMenu>

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
