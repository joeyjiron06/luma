import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import Grainient from "@/components/ui/grainient";
import AnimatedWordList from "../animatedWordList";
import WaitlistForm from "../waitlistForm";
import appScreenshot from "@/assets/images/app.png";
import type { ImageMetadata } from "astro";

const app = appScreenshot as ImageMetadata;

export default function Hero() {
  return (
    <div className="container">
      <Card className="relative isolate gap-0 overflow-hidden py-0 contain-paint min-h-150 max-h-900px h-[70vh]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
        >
          <Grainient
            className="absolute inset-0 h-full w-full"
            color1="#09090b"
            color2="#d9f99d"
            color3="#f97316"
            timeSpeed={0.62}
            colorBalance={0.12}
            warpStrength={1.2}
            warpFrequency={1.35}
            warpSpeed={1.25}
            warpAmplitude={44}
            blendAngle={32}
            blendSoftness={0.08}
            rotationAmount={460}
            noiseScale={1.35}
            grainAmount={0.5}
            grainScale={2.65}
            grainAnimated={false}
            contrast={1.48}
            gamma={0.98}
            saturation={1.1}
            centerX={0.16}
            centerY={-0.06}
            zoom={0.86}
          />
        </div>
        <div className="pointer-events-none absolute inset-0 z-10 bg-background/60">
        </div>

        <CardContent className="relative z-20 px-6 py-12 md:px-10 md:py-16 ">
          <div id="waitlist" className="max-w-2xl scroll-mt-8">
            <Badge variant="outline" className="mb-6">
              <span className="relative flex h-2 w-2 mr-2">
                <span
                  className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"
                >
                </span>
                <span
                  className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"
                >
                </span>
              </span>
              Waitlist Now Open
            </Badge>
            <h1 className="mb-4 text-4xl font-semibold tracking-tight md:text-6xl [word-spacing:-0.3ch]">
              Sound like a pro. Remove noise from any{' '}
              <AnimatedWordList
                items={[
                  { label: "Podcast", className: "text-violet-500" },
                  { label: "Video", className: "text-green-500" },
                  { label: "Audio", className: "text-blue-500" },
                ]}
              />
              .
            </h1>
            <WaitlistForm />
          </div>

          <div className="relative mt-12 overflow-hidden lg:absolute lg:left-[40%] lg:top-75 lg:mt-0 lg:w-[min(64vw,1100px)]">
            <img
              src={app.src}
              width={app.width}
              height={app.height}
              alt="Luma app interface on macOS"
              className="h-auto w-full object-cover object-top lg:scale-75"
              loading="lazy"
              decoding="async"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
