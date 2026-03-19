"use client";

import { PauseIcon, PlayIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { StandaloneDeepFilter } from "deepfilter-standalone";
import "./audioPlayer.css";

type AudioPlayerProps = {
  src: string;
  fileName: string;
  playRequestId: number;
  attenuationLimit: number;
  className?: string;
};

const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }

  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
};

export function AudioPlayer({
  src,
  fileName,
  playRequestId,
  attenuationLimit,
  className,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const denoiserRef = useRef<StandaloneDeepFilter | null>(null);
  const denoiserInitPromiseRef = useRef<Promise<StandaloneDeepFilter> | null>(null);
  const outputQueueRef = useRef<Float32Array[]>([]);
  const outputQueueOffsetRef = useRef(0);
  const isStreamingStartedRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const normalizedAttenuation = Math.min(100, Math.max(0, attenuationLimit));
  const attenuationRef = useRef(normalizedAttenuation);
  const DEEPFILTER_CDN_URL = import.meta.env.DEV
    ? "/deepfilter-local"
    : "/models/deepfilter-standalone";

  const safeDuration = useMemo(
    () => (Number.isFinite(duration) && duration > 0 ? duration : 0),
    [duration]
  );

  const clearOutputQueue = useCallback(() => {
    outputQueueRef.current = [];
    outputQueueOffsetRef.current = 0;
  }, []);

  const enqueueOutputSamples = useCallback((samples: Float32Array) => {
    if (samples.length > 0) {
      outputQueueRef.current.push(samples);
    }
  }, []);

  const dequeueOutputSamples = useCallback((length: number): Float32Array => {
    const out = new Float32Array(length);
    let writePos = 0;

    while (writePos < length && outputQueueRef.current.length > 0) {
      const chunk = outputQueueRef.current[0];
      const offset = outputQueueOffsetRef.current;
      const available = chunk.length - offset;
      const needed = length - writePos;
      const take = Math.min(available, needed);

      out.set(chunk.subarray(offset, offset + take), writePos);
      writePos += take;
      outputQueueOffsetRef.current += take;

      if (outputQueueOffsetRef.current >= chunk.length) {
        outputQueueRef.current.shift();
        outputQueueOffsetRef.current = 0;
      }
    }

    return out;
  }, []);

  const ensureDenoiser = useCallback(async (): Promise<StandaloneDeepFilter> => {
    if (denoiserRef.current) {
      return denoiserRef.current;
    }
    if (!denoiserInitPromiseRef.current) {
      denoiserInitPromiseRef.current = (async () => {
        const denoiser = new StandaloneDeepFilter({
          cdnUrl: DEEPFILTER_CDN_URL,
          attenuationLimit: attenuationRef.current,
        });
        await denoiser.initialize();
        denoiserRef.current = denoiser;
        return denoiser;
      })();
    }
    return denoiserInitPromiseRef.current;
  }, [DEEPFILTER_CDN_URL]);

  const startStreamingSession = useCallback(() => {
    const denoiser = denoiserRef.current;
    if (!denoiser) return;
    denoiser.startStreaming();
    denoiser.setAttenuationLimit(attenuationRef.current);
    clearOutputQueue();
    isStreamingStartedRef.current = true;
  }, [clearOutputQueue]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || typeof window === "undefined") return;

    const context = new AudioContext();
    let sourceNode: MediaElementAudioSourceNode | MediaStreamAudioSourceNode | null = null;
    const streamAudio = audio as HTMLAudioElement & {
      captureStream?: () => MediaStream;
      mozCaptureStream?: () => MediaStream;
    };
    const captureStreamFn = streamAudio.captureStream ?? streamAudio.mozCaptureStream;

    if (typeof captureStreamFn === "function") {
      const stream = captureStreamFn.call(audio);
      sourceNode = context.createMediaStreamSource(stream);
    } else {
      try {
        sourceNode = context.createMediaElementSource(audio);
      } catch (error) {
        console.error("Failed to create media element source node:", error);
        void context.close();
        return;
      }
    }
    const scriptProcessor = context.createScriptProcessor(2048, 2, 2);
    audio.muted = true;

    scriptProcessor.onaudioprocess = (event) => {
      const output = event.outputBuffer;
      const leftOut = output.getChannelData(0);
      const rightOut =
        output.numberOfChannels > 1 ? output.getChannelData(1) : output.getChannelData(0);

      const denoiser = denoiserRef.current;
      if (!denoiser || !isStreamingStartedRef.current) {
        const passthroughLeft = event.inputBuffer.getChannelData(0);
        const passthroughRight =
          event.inputBuffer.numberOfChannels > 1
            ? event.inputBuffer.getChannelData(1)
            : passthroughLeft;
        leftOut.set(passthroughLeft);
        rightOut.set(passthroughRight);
        return;
      }

      const frameLength = event.inputBuffer.length;
      const monoInput = new Float32Array(frameLength);
      const inLeft = event.inputBuffer.getChannelData(0);
      const inRight =
        event.inputBuffer.numberOfChannels > 1 ? event.inputBuffer.getChannelData(1) : inLeft;
      for (let i = 0; i < frameLength; i += 1) {
        monoInput[i] = (inLeft[i] + inRight[i]) * 0.5;
      }

      const processed = denoiser.processStreaming(monoInput);
      enqueueOutputSamples(processed);
      const monoOut = dequeueOutputSamples(frameLength);
      leftOut.set(monoOut);
      rightOut.set(monoOut);
    };

    sourceNode.connect(scriptProcessor);
    scriptProcessor.connect(context.destination);

    audioContextRef.current = context;
    void ensureDenoiser().then(() => {
      startStreamingSession();
    });

    return () => {
      scriptProcessor.disconnect();
      sourceNode?.disconnect();
      audioContextRef.current = null;
      isStreamingStartedRef.current = false;
      const denoiser = denoiserRef.current;
      if (denoiser) {
        if (denoiser.isStreamingMode()) {
          denoiser.stopStreaming();
        }
        denoiser.destroy();
      }
      denoiserRef.current = null;
      denoiserInitPromiseRef.current = null;
      void context.close();
    };
  }, [
    clearOutputQueue,
    dequeueOutputSamples,
    enqueueOutputSamples,
    ensureDenoiser,
    startStreamingSession,
  ]);

  useEffect(() => {
    attenuationRef.current = normalizedAttenuation;
    const denoiser = denoiserRef.current;
    if (!denoiser) return;
    denoiser.setAttenuationLimit(normalizedAttenuation);
  }, [normalizedAttenuation]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = 0;
    setCurrentTime(0);
    clearOutputQueue();
    if (audioContextRef.current?.state === "suspended") {
      void audioContextRef.current.resume();
    }
    void ensureDenoiser().then(() => {
      startStreamingSession();
      const playPromise = audio.play();
      if (playPromise) {
        void playPromise.catch(() => {
          setIsPlaying(false);
        });
      }
    });
  }, [clearOutputQueue, ensureDenoiser, playRequestId, src, startStreamingSession]);

  const resetStreamingForSeek = () => {
    clearOutputQueue();
    if (denoiserRef.current) {
      denoiserRef.current.startStreaming();
      denoiserRef.current.setAttenuationLimit(attenuationRef.current);
      isStreamingStartedRef.current = true;
    }
  };

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      if (audioContextRef.current?.state === "suspended") {
        void audioContextRef.current.resume();
      }
      void ensureDenoiser().then(() => {
        if (!isStreamingStartedRef.current) {
          startStreamingSession();
        }
        const playPromise = audio.play();
        if (playPromise) {
          void playPromise.catch(() => {
            setIsPlaying(false);
          });
        }
      });
      return;
    }

    audio.pause();
  };

  const seekTo = (nextTime: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    resetStreamingForSeek();
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  return (
    <div
      className={cn(
        "border border-border px-3 py-2 max-w-2xl mx-auto mb-4 rounded-lg",
        className
      )}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => {
          setIsPlaying(false);
        }}
        onEnded={() => {
          setIsPlaying(false);
          clearOutputQueue();
          const denoiser = denoiserRef.current;
          if (denoiser && denoiser.isStreamingMode()) {
            denoiser.stopStreaming();
            isStreamingStartedRef.current = false;
          }
        }}
        onLoadedMetadata={(event) => {
          setDuration(event.currentTarget.duration);
        }}
        onTimeUpdate={(event) => {
          setDuration(event.currentTarget.duration);
          setCurrentTime(event.currentTarget.currentTime);
        }}
      />

      <div className="flex items-center gap-3">
        <Button
          type="button"
          size="xs"
          variant="ghost"
          // className="size-8 rounded-full"
          onClick={togglePlayback}
          aria-label={isPlaying ? "Pause audio" : "Play audio"}
        >
          {isPlaying ? <PauseIcon className="size-4" /> : <PlayIcon className="size-4" />}
        </Button>

        <div className="min-w-0 grow">
          <div className="flex items-center gap-2">
            <span className="w-9 text-[10px] text-muted-foreground">{formatTime(currentTime)}</span>
            <span className="w-full relative">
              <input
                type="range"
                min={0}
                max={safeDuration || 0}
                step={0.0001}
                // value={Math.min(currentTime, safeDuration || 0)}
                value={currentTime}
                onChange={(event) => seekTo(Number(event.target.value))}
                className="cursor-pointer player-slider absolute inset-0"
                aria-label="Seek audio position"
              />

              <input
                type="range"
                min={0}
                max={safeDuration || 0}
                step={0.0001}
                value={currentTime}
                className="pointer-events-none player-thumb absolute inset-0"
                aria-hidden="true"
              />
            </span>

            <span className="w-9 text-right text-[10px] text-muted-foreground">{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
