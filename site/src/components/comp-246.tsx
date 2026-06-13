import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";

export const SAMPLE_RATES_HZ = [
  8000, 11025, 16000, 22050, 32000, 44100, 48000, 88200, 96000,
] as const;

export type SampleRateHz = (typeof SAMPLE_RATES_HZ)[number];

function formatKhz(hz: number): string {
  const khz = hz / 1000;
  return Number.isInteger(khz) ? String(khz) : String(khz);
}

interface SampleRateSliderProps {
  value: number;
  onValueChange: (index: number) => void;
  disabled?: boolean;
}

export function SampleRateSlider({
  value,
  onValueChange,
  disabled = false,
}: SampleRateSliderProps) {
  const max = SAMPLE_RATES_HZ.length - 1;

  return (
    <div>
      <Slider
        aria-label="Sample rate"
        value={[value]}
        max={max}
        step={1}
        disabled={disabled}
        onValueChange={([index]) => onValueChange(index)}
      />
      <span
        aria-hidden="true"
        className="mt-3 flex w-full items-center justify-between gap-1 px-2.5 font-medium text-muted-foreground text-xs"
      >
        {SAMPLE_RATES_HZ.map((hz, i) => (
          <span
            className="flex w-0 flex-col items-center justify-center gap-2"
            key={hz}
          >
            <span className="h-1 w-px bg-muted-foreground/70" />
            <span className={cn(value !== i && "opacity-60")}>
              {formatKhz(hz)} kHz
            </span>
          </span>
        ))}
      </span>
    </div>
  );
}

export default function Component() {
  return (
    <SampleRateSlider value={5} onValueChange={() => {}} />
  );
}
