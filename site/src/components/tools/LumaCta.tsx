import {
  Card,
  CardContent,
} from "@/components/ui/card";
import LogoMark from "@/assets/images/logo.svg?react";
import FlickeringGrid from "@/components/ui/flickeringGrid";
import { Button } from "@/components/ui/button";

export default function LumaCta() {
  return (
    <section
      className="mt-12 relative"
      aria-labelledby="luma-cta-heading"
    >
      <Card className="relative isolate gap-0 overflow-hidden rounded-none border border-white/15 bg-black py-0 text-white shadow-none ring-0">
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          aria-hidden
        >
          <LogoMark className="absolute bottom-[-10%] left-[-18%] size-40 md:bottom-[-6%] md:left-[-8%] md:size-60 opacity-10" />
          <LogoMark className="absolute top-[-8%] right-[-14%] size-40 md:right-[-6%] md:top-[-4%] md:size-60 opacity-10" />
        </div>

        <FlickeringGrid
          className="absolute inset-0 z-0 size-full opacity-60"
          squareSize={3}
          gridGap={2}
          color="#616269"
          maxOpacity={0.45}
          flickerChance={0.08}
        />

        <CardContent className="relative z-10 flex flex-col items-center gap-6 px-6 py-10 text-center md:gap-8 md:px-10 md:py-14">
          <div className="mx-auto max-w-md space-y-3 md:space-y-4">
            <h2
              id="luma-cta-heading"
              className="text-balance text-2xl font-semibold tracking-tight md:text-3xl"
            >
              Need studio-quality audio?
            </h2>
            <p className="text-balance text-sm leading-relaxed text-muted-foreground md:text-base">
              Luma removes background noise and turns rough recordings into clean,
              professional audio.
            </p>
          </div>

          <Button asChild variant="shiny" size="lg">
            <a href="/#demo">Try the demo</a>
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
