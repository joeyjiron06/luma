import { useEffect, useRef } from "react";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import type { DragDropEvent } from "@tauri-apps/api/webview";
import {
  type FileWithSourcePath,
  filesFromPaths,
  filterMediaPaths,
} from "@/lib/native-files";

type UseTauriDragDropOptions = {
  onDrop: (entries: FileWithSourcePath[]) => void | Promise<void>;
  onDraggingChange: (isDragging: boolean) => void;
};

export function useTauriDragDrop({
  onDrop,
  onDraggingChange,
}: UseTauriDragDropOptions): void {
  const onDropRef = useRef(onDrop);
  const onDraggingChangeRef = useRef(onDraggingChange);

  onDropRef.current = onDrop;
  onDraggingChangeRef.current = onDraggingChange;

  useEffect(() => {
    let cancelled = false;
    let unlisten: (() => void) | undefined;

    void getCurrentWebview()
      .onDragDropEvent(async (event) => {
        const payload: DragDropEvent = event.payload;

        switch (payload.type) {
          case "enter":
            onDraggingChangeRef.current(true);
            break;
          case "leave":
            onDraggingChangeRef.current(false);
            break;
          case "drop": {
            onDraggingChangeRef.current(false);
            const mediaPaths = filterMediaPaths(payload.paths);
            if (mediaPaths.length === 0) {
              return;
            }

            const entries = await filesFromPaths(mediaPaths);
            await onDropRef.current(entries);
            break;
          }
          case "over":
            break;
        }
      })
      .then((fn) => {
        if (cancelled) {
          fn();
          return;
        }
        unlisten = fn;
      });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);
}
