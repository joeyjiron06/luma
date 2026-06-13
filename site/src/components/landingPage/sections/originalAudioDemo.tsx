import * as React from "react";
import noisyFanOriginal from "@/assets/video/me.webm";
import noisyFanEnhanced from "@/assets/video/me_enhanced.webm";
import trafficOriginal from "@/assets/video/traffic.webm";
import trafficEnhanced from "@/assets/video/traffic_enhanced.webm";
import OriginalAudioPreview from "../originalAudioPreview";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export type LandingAudioDemo = {
  value: string;
  label: string;
  originalSrc: string;
  enhancedSrc: string;
};

/**
 * Default noise demos shown on the landing page. Override via {@link OriginalAudioDemoProps.demos}.
 * Swap `reports` entries once `reports.webm` / `reports_enhanced.webm` exist in `assets/video`.
 */
export const DEFAULT_AUDIO_DEMOS: LandingAudioDemo[] = [
  {
    value: "fan",
    label: "Noisy Fan",
    originalSrc: noisyFanOriginal,
    enhancedSrc: noisyFanEnhanced,
  },
  {
    value: "traffic",
    label: "Traffic",
    originalSrc: trafficOriginal,
    enhancedSrc: trafficEnhanced,
  },
  // {
  //   value: "reports",
  //   label: "Reports",
  //   originalSrc: noisyFanOriginal,
  //   enhancedSrc: noisyFanEnhanced,
  // },
];

export type OriginalAudioDemoProps = {
  demos?: LandingAudioDemo[];
};

export default function OriginalAudioDemo({
  demos = DEFAULT_AUDIO_DEMOS,
}: OriginalAudioDemoProps = {}) {
  const demoList = demos.length > 0 ? demos : DEFAULT_AUDIO_DEMOS;
  const [activeDemo, setActiveDemo] = React.useState(demoList[0]?.value ?? "fan");

  return (
    <section id="demo" className="scroll-mt-8 pb-16 text-foreground md:pb-24">
      <div className="container">
        <Tabs
          value={activeDemo}
          onValueChange={setActiveDemo}
          className="flex flex-col items-center gap-6"
        >
          <TabsList>
            {demoList.map((d) => (
              <TabsTrigger key={d.value} value={d.value}>
                {d.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {demoList.map((d) => (
            <TabsContent key={d.value} value={d.value} className="w-full">
              <OriginalAudioPreview
                originalSrc={d.originalSrc}
                enhancedSrc={d.enhancedSrc}
                isActiveTab={activeDemo === d.value}
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
}
