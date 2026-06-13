import { useState, useCallback } from "react";
import { Gear } from "@phosphor-icons/react";
import { FileUpload } from "@/components/ui/file-upload";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import {
  SAMPLE_RATES_HZ,
  SampleRateSlider,
} from "@/components/comp-246";
import { VolumeSlider } from "@/components/comp-252";
import { cn } from "@/lib/utils";
import {
  AUDIO_FORMATS,
  convertToAudio,
  type AudioFormat,
} from "@/lib/ffmpeg";

type State = "idle" | "fileSelected" | "loading" | "converting";
type Channels = "mono" | "stereo";

function getStem(filename: string): string {
  const idx = filename.lastIndexOf(".");
  return idx >= 0 ? filename.slice(0, idx) : filename;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function Mp4ToWavConverter() {
  const [state, setState] = useState<State>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<AudioFormat>("wav");
  const [showSettings, setShowSettings] = useState(false);
  const [channels, setChannels] = useState<Channels>("stereo");
  const [bitrate, setBitrate] = useState(128);
  const [volume, setVolume] = useState(128);
  const [sampleRateIndex, setSampleRateIndex] = useState(
    SAMPLE_RATES_HZ.indexOf(44100),
  );
  const [errorMessage, setErrorMessage] = useState("");

  const isBusy = state === "loading" || state === "converting";

  const handleFileSelected = useCallback((f: File) => {
    setFile(f);
    setState("fileSelected");
    setErrorMessage("");
  }, []);

  const handleFileRemoved = useCallback(() => {
    setFile(null);
    setState("idle");
    setErrorMessage("");
  }, []);

  const handleConvert = useCallback(async () => {
    if (!file || isBusy) return;

    try {
      setState("loading");
      setErrorMessage("");

      const blob = await convertToAudio(
        file,
        format,
        {
          channels: channels === "mono" ? 1 : 2,
          sampleRate: SAMPLE_RATES_HZ[sampleRateIndex],
          bitrate,
          volume,
        },
        () => {
          setState("converting");
        },
      );

      downloadBlob(blob, `${getStem(file.name)}.${format}`);
      setState("fileSelected");
    } catch (err) {
      console.error("[mp4-to-wav] conversion error:", err);
      setErrorMessage(
        err instanceof Error ? err.message : "Conversion failed. Please try again.",
      );
      setState("fileSelected");
    }
  }, [file, format, channels, sampleRateIndex, bitrate, volume, isBusy]);

  return (
    <div className="space-y-6">
      <FileUpload
        onFileSelected={handleFileSelected}
        onFileRemoved={handleFileRemoved}
        disabled={isBusy}
      />

      <Card>
        <CardContent>
          <Field>
            <div className="flex w-full items-center justify-between">
              <FieldLabel>Format</FieldLabel>
              <Button
                variant="ghost"
                size="sm"
                disabled={isBusy}
                onClick={() => setShowSettings((open) => !open)}
              >
                <Gear />
                Settings
              </Button>
            </div>
            <ButtonGroup className="w-full flex-wrap">
              {AUDIO_FORMATS.map((f) => (
                <Button
                  key={f.value}
                  variant={format === f.value ? "default" : "outline"}
                  size="sm"
                  disabled={isBusy}
                  onClick={() => setFormat(f.value)}
                >
                  {f.label}
                </Button>
              ))}
            </ButtonGroup>
            {showSettings && (
              <div className="flex flex-col gap-6 pt-2">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field className="sm:col-start-1 sm:row-start-1 sm:row-span-2">
                    <FieldLabel>Channels</FieldLabel>
                    <RadioGroup
                      value={channels}
                      disabled={isBusy}
                      onValueChange={(value) =>
                        setChannels(value as Channels)
                      }
                    >
                      <FieldLabel htmlFor="channels-mono">
                        <Field orientation="horizontal">
                          <FieldContent>
                            <FieldTitle>Mono</FieldTitle>
                            <FieldDescription>
                              Left and right sound the same
                            </FieldDescription>
                          </FieldContent>
                          <RadioGroupItem value="mono" id="channels-mono" />
                        </Field>
                      </FieldLabel>
                      <FieldLabel htmlFor="channels-stereo">
                        <Field orientation="horizontal">
                          <FieldContent>
                            <FieldTitle>Stereo</FieldTitle>
                            <FieldDescription>
                              Left and right are separate
                            </FieldDescription>
                          </FieldContent>
                          <RadioGroupItem value="stereo" id="channels-stereo" />
                        </Field>
                      </FieldLabel>
                    </RadioGroup>
                  </Field>
                  <Field
                    className="sm:col-start-2 sm:row-start-1"
                    id="settings-grid-top-right"
                    data-settings-slot="top-right"
                  >
                    <FieldLabel htmlFor="bitrate">Bitrate</FieldLabel>
                    <Input
                      id="bitrate"
                      type="number"
                      value={bitrate}
                      disabled={isBusy}
                      onChange={(e) => setBitrate(Number(e.target.value))}
                    />
                  </Field>
                  <Field
                    className="sm:col-start-2 sm:row-start-2"
                    id="settings-grid-bottom-right"
                    data-settings-slot="bottom-right"
                  >
                    <VolumeSlider
                      value={volume}
                      onValueChange={setVolume}
                      min={0}
                      max={300}
                      disabled={isBusy}
                    />
                  </Field>
                </div>
                <Field>
                  <FieldLabel>Sample rate</FieldLabel>
                  <SampleRateSlider
                    value={sampleRateIndex}
                    onValueChange={setSampleRateIndex}
                    disabled={isBusy}
                  />
                </Field>
              </div>
            )}
          </Field>
        </CardContent>
      </Card>

      {errorMessage && (
        <p className="text-sm text-destructive">{errorMessage}</p>
      )}

      <Button
        onClick={handleConvert}
        disabled={!file || isBusy}
        className="relative h-10 w-full"
      >
        <span
          className={cn(
            "transition-opacity duration-200",
            isBusy && "opacity-0",
          )}
        >
          Convert to {format.toUpperCase()}
        </span>
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center transition-opacity duration-200",
            !isBusy && "opacity-0",
          )}
        >
          <Spinner />
        </span>
      </Button>
    </div>
  );
}
