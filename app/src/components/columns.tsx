"use client"

import { ColumnDef } from "@tanstack/react-table"
import {
  Loader2,
  MusicIcon
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip"

export interface ProcessedFile {
  id: string;
  file: File;
  status: "queued" | "processing" | "completed" | "error";
  originalName: string;
  outputName?: string;
  outputPath?: string;
  format?: string;
  durationSec?: number;
  error?: string;
  timestamp: number;
}

export const getColumns = (): ColumnDef<ProcessedFile>[] => [
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
            {item.status === 'processing' && <span className="text-xs text-foreground/60 shimmer" >Processing...</span>}
            {item.status === 'error' && <span className="text-xs text-destructive">{item.error || 'Error'}</span>}
            {item.status === 'queued' && <span className="text-xs text-muted-foreground">Queued</span>}
            {item.status === 'completed' && <span className="text-xs text-muted-foreground">Processed</span>}
          </div>
        </div >
      )
    },
  },
  {
    accessorKey: "durationSec",
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
    header: "Output Format",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.format ?? "--"}</span>
    ),
  },
  {
    accessorKey: "outputName",
    header: "Output File",
    cell: ({ row }) => {
      const item = row.original
      if (!item.outputName) {
        return <span className="text-muted-foreground">--</span>
      }
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-block max-w-60 truncate cursor-default text-muted-foreground">
              {item.outputName}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {item.outputPath ?? item.outputName}
          </TooltipContent>
        </Tooltip>
      )
    },
  },
]
