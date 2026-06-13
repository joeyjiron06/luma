import type { AudioFormat } from "@/lib/ffmpeg";

export type AudioConverterPageConfig = {
  slug: string;
  defaultFormat: AudioFormat;
  title: string;
  description: string;
  h1: string;
  subtitle: string;
  ogUrl: string;
  jsonLdName: string;
};
