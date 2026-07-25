import { describe, test, expect, mock, vi, beforeEach } from "bun:test"

class MockOffscreenCanvas {
	width = 100
	height = 100
	getContext() {
		return {
			drawImage: mock(),
		}
	}
	convertToBlob() {
		return Promise.resolve(new Blob(["fake"], { type: "image/jpeg" }))
	}
}

Object.defineProperty(globalThis, "OffscreenCanvas", {
	configurable: true,
	value: MockOffscreenCanvas,
	writable: true,
})

const mockCanvas1 = new OffscreenCanvas(
	100,
	100,
) as unknown as MockOffscreenCanvas
const mockCanvas2 = new OffscreenCanvas(
	100,
	100,
) as unknown as MockOffscreenCanvas

const mockSequentialFrames = [
	{ canvas: mockCanvas1, duration: 1 / 30, timestamp: 0 },
	{ canvas: mockCanvas2, duration: 1 / 30, timestamp: 1 / 30 },
]

const mockGetCanvas = mock((timestamp: number) => {
	const frame = mockSequentialFrames.find(
		(f) => f.timestamp === timestamp,
	) ?? {
		canvas: mockCanvas1,
		duration: 1 / 30,
		timestamp,
	}

	return frame
})

const mockCanvasesGenerator = mock(function* (
	_startTimestamp?: number,
	_endTimestamp?: number,
): Generator<{
	canvas: OffscreenCanvas | HTMLCanvasElement
	timestamp: number
	duration: number
}> {
	for (const frame of mockSequentialFrames) {
		yield frame as unknown as {
			canvas: OffscreenCanvas | HTMLCanvasElement
			timestamp: number
			duration: number
		}
	}
})

const mockCanvasSink = {
	canvases: mockCanvasesGenerator,
	getCanvas: mockGetCanvas,
}

const mockInputInstance = {
	dispose: mock(() => undefined),
	getPrimaryVideoTrack: mock(() => Promise.resolve({})),
}

const MockInput = mock(() => mockInputInstance)
const MockCanvasSink = mock(() => mockCanvasSink)

void vi.mock("mediabunny", () => {
	const mocks: Record<string, unknown> = {}
	mocks.Input = MockInput
	mocks.BlobSource = class BlobSource {
		name = "BlobSource"
	}
	mocks.CanvasSink = MockCanvasSink
	mocks.ALL_FORMATS = Symbol("ALL_FORMATS")

	return mocks
})

import { DecoderPool } from "./decoder-pool"

beforeEach(() => {
	vi.clearAllMocks()
})

describe("DecoderPool", () => {
	test("opens a fragment and creates input from webm file", async () => {
		const pool = new DecoderPool()
		const file = new File([new Uint8Array(100)], "recording.webm")

		await pool.open("frag-1", file)

		expect(mockInputInstance.getPrimaryVideoTrack).toHaveBeenCalled()
		expect(MockCanvasSink).toHaveBeenCalled()

		pool.closeAll()
	})

	test("returns canvas frame for a given timestamp", async () => {
		const pool = new DecoderPool()
		const file = new File([new Uint8Array(100)], "recording.webm")

		await pool.open("frag-1", file)
		const result = await pool.seekToFrame("frag-1", 0)

		expect(result).not.toBeNull()
		expect(result?.canvas).toBe(mockCanvas1 as unknown as OffscreenCanvas)
		expect(result?.timestamp).toBe(0)
		expect(mockGetCanvas).toHaveBeenCalledWith(0)

		pool.closeAll()
	})

	test("returns null when seeking on unopened fragment", async () => {
		const pool = new DecoderPool()

		const result = await pool.seekToFrame("unknown", 0)

		expect(result).toBeNull()

		pool.closeAll()
	})

	test("returns sequential frames after startSequential", async () => {
		const pool = new DecoderPool()
		const file = new File([new Uint8Array(100)], "recording.webm")

		await pool.open("frag-1", file)
		pool.startSequential("frag-1", 0)

		const frame1 = await pool.nextFrame("frag-1")
		expect(frame1).not.toBeNull()
		expect(frame1?.canvas).toBe(mockCanvas1 as unknown as OffscreenCanvas)
		expect(frame1?.timestamp).toBe(0)

		const frame2 = await pool.nextFrame("frag-1")
		expect(frame2).not.toBeNull()
		expect(frame2?.canvas).toBe(mockCanvas2 as unknown as OffscreenCanvas)
		expect(frame2?.timestamp).toBe(1 / 30)

		pool.closeAll()
	})

	test("returns null for nextFrame when no sequential playback started", async () => {
		const pool = new DecoderPool()
		const file = new File([new Uint8Array(100)], "recording.webm")

		await pool.open("frag-1", file)
		const result = await pool.nextFrame("frag-1")

		expect(result).toBeNull()

		pool.closeAll()
	})

	test("returns null for nextFrame when generator is exhausted", async () => {
		const pool = new DecoderPool()
		const file = new File([new Uint8Array(100)], "recording.webm")

		await pool.open("frag-1", file)
		pool.startSequential("frag-1", 0)

		// Exhaust the 2 frames
		await pool.nextFrame("frag-1")
		await pool.nextFrame("frag-1")
		const result = await pool.nextFrame("frag-1")

		expect(result).toBeNull()

		pool.closeAll()
	})

	test("closes specific fragment and releases resources", async () => {
		const pool = new DecoderPool()
		const file = new File([new Uint8Array(100)], "recording.webm")

		await pool.open("frag-1", file)
		pool.close("frag-1")

		const result = await pool.seekToFrame("frag-1", 0)
		expect(result).toBeNull()

		pool.closeAll()
	})

	test("closes all fragments and releases resources", async () => {
		const pool = new DecoderPool()
		const file = new File([new Uint8Array(100)], "recording.webm")

		await pool.open("frag-1", file)
		await pool.open("frag-2", file)
		pool.closeAll()

		expect(mockInputInstance.dispose).toHaveBeenCalledTimes(2)
		expect(pool.size).toBe(0)
	})

	test("tracks number of open fragments", async () => {
		const pool = new DecoderPool()
		const file = new File([new Uint8Array(100)], "recording.webm")

		expect(pool.size).toBe(0)

		await pool.open("frag-1", file)
		expect(pool.size).toBe(1)

		await pool.open("frag-2", file)
		expect(pool.size).toBe(2)

		pool.close("frag-1")
		expect(pool.size).toBe(1)

		pool.closeAll()
	})
})
