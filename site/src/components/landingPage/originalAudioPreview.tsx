import * as React from "react";
import { Play } from "@phosphor-icons/react";
import HandDrawnArrowUpRight from "@/assets/images/hand-drawn-arrow-up-right.svg?react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export type OriginalAudioPreviewProps = {
  originalSrc: string;
  enhancedSrc: string;
  /** When false, playback is paused (e.g. another tab owns the demo surface). */
  isActiveTab?: boolean;
};

export default function OriginalAudioPreview({
  originalSrc,
  enhancedSrc,
  isActiveTab = true,
}: OriginalAudioPreviewProps) {
  const originalAudioSwitchId = React.useId();
  const [originalAudio, setOriginalAudio] = React.useState(true);
  const [playing, setPlaying] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const playingRef = React.useRef(playing);
  const resumePlaybackRef = React.useRef(false);

  const src = originalAudio ? originalSrc : enhancedSrc;

  playingRef.current = playing;

  React.useEffect(() => {
    if (isActiveTab) return;
    const el = videoRef.current;
    if (!el) return;
    el.pause();
    setPlaying(false);
  }, [isActiveTab]);

  React.useLayoutEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    el.currentTime = 0;

    if (resumePlaybackRef.current) {
      resumePlaybackRef.current = false;
      void el.play().catch(() => setPlaying(false));
      return;
    }

    el.pause();
    setPlaying(false);
  }, [originalAudio, originalSrc, enhancedSrc]);

  const handleOriginalAudioChange = (checked: boolean) => {
    resumePlaybackRef.current = playingRef.current;
    setOriginalAudio(!checked);
  };

  const handlePause = () => {
    if (resumePlaybackRef.current) return;
    setPlaying(false);
  };

  const togglePlayback = React.useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      void el.play().catch(() => { });
    } else {
      el.pause();
    }
  }, []);

  return (
    <div className="flex w-full flex-col items-center gap-10 ">
      <div
        className={cn(
          "relative w-full max-w-[min(320px,88vw)] overflow-hidden border",
          "aspect-9/16 bg-background/50"
        )}
      >
        <video
          ref={videoRef}
          key={`${src}`}
          className="size-full cursor-pointer object-cover"
          src={src}
          playsInline
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={handlePause}
          onClick={togglePlayback}
        />

        {!playing ? (
          <button
            type="button"
            className="absolute left-1/2 top-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-black shadow-lg transition hover:bg-white focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:outline-none"
            aria-label="Play video"
            onClick={togglePlayback}
          >
            <Play weight="fill" className="ml-0.5 size-7" aria-hidden />
          </button>
        ) : null}
      </div>

      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-center relative">
        <div className="flex items-center gap-3">
          <Switch
            id={originalAudioSwitchId}
            checked={!originalAudio}
            onCheckedChange={handleOriginalAudioChange}
          />
          <Label
            htmlFor={originalAudioSwitchId}
            className="text-sm font-medium tracking-[0.2em] text-foreground uppercase"
          >
            {!originalAudio ? "Enhanced audio" : "Original audio"}
          </Label>
        </div>

        <div className="flex flex-col items-center sm:items-start sm:pt-1 absolute top-full left-6 -mt-6 pointer-events-none">
          <HandDrawnArrowUpRight className="h-18 text-muted-foreground -rotate-120" />
          <span className="ml-16 -mt-8 text-sm italic text-muted-foreground ">
            Click me
          </span>
        </div>
      </div>
    </div>
  );
}
