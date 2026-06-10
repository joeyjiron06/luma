import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

const faqItems = [
  {
    question: "What is WAV format?",
    answer:
      "WAV (Waveform Audio File Format) is an uncompressed, lossless audio format. It preserves the full quality of the original audio and is widely compatible with all major audio editors, DAWs, and media players.",
  },
  {
    question: "Is my file uploaded to a server?",
    answer:
      "No. Everything runs entirely in your browser using WebAssembly. Your files never leave your device — there's no server upload, no account required, and nothing is stored.",
  },
  {
    question: "What's the difference between standard and high quality?",
    answer:
      "Standard quality outputs 16-bit audio at 44.1 kHz (CD quality). High quality outputs 24-bit audio at 48 kHz, which provides more dynamic range and is preferred for professional audio editing and production.",
  },
  {
    question: "What file formats are supported?",
    answer:
      "You can convert MP4, MOV, MKV, AVI, and WebM video files, as well as M4A, AAC, OGG, FLAC, and MP3 audio files. The tool extracts the audio track and converts it to WAV.",
  },
  {
    question: "Is there a file size limit?",
    answer:
      "Yes, the maximum file size is 2 GB. For larger files, we recommend using desktop FFmpeg directly.",
  },
  {
    question: "How long does conversion take?",
    answer:
      "It depends on the file size and your device's processing power. A 100 MB file typically converts in under 30 seconds on a modern computer.",
  },
];

export default function Mp4ToWavFaq() {
  return (
    <section className="mt-16">
      <h2 className="text-lg font-semibold tracking-tight mb-4">
        Frequently asked questions.
      </h2>
      <Accordion type="single" collapsible>
        {faqItems.map((item, i) => (
          <AccordionItem key={i} value={`faq-${i}`}>
            <AccordionTrigger>{item.question}</AccordionTrigger>
            <AccordionContent>{item.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
