import * as ort from "onnxruntime-web";
import { AudioReader, AudioWriter, RingBuffer } from "@/services/audio/ringbuffer";

interface WorkerInitMessage {
  command: "init";
  rawSab: SharedArrayBuffer;
  denoisedSab: SharedArrayBuffer;
  sampleRate: number;
  onnxPath: string;
  hopSize: number;
  stateSize: number;
}

type WorkerIncoming = WorkerInitMessage;

interface WorkerReadyMessage {
  type: "ready";
}

interface WorkerErrorMessage {
  type: "error";
  error: string;
}

type WorkerOutgoing = WorkerReadyMessage | WorkerErrorMessage;

const WORKER_SCOPE = self as unknown as Worker;
const REQUIRED_INPUTS = ["input_frame", "states", "atten_lim_db"] as const;
const STATE_OUTPUT_NAME = "out_states";

let running = false;

WORKER_SCOPE.addEventListener("message", (event: MessageEvent<WorkerIncoming>) => {
  void handleMessage(event.data);
});

async function handleMessage(message: WorkerIncoming): Promise<void> {
  if (message.command !== "init") {
    return;
  }

  if (running) {
    postError("Denoiser worker is already initialized.");
    return;
  }

  running = true;
  try {
    ort.env.debug = false;
    ort.env.wasm.simd = true;
    ort.env.wasm.numThreads = 1;
    ort.env.logLevel = "warning";
    // onnxruntime-web@1.24 expects wasmPaths to be {mjs, wasm}.
    // Use explicit absolute URLs so worker/blob execution never resolves to a bad local path.
    const ortVersion = "1.24.2";
    const ortDist = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ortVersion}/dist`;
    (ort.env.wasm as { wasmPaths: { mjs: string; wasm: string } }).wasmPaths = {
      mjs: `${ortDist}/ort-wasm-simd-threaded.jsep.mjs`,
      wasm: `${ortDist}/ort-wasm-simd-threaded.jsep.wasm`,
    };

    const session = await ort.InferenceSession.create(message.onnxPath, {
      executionProviders: ["wasm"],
      graphOptimizationLevel: "all",
    });
    assertModelSignature(session);

    const frameOutputName = session.outputNames.find((name) => name !== STATE_OUTPUT_NAME);
    if (!frameOutputName) {
      throw new Error("Model is missing enhanced frame output.");
    }

    const rawReader = new AudioReader(new RingBuffer(message.rawSab, Float32Array));
    const denoisedWriter = new AudioWriter(
      new RingBuffer(message.denoisedSab, Float32Array)
    );
    const rawStorage = new Float32Array(message.hopSize);
    const attenLimDb = new ort.Tensor("float32", Float32Array.of(0), [1]);
    let states = new ort.Tensor(
      "float32",
      new Float32Array(message.stateSize),
      [message.stateSize]
    );

    const warmupFrame = new ort.Tensor("float32", rawStorage, [message.hopSize]);
    await session.run({
      input_frame: warmupFrame,
      states,
      atten_lim_db: attenLimDb,
    });
    WORKER_SCOPE.postMessage({ type: "ready" } satisfies WorkerOutgoing);

    while (running) {
      if (rawReader.availableRead() < message.hopSize) {
        await delay(1);
        continue;
      }

      const samplesRead = rawReader.dequeue(rawStorage);
      if (samplesRead < message.hopSize) {
        await delay(1);
        continue;
      }

      const inputFrame = new ort.Tensor(
        "float32",
        rawStorage.subarray(0, samplesRead),
        [samplesRead]
      );
      const outputMap = await session.run({
        input_frame: inputFrame,
        states,
        atten_lim_db: attenLimDb,
      });

      const nextStates = outputMap[STATE_OUTPUT_NAME]?.data;
      if (!nextStates || !(nextStates instanceof Float32Array)) {
        throw new Error("Model output did not provide Float32 out_states.");
      }
      states = new ort.Tensor("float32", nextStates, [nextStates.length]);

      const enhanced = outputMap[frameOutputName]?.data;
      if (!enhanced || !(enhanced instanceof Float32Array)) {
        throw new Error(`Model output "${frameOutputName}" is missing Float32 frame data.`);
      }
      denoisedWriter.enqueue(enhanced);
    }
  } catch (error) {
    running = false;
    postError(error instanceof Error ? error.message : String(error));
  }
}

function assertModelSignature(session: ort.InferenceSession): void {
  for (const name of REQUIRED_INPUTS) {
    if (!session.inputNames.includes(name)) {
      throw new Error(
        `Unsupported model: missing input "${name}". Expected inputs ${REQUIRED_INPUTS.join(", ")}.`
      );
    }
  }
  if (!session.outputNames.includes(STATE_OUTPUT_NAME)) {
    throw new Error(`Unsupported model: missing output "${STATE_OUTPUT_NAME}".`);
  }
}

function postError(error: string): void {
  WORKER_SCOPE.postMessage({ type: "error", error } satisfies WorkerOutgoing);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
