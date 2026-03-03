import { AudioReader, AudioWriter, RingBuffer } from "@/services/audio/ringbuffer";

interface WorkletProcessorOptions {
  processorOptions?: {
    rawSab?: SharedArrayBuffer;
    denoisedSab?: SharedArrayBuffer;
  };
}

declare abstract class AudioWorkletProcessor {
  readonly port: MessagePort;
  constructor(options?: unknown);
  abstract process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean;
}

declare function registerProcessor(
  name: string,
  processorCtor: new (options?: WorkletProcessorOptions) => AudioWorkletProcessor
): void;

class Dfn3AudioProcessor extends AudioWorkletProcessor {
  private readonly frameSize = 128;
  private readonly rawWriter: AudioWriter;
  private readonly denoisedReader: AudioReader;
  private readonly readBuffer = new Float32Array(this.frameSize);

  constructor(options?: WorkletProcessorOptions) {
    super();
    const rawSab = options?.processorOptions?.rawSab;
    const denoisedSab = options?.processorOptions?.denoisedSab;
    if (!rawSab || !denoisedSab) {
      throw new Error("Missing rawSab or denoisedSab in processorOptions.");
    }

    this.rawWriter = new AudioWriter(new RingBuffer(rawSab, Float32Array));
    this.denoisedReader = new AudioReader(new RingBuffer(denoisedSab, Float32Array));
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const inputChannel = inputs[0]?.[0];
    const outputChannel = outputs[0]?.[0];
    if (!outputChannel) {
      return true;
    }

    if (inputChannel) {
      this.rawWriter.enqueue(inputChannel);
    } else {
      outputChannel.fill(0);
      return true;
    }

    if (this.denoisedReader.availableRead() >= this.frameSize) {
      const read = this.denoisedReader.dequeue(this.readBuffer);
      if (read === this.frameSize) {
        outputChannel.set(this.readBuffer);
      } else {
        outputChannel.set(inputChannel);
      }
    } else {
      outputChannel.set(inputChannel);
    }

    for (let channel = 1; channel < outputs[0].length; channel += 1) {
      outputs[0][channel].set(outputChannel);
    }

    return true;
  }
}

registerProcessor("dfn3-audio-processor", Dfn3AudioProcessor);
