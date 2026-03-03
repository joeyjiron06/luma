export class AudioWriter {
  constructor(private readonly ringbuf: RingBuffer<Float32Array>) {
    if (ringbuf.type() !== "Float32Array") {
      throw new TypeError("AudioWriter requires a Float32Array ring buffer.");
    }
  }

  enqueue(buf: Float32Array): number {
    return this.ringbuf.push(buf);
  }

  availableWrite(): number {
    return this.ringbuf.availableWrite();
  }
}

export class AudioReader {
  constructor(private readonly ringbuf: RingBuffer<Float32Array>) {
    if (ringbuf.type() !== "Float32Array") {
      throw new TypeError("AudioReader requires a Float32Array ring buffer.");
    }
  }

  dequeue(buf: Float32Array): number {
    if (this.ringbuf.empty()) {
      return 0;
    }
    return this.ringbuf.pop(buf);
  }

  availableRead(): number {
    return this.ringbuf.availableRead();
  }
}

export class RingBuffer<T extends TypedArray> {
  static getStorageForCapacity<U extends TypedArray>(
    capacity: number,
    type: TypedArrayConstructor<U>
  ): SharedArrayBuffer {
    if (!type.BYTES_PER_ELEMENT) {
      throw new TypeError("Expected typed array constructor.");
    }
    const bytes = 8 + (capacity + 1) * type.BYTES_PER_ELEMENT;
    return new SharedArrayBuffer(bytes);
  }

  private readonly writePtr: Uint32Array;
  private readonly readPtr: Uint32Array;
  private readonly storage: T;
  private readonly capacityWithEmptySlot: number;

  constructor(
    sab: SharedArrayBuffer,
    private readonly arrayType: TypedArrayConstructor<T>
  ) {
    this.capacityWithEmptySlot = (sab.byteLength - 8) / arrayType.BYTES_PER_ELEMENT;
    this.writePtr = new Uint32Array(sab, 0, 1);
    this.readPtr = new Uint32Array(sab, 4, 1);
    this.storage = new arrayType(sab, 8, this.capacityWithEmptySlot);
  }

  type(): string {
    return this.arrayType.name;
  }

  capacity(): number {
    return this.capacityWithEmptySlot - 1;
  }

  empty(): boolean {
    const rd = Atomics.load(this.readPtr, 0);
    const wr = Atomics.load(this.writePtr, 0);
    return wr === rd;
  }

  availableRead(): number {
    const rd = Atomics.load(this.readPtr, 0);
    const wr = Atomics.load(this.writePtr, 0);
    return (wr + this.capacityWithEmptySlot - rd) % this.capacityWithEmptySlot;
  }

  availableWrite(): number {
    return this.capacity() - this.availableRead();
  }

  push(input: T, length = input.length, offset = 0): number {
    const rd = Atomics.load(this.readPtr, 0);
    const wr = Atomics.load(this.writePtr, 0);
    if ((wr + 1) % this.capacityWithEmptySlot === rd) {
      return 0;
    }

    const toWrite = Math.min(this.availableWriteUnsafe(rd, wr), length);
    const firstPart = Math.min(this.capacityWithEmptySlot - wr, toWrite);
    const secondPart = toWrite - firstPart;

    this.copy(input, offset, this.storage, wr, firstPart);
    this.copy(input, offset + firstPart, this.storage, 0, secondPart);

    Atomics.store(this.writePtr, 0, (wr + toWrite) % this.capacityWithEmptySlot);
    return toWrite;
  }

  pop(output: T, length = output.length, offset = 0): number {
    const rd = Atomics.load(this.readPtr, 0);
    const wr = Atomics.load(this.writePtr, 0);
    if (wr === rd) {
      return 0;
    }

    const toRead = Math.min(this.availableReadUnsafe(rd, wr), length);
    const firstPart = Math.min(this.capacityWithEmptySlot - rd, toRead);
    const secondPart = toRead - firstPart;

    this.copy(this.storage, rd, output, offset, firstPart);
    this.copy(this.storage, 0, output, offset + firstPart, secondPart);

    Atomics.store(this.readPtr, 0, (rd + toRead) % this.capacityWithEmptySlot);
    return toRead;
  }

  private availableReadUnsafe(rd: number, wr: number): number {
    return (wr + this.capacityWithEmptySlot - rd) % this.capacityWithEmptySlot;
  }

  private availableWriteUnsafe(rd: number, wr: number): number {
    return this.capacity() - this.availableReadUnsafe(rd, wr);
  }

  private copy(
    input: T,
    inputOffset: number,
    output: T,
    outputOffset: number,
    size: number
  ): void {
    for (let i = 0; i < size; i += 1) {
      output[outputOffset + i] = input[inputOffset + i];
    }
  }
}

type TypedArray =
  | Float32Array
  | Float64Array
  | Int8Array
  | Int16Array
  | Int32Array
  | Uint8Array
  | Uint8ClampedArray
  | Uint16Array
  | Uint32Array
  | BigInt64Array
  | BigUint64Array;

type TypedArrayConstructor<T extends TypedArray> = {
  readonly BYTES_PER_ELEMENT: number;
  readonly name: string;
  new (buffer: ArrayBufferLike, byteOffset: number, length: number): T;
};
