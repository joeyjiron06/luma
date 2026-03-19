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
  FolderSearchIcon,
  // AudioLinesIcon,
  Settings2Icon,
  InfoIcon
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
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useMemo, useRef, useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { open } from "@tauri-apps/plugin-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Slider } from "./ui/slider";

const ffmpegExportFormats = [
  { value: "same-as-input", text: "Same as input" },
  { value: "wav", text: "Wav" },
  { value: "mp3", text: "Mp3" },
  { value: "aac", text: "Aac" },
  { value: "m4a", text: "M4a" },
  { value: "flac", text: "Flac" },
  { value: "ogg", text: "Ogg" },
  { value: "aiff", text: "Aiff" },
] as const;

const bitrates = [
  { value: 'same-as-input', text: 'Same as input', subtext: 'Keep the same, no conversion' },
  { value: '32kb', text: '32 kbps', subtext: 'Low quality, for voice' },
  { value: '64kbps', text: '64 kbps', subtext: 'Low quality, voice or low-bandwidth' },
  { value: '96kbps', text: '96 kbps', subtext: 'Low quality, low-bandwidth music' },
  { value: '128kbps', text: '128 kbps', subtext: 'Standard MP3 quality' },
  { value: '160kbps', text: '160 kbps', subtext: 'Medium quality, streaming' },
  { value: '192kbps', text: '192 kbps', subtext: 'Medium to high quality' },
  { value: '224kbps', text: '224 kbps', subtext: 'High quality streaming' },
  { value: '256kbps', text: '256 kbps', subtext: 'High quality iTunes' },
  { value: '320kbps', text: '320 kbps', subtext: 'Very high quality, near CD' },

]

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
  onPlayFile: (file: { id: string; src: string; fileName: string }) => void;
  activeAudioId?: string | null;
}

export default function Component({
  className,
  state,
  actions,
  onSubmit,
  onPlayFile,
  activeAudioId,
}: FileUploadProps) {
  const {
    files,
    isDragging,
    errors,
    format,
    outputFolder,
    bitrate,
    attenuationLimit,
    selectedModel,
  } = state;
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
    setBitrate,
    setAttenuationLimit,
    setSelectedModel,
  } = actions;

  const [fileDurations, setFileDurations] = useState<Record<string, string>>({});
  const selectedModelLabel = useMemo(() => {
    if (selectedModel === "demucs") {
      return "Demucs";
    }
    return "Deep Filter Net 3";
  }, [selectedModel]);

  const requestedDurationIdsRef = useRef<Set<string>>(new Set());
  const selectedExportFormat = ffmpegExportFormats.find(
    (item) => item.value === format
  );

  const outputFolderName = useMemo(() => {

    if (outputFolder === "same-as-input") {
      return "Same as input";
    }

    const parts = outputFolder.split("/");

    return parts[parts.length - 1];
  }, [outputFolder])
  // const normalizedAttenuation = Math.min(100, Math.max(0, attenuationLimit));
  // const knobRotation = -135 + (normalizedAttenuation / 100) * 270;

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

  const handleSelectFileForPlayback = (file: (typeof files)[number]) => {
    const fileType = file.file instanceof File ? file.file.type : file.file.type;
    const isMediaFile = fileType.includes("audio/") || fileType.includes("video/");
    if (!isMediaFile || !file.preview) {
      return;
    }

    onPlayFile({
      id: file.id,
      src: file.preview,
      fileName: file.file instanceof File ? file.file.name : file.file.name,
    });
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        className="relative flex min-h-40 max-w-3xl mx-auto w-full flex-col items-center justify-center rounded-xl border border-input px-3 py-3 transition-colors has-[input:focus]:border-ring has-[input:focus]:ring-[3px] has-[input:focus]:ring-ring/50 data-[dragging=true]:bg-accent/50 grow  gap-2 bg-muted/10"
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
          <button className="flex flex-col items-center justify-center text-center gap-2 rounded-xl w-full h-full grow bg-muted/30 cursor-pointer"
            onClick={openFileDialog}>
            <p className="font-medium text-sm text-muted-foreground">Drop files or click here to upload
            </p>
          </button>
        ) : (
          <div className="w-full flex flex-col gap-4 z-10">
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-40 overflow-y-auto">
              {files.map((file) => (
                <div
                  key={file.id}
                  className={cn(
                    "flex items-center justify-between gap-3 p-2 rounded-md bg-background/50 border border-border/50 min-w-0 cursor-pointer transition-colors hover:bg-background/70",
                    activeAudioId === file.id && "border-primary/70 bg-background/80"
                  )}
                  onClick={() => handleSelectFileForPlayback(file)}
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


        {/* Footer area inside the dropzone */}
        <div className="w-full flex  justify-between z-10 self-end grow items-end">
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="xs" className="bg-background select-none" title="Model">
                  {selectedModelLabel} <ChevronDown className="ml-2 size-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSelectedModel("deep-filter-net-3")}>
                  Deep Filter Net 3
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedModel("demucs")}>
                  Demucs
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="xs" onClick={openFileDialog} aria-label="Add media files" title="Add media files">
                <UploadIcon className="size-3" />
              </Button>

              <Popover>
                <PopoverTrigger>
                  <Button variant="outline" size="icon-xs" aria-label="Audio settings" title="Audio settings">
                    <Settings2Icon />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <h4 className="leading-none font-medium">Audio settings</h4>
                      <p className="text-sm text-muted-foreground">
                        Set the settings for the audio.
                      </p>
                    </div>
                    <div className="grid gap-2">
                      <div className="grid grid-cols-3 items-center gap-4">
                        <Label htmlFor="width">Format</Label>
                        <Select value={format} onValueChange={setFormat}>
                          <SelectTrigger className="col-span-2 w-full" size="sm">
                            <SelectValue placeholder="Select format" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {ffmpegExportFormats.map((format) => (
                                <SelectItem key={format.value} value={format.value}>
                                  {format.text}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-3 items-center gap-4">
                        <Label htmlFor="maxWidth">Bitrate</Label>
                        <Select value={bitrate} onValueChange={setBitrate}>
                          <SelectTrigger className="col-span-2 w-full **:data-[slot=subtext]:hidden" size="sm">
                            <SelectValue placeholder="Select bitrate" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {bitrates.map((bitrate) => (
                                <SelectItem key={bitrate.value} value={bitrate.value}>
                                  <span className="flex flex-col items-start">
                                    {bitrate.text}
                                    <span className="text-xs text-muted-foreground" data-slot="subtext">
                                      {bitrate.subtext}
                                    </span>
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-3 items-center gap-4">
                        <Label htmlFor="height">Location</Label>
                        <DropdownMenu>
                          <DropdownMenuTrigger className="w-full col-span-2" asChild>
                            <Button variant="outline" size="sm" className="select-none w-full justify-between px-5 font-normal" title="Location">
                              <span className="ml-0.5">
                                {outputFolderName}
                              </span>
                              <ChevronDown className="size-4 opacity-30 mr-0.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuRadioGroup value={outputFolder} onValueChange={setOutputFolder}>
                              <DropdownMenuRadioItem value="same-as-input">Same as input</DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>

                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleBrowseOutputFolder}>
                              <FolderSearchIcon className="size-3" /> Select folder...
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="grid grid-cols-3 items-center gap-4 py-2">
                        <Label htmlFor="maxHeight" className={cn("flex items-center gap-1", selectedModel === "demucs" && "opacity-50")}>Mix
                          <Tooltip>
                            <TooltipTrigger>
                              <InfoIcon className="size-3" />
                            </TooltipTrigger>
                            <TooltipContent>
                              {selectedModel === "demucs"
                                ? "Attenuation limit is only available for the Deep Filter Net 3 model."
                                : <>How aggressive the noise reduction should be.<br /> 100% will attempt to remove all noise, 0% will leave the noise intact.</>
                              }
                            </TooltipContent>
                          </Tooltip>

                        </Label>

                        <div className="flex items-center gap-2 col-span-2">

                          <Slider value={[attenuationLimit]} onValueChange={([value]) => setAttenuationLimit(value)}
                            min={0} max={100} step={1} className="grow" disabled={selectedModel === "demucs"} />

                          <span className={cn("text-xs text-muted-foreground w-8 text-right", selectedModel === "demucs" && "opacity-50")}>{attenuationLimit}%</span>
                        </div>

                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {format !== "same-as-input" && (
                <Badge variant="secondary" className="bg-primary text-primary-foreground">
                  {selectedExportFormat?.text ?? "Wav"}
                </Badge>
              )}
            </div>
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
