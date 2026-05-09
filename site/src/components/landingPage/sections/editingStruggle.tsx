import { ThumbsDownIcon } from "@phosphor-icons/react";
import { Card, CardContent } from "@/components/ui/card";
import HandDrawnArrowDownIcon from "@/assets/images/hand-drawn-arrow-down.svg?react";

export default function EditingStruggle() {
  return (
    <section
      className="mt-8 md:mt-12  "
      aria-labelledby="editing-struggle-heading"
    >
      <div className="container py-16 md:py-24">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-start lg:gap-16">
          <div className="space-y-8 text-left">
            <div className="space-y-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-200/90">
                The editing struggle
              </p>
              <h2
                id="editing-struggle-heading"
                className="text-balance text-3xl font-semibold leading-snug tracking-tight text-foreground md:text-4xl lg:text-[2.35rem] lg:leading-tight"
              >
                “You finish recording. It felt great. Then you play it back.”
              </h2>
              <p className="text-lg font-medium text-foreground">
                Now you&apos;re stuck.
              </p>
            </div>

            <div className="space-y-4 text-base leading-relaxed text-muted-foreground md:text-lg">
              <p>
                You don&apos;t have time to{" "}
                <strong className="font-semibold text-foreground">
                  re-record
                </strong>
                .
              </p>
              <p>
                So you try to{" "}
                <strong className="font-semibold text-foreground">fix it</strong>
                .
              </p>
              <p>
                What should take{" "}
                <strong className="font-semibold text-foreground">minutes</strong>{" "}
                takes{" "}
                <strong className="font-semibold text-foreground">hours</strong>
                .
              </p>
              <p>
                Content gets{" "}
                <strong className="font-semibold text-foreground">delayed</strong>
                . Momentum{" "}
                <strong className="font-semibold text-foreground">slows</strong>
                .
              </p>
              <p>
                You don&apos;t need better{" "}
                <strong className="font-semibold text-foreground">gear</strong>.
              </p>
              <p>
                Or a{" "}
                <strong className="font-semibold text-foreground">
                  perfect room
                </strong>
                .
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4 lg:pt-1">
            <ul className="flex flex-col gap-4" role="list">
              <li>
                <Card>
                  <CardContent>
                    <div className="flex gap-4">
                      <span
                        className="mt-0.5 shrink-0 text-amber-200"
                        aria-hidden="true"
                      >
                        <ThumbsDownIcon size={22} />
                      </span>
                      <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
                        <span className="font-medium text-amber-200">Fan</span>{" "}
                        noise
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </li>
              <li>
                <Card>
                  <CardContent>
                    <div className="flex gap-4">
                      <span
                        className="mt-0.5 shrink-0 text-amber-200"
                        aria-hidden="true"
                      >
                        <ThumbsDownIcon size={22} />
                      </span>
                      <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
                        Passing{" "}
                        <span className="font-medium text-amber-200">cars</span>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </li>
              <li>
                <Card>
                  <CardContent>
                    <div className="flex gap-4">
                      <span
                        className="mt-0.5 shrink-0 text-amber-200"
                        aria-hidden="true"
                      >
                        <ThumbsDownIcon size={22} />
                      </span>
                      <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
                        Background{" "}
                        <span className="font-medium text-amber-200">
                          chatter
                        </span>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </li>
              <li>
                <Card>
                  <CardContent>
                    <div className="flex gap-4">
                      <span
                        className="mt-0.5 shrink-0 text-amber-200"
                        aria-hidden="true"
                      >
                        <ThumbsDownIcon size={22} />
                      </span>
                      <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
                        <span className="font-medium text-amber-200">Hours</span>{" "}
                        spent editing one file
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </li>
              <li>
                <Card>
                  <CardContent>
                    <div className="flex gap-4">
                      <span
                        className="mt-0.5 shrink-0 text-amber-200"
                        aria-hidden="true"
                      >
                        <ThumbsDownIcon size={22} />
                      </span>
                      <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
                        Your voice turns{" "}
                        <span className="font-medium text-amber-200">
                          robotic
                        </span>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </li>
              <li>
                <Card>
                  <CardContent>
                    <div className="flex gap-4">
                      <span
                        className="mt-0.5 shrink-0 text-amber-200"
                        aria-hidden="true"
                      >
                        <ThumbsDownIcon size={22} />
                      </span>
                      <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
                        The{" "}
                        <span className="font-medium text-amber-200">noise</span>{" "}
                        still isn&apos;t gone
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </li>
            </ul>

            <div className="mt-2 flex flex-col items-end gap-2 pr-1 text-foreground">

              <p className="max-w-48 text-right text-sm font-medium italic leading-snug text-muted-foreground">
                Let&apos;s fix it!
              </p>
              <HandDrawnArrowDownIcon className="text-foreground/80 h-20 fill-current rotate-90" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
