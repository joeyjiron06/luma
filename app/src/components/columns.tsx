"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import {
  DownloadIcon,
  Trash2Icon,
  Loader2,
  MusicIcon
} from "lucide-react"

export interface ProcessedFile {
  id: string;
  file: File;
  status: "queued" | "processing" | "completed" | "error";
  originalName: string;
  outputUrl?: string;
  outputName?: string;
  format?: "wav";
  durationSec?: number;
  error?: string;
  timestamp: number;
}

interface ColumnsProps {
  handleRemoveItem: (id: string) => void;
  handleDownloadItem: (id: string) => void;
}

export const getColumns = ({
  handleRemoveItem,
  handleDownloadItem,
}: ColumnsProps): ColumnDef<ProcessedFile>[] => [
  {
    accessorKey: "originalName",
    header: "Name",
    cell: ({ row }) => {
      const item = row.original;
      return (
        <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-8 rounded bg-muted/50 shrink-0">
                {item.status === 'processing' ? (
                    <Loader2 className="size-4 animate-spin text-primary" />
                ) : item.status === 'error' ? (
                    <div className="size-2 rounded-full bg-destructive" />
                ) : (
                    <MusicIcon className="size-4 opacity-50" />
                )}
            </div>
            <div className="flex flex-col min-w-0">
                <span className="font-medium truncate">{item.originalName}</span>
                {item.status === 'processing' && <span className="text-xs text-muted-foreground">Processing...</span>}
                {item.status === 'error' && <span className="text-xs text-destructive">{item.error || 'Error'}</span>}
                {item.status === 'queued' && <span className="text-xs text-muted-foreground">Queued</span>}
                {item.status === 'completed' && <span className="text-xs text-muted-foreground">Processed</span>}
            </div>
        </div>
      )
    },
  },
  {
    accessorKey: "duration",
    header: "Duration",
    cell: ({ row }) => {
      const duration = row.original.durationSec;
      if (duration == null) {
        return <span className="text-muted-foreground">--</span>;
      }
      const minutes = Math.floor(duration / 60);
      const seconds = Math.floor(duration % 60)
        .toString()
        .padStart(2, "0");
      return <span className="text-muted-foreground">{minutes}:{seconds}</span>;
    },
  },
  {
    accessorKey: "format",
    header: "Format",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.format ?? "--"}</span>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const item = row.original
      return (
        <div className="flex items-center justify-end gap-2">
            {item.status === 'completed' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  title="Download"
                  onClick={() => handleDownloadItem(item.id)}
                >
                    <DownloadIcon className="size-4" />
                </Button>
            )}
            <Button
                variant="ghost"
                size="icon"
                className="size-8 hover:text-destructive"
                onClick={() => handleRemoveItem(item.id)}
                title="Remove"
            >
                <Trash2Icon className="size-4" />
            </Button>
        </div>
      )
    },
  },
]
