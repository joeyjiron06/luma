import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ_ITEMS = [
  {
    value: "item-1",
    question: "Does Luma require an internet connection to work?",
    answer:
      "Not at all. Once downloaded, Luma processes everything 100% offline. This ensures you can clean your audio anywhere—from a plane to a remote cabin—without worrying about data limits or connectivity.",
  },
  {
    value: "item-2",
    question:
      'How does this differ from "Voice Isolation" built into meeting apps?',
    answer:
      'Standard meeting apps use "aggressive gating" which often cuts off the ends of your words or makes you sound robotic. Luma uses high-fidelity AI models that surgically remove noise while protecting the natural texture and "warmth" of your actual voice.',
  },
  {
    value: "item-3",
    question: "Is my data safe and private?",
    answer:
      "Absolutely. Unlike cloud-based competitors, Luma never uploads your files to a server. Your recordings stay on your hard drive, making it the ideal choice for podcasters with sensitive interviews or professionals handling confidential data.",
  },
  {
    value: "item-4",
    question: "Why a one-time fee instead of a subscription?",
    answer:
      'We believe you should own your tools, not rent them. We know creators are tired of "subscription fatigue," so we offer a straightforward lifetime license. Buy it once, use it forever, with no monthly caps.',
  },
  {
    value: "item-5",
    question: "Will it make my voice sound like a robot?",
    answer:
      "This is exactly why we built Luma. Our \"Natural Preservation\" algorithm is specifically tuned to avoid the \"underwater\" artifacts found in tools like Adobe Enhance or Descript. If it doesn't sound like you, we haven't done our job.",
  },
  {
    value: "item-6",
    question: "Does it only work with microphones, or can it fix video files too?",
    answer:
      "Luma is format-agnostic. You can drop in audio files (WAV, MP3, etc.) or video files (MP4, MOV). It will extract the audio, clean it, and allow you to export the polished vocals instantly.",
  },
  {
    value: "item-7",
    question: "What kind of Mac do I need to run this?",
    answer:
      "Luma is optimized for Apple Silicon (M1, M2, M3 chips) to take full advantage of the Apple Neural Engine. While it runs on Intel-based Macs, you'll experience the fastest, \"near-instant\" processing on M-series hardware.",
  },
  {
    value: "item-8",
    question: "Is it difficult to learn how to use?",
    answer:
      "If you can drag and drop a file, you've already mastered Luma. We've stripped away the hundreds of confusing knobs found in pro-suites like iZotope RX, giving you a simple \"one-click\" interface that delivers the same elite results.",
  },
  {
    value: "item-9",
    question: "What if the tool doesn't work for my specific noise issue?",
    answer:
      "We stand by our technology. Luma is effective against everything from air conditioners and traffic to barking dogs. If it doesn't significantly improve your audio quality, we offer a 30-day money-back guarantee.",
  },
];



export default function LandingFaq() {
  return (
    <section className="py-16 md:py-24" aria-labelledby="faq-heading">
      <div className="container max-w-3xl">
        <h2
          id="faq-heading"
          className="mb-10 text-center text-balance scroll-m-20 text-3xl font-semibold tracking-tight"
        >
          Frequently asked questions
        </h2>

        <Accordion type="single" collapsible className="w-full">
          {FAQ_ITEMS.map(({ value, question, answer }) => (
            <AccordionItem key={value} value={value}>
              <AccordionTrigger>{question}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

      </div>
    </section>
  );
}
