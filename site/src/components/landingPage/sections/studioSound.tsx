import {
  MicrophoneIcon,
  MusicNotesIcon,
  SpeakerHifiIcon,
  VideoCameraIcon,
} from "@phosphor-icons/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import SoundWaveIcon from "@/assets/images/sound-wave.svg?react";

export default function StudioSound() {
  return (
    <section
      className="studio-sound-section py-16  md:py-24 "
      aria-labelledby="studio-sound-heading"
    >
      <div className="container">
        <h2
          id="studio-sound-heading"
          className="mx-auto mb-12 max-w-3xl scroll-m-20 text-center text-balance text-3xl font-medium md:text-4xl  transition-colors first:mt-0 md:mb-16"
        >
          Make your audio sound great
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
          <Card className="flex h-full flex-col">
            <CardHeader className="space-y-3">
              <CardTitle>Record anywhere</CardTitle>
              <CardDescription>
                Record in your bedroom, on your phone—or both. Let your guest
                call in on Bluetooth, from the airport, walking their dog—or all
                three. Studio Sound frees you from the need to capture perfect
                audio in the perfect space.
              </CardDescription>
            </CardHeader>
            <CardContent
              className="mt-auto flex min-h-28 items-center justify-center text-muted-foreground"
              aria-hidden="true"
            >
              <MicrophoneIcon className="size-10" aria-hidden />
            </CardContent>
          </Card>

          <Card className="flex h-full flex-col">
            <CardHeader className="space-y-3">
              <CardTitle>One-click noise reduction</CardTitle>
              <CardDescription>
                Silence your neighbor&apos;s leaf blower. A simple toggle—with a
                little regenerative AI—makes it sound like you recorded in a
                quiet, sound-proof studio without sonic intrusions.
              </CardDescription>
            </CardHeader>
            <CardContent
              className="mt-auto flex min-h-28 items-center justify-center text-muted-foreground"
              aria-hidden="true"
            >
              <SpeakerHifiIcon className="size-11" aria-hidden />
            </CardContent>
          </Card>

          <Card className="col-span-1 md:col-span-2">
            <div className="grid gap-8 md:grid-cols-2 md:items-stretch md:gap-10">
              <CardHeader className="space-y-3">
                <CardTitle>Fix any audio or video</CardTitle>
                <CardDescription>
                  Record in your bedroom, on your phone—or both. Let your guest
                  call in on Bluetooth, from the airport, walking their dog—or
                  all three. Studio Sound frees you from the need to capture
                  perfect audio in the perfect space.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div
                  className="relative min-h-[200px] overflow-hidden rounded md:min-h-[220px]"
                  aria-hidden="true"
                >
                  <div className="absolute inset-0 opacity-50">
                    <SoundWaveIcon className="size-full stroke-muted-foreground" />
                  </div>
                  <div className="studio-sound-wave-foreground absolute inset-0">
                    <SoundWaveIcon className="size-full stroke-foreground" />
                  </div>
                  <div className="studio-sound-wave-divider absolute inset-y-0 z-10 w-px bg-white">
                  </div>
                  <div className="absolute right-3 top-0.5 flex flex-col items-center gap-2 -rotate-3">
                    <div className="flex size-14 items-center justify-center rounded border bg-background text-muted-foreground/60">
                      <VideoCameraIcon className="size-6" aria-hidden />
                    </div>
                    <div className="border border-white/25 bg-black/40 px-2 py-0.5 text-[10px] text-white">
                      recording.mp4
                    </div>
                  </div>

                  <div className="absolute bottom-12 left-3 flex gap-2 flex-col items-center -rotate-4">
                    <div className=" size-14 flex items-center justify-center rounded border bg-background text-muted-foreground/60">
                      <MusicNotesIcon className="size-6" aria-hidden />
                    </div>
                    <div className="border border-white/25 bg-black/40 px-2 py-0.5 text-[10px] text-white">
                      me_take3.wav
                    </div>
                  </div>

                  <div className="absolute bottom-6 right-3 flex flex-col items-center gap-2 rotate-5">
                    <div className="flex size-14 items-center justify-center rounded border bg-background text-muted-foreground/60">
                      <MusicNotesIcon className="size-6" aria-hidden />
                    </div>
                    <div className="border border-white/25 bg-black/40 px-2 py-0.5 text-[10px] text-white">
                      interview.m4a
                    </div>
                  </div>
                </div>
              </CardContent>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
