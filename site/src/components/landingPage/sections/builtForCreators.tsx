import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CurrencyDollarSimple as DollarIcon,
  Lock as LockIcon,
} from "@phosphor-icons/react";
import FlickeringGrid from "@/components/ui/flickeringGrid";
import storyImage from "@/assets/images/story.png";
import creator01 from "@/assets/images/creator01.png";
import creator02 from "@/assets/images/creator02.png";
import creator03 from "@/assets/images/creator03.png";
import creator04 from "@/assets/images/creator04.png";
import creator05 from "@/assets/images/creator05.png";
import creator07 from "@/assets/images/creator07.png";
import creator08 from "@/assets/images/creator08.png";
import creator09 from "@/assets/images/creator09.png";
import type { ImageMetadata } from "astro";

import { cn } from "@/lib/utils";

const story = storyImage as ImageMetadata;

const CREATOR_CARD_IMAGES: ImageMetadata[] = [
  creator01,
  creator02,
  creator03,
  creator04,
  creator05,
  creator07,
  creator08,
  creator09,
].map((m) => m as ImageMetadata);

const CREATOR_FRAME_LAYOUT = [
  "top-[6%] left-[2%] -rotate-6 md:top-[8%] md:left-[3%] h-18 w-12 md:h-28 md:w-[5.5rem] ",
  "top-[32%] left-[1%] rotate-3  hidden md:block md:top-[34%] ",
  "top-[58%] left-[3%] -rotate-5  h-18 w-12  md:h-28 md:w-[5.5rem]  md:top-[62%] md:left-[4%]",
  "top-[46%] left-[18%] rotate-4 hidden xl:block sm:left-[20%]  md:top-[48%] md:left-[22%] ",
  "top-[7%] right-[2%] rotate-8  h-18 w-12  md:h-28 md:w-[5.5rem] md:top-[9%] md:right-[3%]",
  "top-[34%] right-[1%] -rotate-4  hidden md:block md:top-[36%]",
  "top-[60%] right-[3%] rotate-6 h-18 w-12  md:h-28 md:w-[5.5rem]  md:top-[64%] md:right-[4%]",
  "top-[48%] right-[16%] -rotate-5 hidden xl:block sm:right-[18%] md:top-[50%] md:right-[22%]",
] as const;

function CreatorPolaroidFrame({
  image,
  layoutClassName,
}: {
  image: ImageMetadata;
  layoutClassName: string;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute z-[1]  overflow-hidden rounded-none bg-muted/40 shadow-md border border-border h-28 w-[5.5rem] ",
        layoutClassName,
      )}
      aria-hidden="true"
    >
      <img
        src={image.src}
        width={image.width}
        height={image.height}
        alt=""
        className="size-full rounded-none object-cover"
        loading="lazy"
        decoding="async"
      />
    </div>
  );
}

export default function BuiltForCreators() {
  return (
    <section
      id="built-for-creators"
      className="mt-8 py-16 md:mt-12 md:py-24"
      aria-labelledby="markdown-features-heading"
    >
      <div className="container space-y-6">
        <Card className="relative isolate min-h-[min(70vh,560px)] overflow-hidden p-0 md:min-h-[600px]">
          <img
            src={story.src}
            width={story.width}
            height={story.height}
            alt=""
            className="absolute inset-0 size-full rounded-none object-cover object-center -z-10 opacity-30"
            loading="lazy"
            decoding="async"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-gradient-to-b from-background/40 via-background/70 to-background"
          >
          </div>

          <CardContent className="relative z-10 flex min-h-[min(70vh,560px)] items-center justify-center px-4 py-14 md:min-h-[600px] md:px-8 md:py-20">
            {CREATOR_CARD_IMAGES.map((image, i) => (
              <CreatorPolaroidFrame
                key={image.src}
                image={image}
                layoutClassName={CREATOR_FRAME_LAYOUT[i]!}
              />
            ))}

            <div className="relative z-20 mx-auto max-w-3xl text-center">
              <p className="mb-2 text-xs font-semibold tracking-[0.22em] text-amber-200/90 uppercase">
                Publish-ready vocals
              </p>
              <h2
                id="markdown-features-heading"
                className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl"
              >
                Built for creators.
              </h2>
              <p className="mt-4 text-base leading-loose text-muted-foreground">
                Luma removes background noise in seconds. <br />
                Right on your device.
                <br />
                Ready to publish.
              </p>
              <nav
                className="mt-8 flex flex-wrap items-center justify-center gap-2 text-sm"
                aria-label="Audience modes"
              >
                <span className="text-muted-foreground">Record</span>
                <span className="text-muted-foreground" aria-hidden="true">
                  →
                </span>
                <span className="font-medium text-foreground">Edit</span>
                <span className="text-muted-foreground" aria-hidden="true">
                  →
                </span>
                <span className="text-muted-foreground">Publish</span>
              </nav>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
          <Card className="flex h-full flex-col">
            <CardHeader className="space-y-3">
              <CardTitle>Private, Fast, and Fully On Your Device</CardTitle>
              <CardDescription>
                All processing happens locally on your computer, giving you
                instant results, unlimited usage, and complete control over your
                files.
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto pb-6">
              <div
                className="relative flex aspect-[16/11] min-h-44 w-full items-center justify-center overflow-hidden bg-accent/35 ring-1 ring-border/60 md:min-h-52"
                aria-hidden="true"
              >
                <FlickeringGrid
                  className="absolute inset-0 z-0 size-full opacity-80"
                  squareSize={3}
                  gridGap={2}
                  color="#616269"
                  maxOpacity={0.45}
                  flickerChance={0.08}
                />
                <LockIcon
                  className="relative z-10 size-16 shrink-0 text-foreground md:size-20"
                  aria-hidden
                />
              </div>
            </CardContent>
          </Card>

          <Card className="flex h-full flex-col">
            <CardHeader className="space-y-3">
              <CardTitle>Pay Once, Use It Forever</CardTitle>
              <CardDescription>
                No subscriptions, no recurring fees—just a single purchase that
                gives you lifetime access to Luma with unlimited usage on your
                own device.
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto pb-6">
              <div
                className="relative flex aspect-[16/11] min-h-44 w-full items-center justify-center overflow-hidden bg-accent/35 ring-1 ring-border/60 md:min-h-52"
                aria-hidden="true"
              >
                <FlickeringGrid
                  className="absolute inset-0 z-0 size-full opacity-80"
                  squareSize={3}
                  gridGap={2}
                  color="#616269"
                  maxOpacity={0.45}
                  flickerChance={0.08}
                />
                <DollarIcon
                  className="relative z-10 size-16 shrink-0 text-foreground md:size-20"
                  aria-hidden
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
