import {
  ArrowRight,
  MicrophoneIcon,
  PaperPlaneTilt,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import LogoMark from "@/assets/images/logo.svg?react";
import mountainBg from "@/assets/images/mountain-bg.png";
import appScreenshot from "@/assets/images/app.png";
import type { ImageMetadata } from "astro";

const mountain = mountainBg as ImageMetadata;
const app = appScreenshot as ImageMetadata;

export default function ProductIntro() {
  return (
    <section className="container mt-8 md:mt-12">
      <h2 className="max-w-6xl text-balance text-2xl font-medium leading-relaxed tracking-tight text-muted-foreground md:text-3xl">
        Luma is a Mac app that removes{" "}
        <span className="text-amber-200">background noise</span> and harshness
        from your recordings - no cloud uploads,
        <span className="text-amber-200">
          no subscriptions<span className="text-muted-foreground">,</span>
        </span>
        100% private. Your voice stays yours.
      </h2>

      <div className="mt-8 grid gap-4 md:grid-cols-2 md:gap-5">
        <Card className="relative isolate min-h-70 md:col-span-2 md:min-h-90 justify-end p-0">
          <img
            src={mountain.src}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-80"
            loading="lazy"
            decoding="async"
          />
          <CardContent className="px-0">
            <div className="relative z-10 flex h-full items-end px-6 pb-6 md:px-8 md:pb-8 bg-linear-to-t from-black to-transparent pt-40">
              <div className="max-w-2xl space-y-3">
                <p className="text-xs uppercase tracking-[0.22em] text-amber-200/80">
                  Local Intelligence
                </p>
                <p className="text-lg font-medium text-amber-50 md:text-2xl">
                  Studio-grade vocals — on your machine, not in the cloud.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 md:min-h-56">
          <CardHeader className="space-y-3 pb-2">
            <CardTitle className="text-2xl ">
              A workflow for creators
            </CardTitle>
            <CardDescription className="max-w-md ">
              Useful for podcasters, YouTubers, and founders who want clean voice
              recordings without spending hours in post.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button size="sm">
              <a href="#waitlist">Get early access</a>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-0 bg-accent p-3 md:min-h-56">
          <CardContent className="grid h-full gap-3 p-0 sm:grid-cols-2">
            <Card>
              <CardContent className="flex h-full flex-col gap-3 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-foreground">
                  Luma targets
                </p>
                <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground marker:text-muted-foreground">
                  <li>Fans, HVAC, hum</li>
                  <li>Cars, distant traffic</li>
                  <li>Construction, crowd chatter</li>
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex h-full flex-col gap-3 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-foreground">
                  What improves
                </p>
                <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground marker:text-muted-foreground">
                  <li>Cleaner quiet gaps</li>
                  <li>Easier leveling, compression</li>
                  <li>Voice stands out clearer</li>
                </ul>
              </CardContent>
            </Card>
          </CardContent>
        </Card>

        <Card className="border-0 bg-accent h-full min-h-0">
          <CardContent className="flex h-full min-h-0 items-center justify-center p-0">
            <img
              src={app.src}
              width={app.width}
              height={app.height}
              alt="Luma interface preview"
              className="w-full rounded-xl object-contain object-top max-h-72"
              loading="lazy"
              decoding="async"
            />
          </CardContent>
        </Card>

        <Card className="border-border/80 h-full min-h-0">
          <CardHeader className="space-y-3">
            <CardTitle className="text-2xl">
              Record → Edit → Publish
            </CardTitle>
            <CardDescription>
              Luma makes it super easy to get a pro-level sound by simplifying
              your workflow.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col justify-center">
            <div
              role="img"
              aria-label="Recording flows through Luma to send"
              className="flex w-full flex-wrap items-center justify-center gap-3 text-card-foreground md:gap-5"
            >
              <MicrophoneIcon className="size-10 shrink-0" aria-hidden />
              <ArrowRight
                className="size-5 shrink-0 text-muted-foreground"
                aria-hidden
                weight="bold"
              />
              <LogoMark className="h-10 w-auto shrink-0" aria-hidden />
              <ArrowRight
                className="size-5 shrink-0 text-muted-foreground"
                aria-hidden
                weight="bold"
              />
              <PaperPlaneTilt className="size-10 shrink-0" aria-hidden />
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
