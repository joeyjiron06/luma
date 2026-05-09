import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import LogoMark from "@/assets/images/logo.svg?react";
import WaitlistForm from "@/components/landingPage/waitlistForm";
import FlickeringGrid from "@/components/ui/flickeringGrid";

export default function CTA() {
  return (
    <section
      className="bg-background py-16 md:py-24 relative"
      aria-labelledby="sound-like-pro-heading"
    >

      <div className="container max-w-4xl lg:max-w-5xl">
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

          <CardContent className="relative z-10 flex flex-col items-center gap-10 px-6 py-14 md:gap-12 md:px-14 md:py-20">
            <div className="mx-auto max-w-xl space-y-5 text-center md:space-y-6">
              <h2
                id="sound-like-pro-heading"
                className="text-balance text-4xl font-semibold tracking-tight md:text-5xl"
              >
                Be the first to know when we launch
              </h2>
              <p className="text-balance text-sm leading-relaxed text-muted-foreground md:text-base">
                Be the first to experience studio-quality sound without the monthly
                bill. Join our exclusive waitlist to get early access to Luma and a
                special &quot;Early Adopter&quot; discount on your lifetime license.
              </p>
            </div>

            <div className="grid w-full max-w-4xl grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
              <Card className="h-full gap-0 py-5">
                <CardHeader className="space-y-2 text-left">
                  <CardTitle>Founding Cohort</CardTitle>
                  <CardDescription>
                    First 10 receive the deepest onboarding and founding pricing
                    terms.
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card className="h-full gap-0 py-5">
                <CardHeader className="space-y-2 text-left">
                  <CardTitle>Next 50</CardTitle>
                  <CardDescription>
                    Receive an exclusive early-adopter discount.
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card className="h-full gap-0 py-5">
                <CardHeader className="space-y-2 text-left">
                  <CardTitle>Waitlist</CardTitle>
                  <CardDescription>
                    Priority access and founding pricing.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>

            <WaitlistForm
              submitLabel="Claim My Early Access"
              hideSubmitArrow={false}
            />
          </CardContent>
        </Card>      </div>
    </section>
  );
}
