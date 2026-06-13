import { SpeakerHigh, SpeakerSlash } from "@phosphor-icons/react";

import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface VolumeSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
  disabled?: boolean;
}

export function VolumeSlider({
  value,
  onValueChange,
  min = 0,
  max = 100,
  label = "Volume",
  disabled = false,
}: VolumeSliderProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label className="leading-6">{label}</Label>
        <output className="font-medium text-sm tabular-nums">{value}</output>
      </div>
      <div className="flex items-center gap-2">
        <SpeakerSlash
          aria-hidden="true"
          className="shrink-0 opacity-60"
          size={16}
        />
        <Slider
          aria-label={`${label} slider`}
          min={min}
          max={max}
          step={1}
          disabled={disabled}
          onValueChange={([next]) => onValueChange(next)}
          value={[value]}
        />
        <SpeakerHigh
          aria-hidden="true"
          className="shrink-0 opacity-60"
          size={16}
        />
      </div>
    </div>
  );
}

export default function Component() {
  return <VolumeSlider value={25} onValueChange={() => {}} />;
}
