import { useCallback, useRef, useState } from "react";

export interface FileWithPreview {
  file: File;
  id: string;
  preview?: string;
}

export interface FileUploadError {
  message: string;
  file?: File;
}

interface UseFileUploadOptions {
  maxSize?: number;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  onFilesChange?: (files: FileWithPreview[]) => void;
}

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const { maxSize, accept, multiple = false, maxFiles = 1, onFilesChange } = options;
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<FileUploadError[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCountRef = useRef(0);

  const acceptedTypes = accept?.split(",").map((t) => t.trim()) ?? [];

  function validateFile(file: File): string | null {
    if (maxSize && file.size > maxSize) {
      return `File "${file.name}" exceeds maximum size of ${formatBytes(maxSize)}`;
    }
    if (acceptedTypes.length > 0) {
      const matchesType = acceptedTypes.some((type) => {
        if (type.startsWith(".")) {
          return file.name.toLowerCase().endsWith(type.toLowerCase());
        }
        if (type.endsWith("/*")) {
          return file.type.startsWith(type.slice(0, -1));
        }
        return file.type === type;
      });
      if (!matchesType) {
        return `File "${file.name}" has an unsupported format`;
      }
    }
    return null;
  }

  const processFiles = useCallback(
    (incoming: File[]) => {
      const newErrors: FileUploadError[] = [];
      const valid: FileWithPreview[] = [];

      for (const file of incoming) {
        const error = validateFile(file);
        if (error) {
          newErrors.push({ message: error, file });
        } else {
          valid.push({ file, id: crypto.randomUUID() });
        }
      }

      const limit = multiple ? maxFiles : 1;
      const accepted = valid.slice(0, limit);

      setErrors(newErrors);
      setFiles(accepted);
      onFilesChange?.(accepted);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [maxSize, accept, multiple, maxFiles],
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCountRef.current += 1;
    if (dragCountRef.current === 1) setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCountRef.current -= 1;
    if (dragCountRef.current === 0) setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCountRef.current = 0;
      setIsDragging(false);
      const droppedFiles = Array.from(e.dataTransfer.files);
      if (droppedFiles.length > 0) processFiles(droppedFiles);
    },
    [processFiles],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files ?? []);
      if (selectedFiles.length > 0) processFiles(selectedFiles);
      if (inputRef.current) inputRef.current.value = "";
    },
    [processFiles],
  );

  const openFileDialog = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const removeFile = useCallback(
    (id: string) => {
      setFiles((prev) => {
        const next = prev.filter((f) => f.id !== id);
        onFilesChange?.(next);
        return next;
      });
    },
    [onFilesChange],
  );

  const clearFiles = useCallback(() => {
    setFiles([]);
    setErrors([]);
    onFilesChange?.([]);
  }, [onFilesChange]);

  const getInputProps = useCallback(
    () => ({
      ref: inputRef,
      type: "file" as const,
      accept,
      multiple,
      onChange: handleFileChange,
      className: "sr-only",
    }),
    [accept, multiple, handleFileChange],
  );

  return {
    files,
    isDragging,
    errors,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleFileChange,
    openFileDialog,
    removeFile,
    clearFiles,
    getInputProps,
  };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
