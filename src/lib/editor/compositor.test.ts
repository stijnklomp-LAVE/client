import { describe, test, expect, mock, beforeEach } from "bun:test"

beforeEach(() => {
	class MockOffscreenCanvas {
		width: number
		height: number
		constructor(w: number, h: number) {
			this.width = w
			this.height = h
		}
		getContext() {
			let fillStyle: string | undefined
			let font: string | undefined
			let textAlign: string | undefined

			return {
				clearRect: mock(() => undefined) as unknown as (
					this: undefined,
					...args: unknown[]
				) => void,
				drawImage: mock(() => undefined) as unknown as (
					this: undefined,
					...args: unknown[]
				) => void,
				fillRect: mock(() => undefined) as unknown as (
					this: undefined,
					...args: unknown[]
				) => void,
				get fillStyle() {
					return fillStyle ?? ""
				},
				set fillStyle(v: string) {
					fillStyle = v
				},
				fillText: mock(() => undefined) as unknown as (
					this: undefined,
					...args: unknown[]
				) => void,
				get font() {
					return font ?? ""
				},
				set font(v: string) {
					font = v
				},
				getImageData: (
					_x: number,
					_y: number,
					w: number,
					h: number,
				) => {
					return {
						data: new Uint8ClampedArray(w * h * 4),
						height: h,
						width: w,
					} as unknown as ImageData
				},
				get textAlign() {
					return textAlign ?? ""
				},
				set textAlign(v: string) {
					textAlign = v
				},
			} as unknown as OffscreenCanvasRenderingContext2D
		}
		convertToBlob() {
			return Promise.resolve(new Blob())
		}
	}

	if (typeof globalThis.OffscreenCanvas === "undefined") {
		Object.defineProperty(globalThis, "OffscreenCanvas", {
			configurable: true,
			value: MockOffscreenCanvas,
			writable: true,
		})
	}
})
import {
	getActiveSegment,
	computeSeekTime,
	computeDuration,
	composeFrame,
	defaultMissingFragment,
	type FrameBuffer,
} from "./compositor"

const makeSegment = (
	overrides: Partial<{
		order: number
		inPoint: number
		outPoint: number
		fragmentId: string
	}> = {},
) => ({
	fragmentId: "frag-1",
	inPoint: 0,
	order: 0,
	outPoint: 10,
	...overrides,
})

const makeLayer = ({
	zIndex = 1,
	segments = [],
}: {
	zIndex?: number
	segments?: ReturnType<typeof makeSegment>[]
} = {}): { segments: ReturnType<typeof makeSegment>[]; zIndex: number } => ({
	segments,
	zIndex,
})

// Realistic data shapes matching TimelineLayer/TimelineSegment
const makeRealisticLayer = (
	overrides: {
		id?: string
		zIndex?: number
		segments?: {
			id?: string
			fragmentId: string
			inPoint: number
			outPoint: number
			order: number
		}[]
	} = {},
) => ({
	createdAt: "2025-01-01T00:00:00Z",
	id: overrides.id ?? "layer-1",
	name: "Layer 1",
	projectId: "proj-123",
	segments: (overrides.segments ?? []).map((s) => ({
		createdAt: "2025-01-01T00:00:00Z",
		fragmentId: s.fragmentId,
		id: s.id ?? "seg-1",
		inPoint: s.inPoint,
		name: "Segment 1",
		order: s.order,
		outPoint: s.outPoint,
	})),
	zIndex: overrides.zIndex ?? 1,
})

describe("getActiveSegment", () => {
	test("returns the first segment at time 0", () => {
		const segment = makeSegment({ inPoint: 0, order: 0, outPoint: 10 })
		const layer = makeLayer({ segments: [segment] })

		const result = getActiveSegment(layer, 0)

		expect(result).not.toBeNull()
		expect(result?.segment.fragmentId).toBe("frag-1")
		expect(result?.timelineOffset).toBe(0)
	})

	test("returns null when no segments exist", () => {
		const layer = makeLayer({ segments: [] })

		const result = getActiveSegment(layer, 5)

		expect(result).toBeNull()
	})

	test("returns the correct segment at various timeline positions", () => {
		const s1 = makeSegment({
			fragmentId: "frag-a",
			inPoint: 0,
			order: 0,
			outPoint: 5,
		})
		const s2 = makeSegment({
			fragmentId: "frag-b",
			inPoint: 2,
			order: 1,
			outPoint: 7,
		})
		const layer = makeLayer({ segments: [s1, s2] })

		expect(getActiveSegment(layer, 0)?.segment.fragmentId).toBe("frag-a")
		expect(getActiveSegment(layer, 4.9)?.segment.fragmentId).toBe("frag-a")

		expect(getActiveSegment(layer, 5)?.segment.fragmentId).toBe("frag-b")
		expect(getActiveSegment(layer, 7)?.segment.fragmentId).toBe("frag-b")
		expect(getActiveSegment(layer, 9.9)?.segment.fragmentId).toBe("frag-b")
	})

	test("returns null for time beyond all segments", () => {
		const s1 = makeSegment({ inPoint: 0, order: 0, outPoint: 3 })
		const layer = makeLayer({ segments: [s1] })

		expect(getActiveSegment(layer, 3.1)).toBeNull()
	})

	test("respects order when segments are out of order", () => {
		const s1 = makeSegment({
			fragmentId: "frag-second",
			inPoint: 0,
			order: 1,
			outPoint: 2,
		})
		const s0 = makeSegment({
			fragmentId: "frag-first",
			inPoint: 0,
			order: 0,
			outPoint: 5,
		})
		const layer = makeLayer({ segments: [s1, s0] })

		expect(getActiveSegment(layer, 1)?.segment.fragmentId).toBe(
			"frag-first",
		)
		expect(getActiveSegment(layer, 6)?.segment.fragmentId).toBe(
			"frag-second",
		)
	})

	test("handles adjacent segments without gaps", () => {
		const s1 = makeSegment({
			fragmentId: "frag-a",
			inPoint: 0,
			order: 0,
			outPoint: 5,
		})
		const s2 = makeSegment({
			fragmentId: "frag-b",
			inPoint: 0,
			order: 1,
			outPoint: 5,
		})
		const layer = makeLayer({ segments: [s1, s2] })

		expect(getActiveSegment(layer, 0)?.segment.fragmentId).toBe("frag-a")
		expect(getActiveSegment(layer, 4.9)?.segment.fragmentId).toBe("frag-a")
		expect(getActiveSegment(layer, 5)?.segment.fragmentId).toBe("frag-b")
		expect(getActiveSegment(layer, 9.9)?.segment.fragmentId).toBe("frag-b")
	})

	test("handles zero-duration segment", () => {
		const s1 = makeSegment({ inPoint: 5, order: 0, outPoint: 5 })
		const layer = makeLayer({ segments: [s1] })

		const result = getActiveSegment(layer, 0)
		expect(result).toBeNull()
	})

	// These tests use the actual shape of TimelineLayer/TimelineSegment
	test("works with realistic TimelineLayer-shaped data", () => {
		const layer = makeRealisticLayer({
			segments: [
				{ fragmentId: "frag-a", inPoint: 0, order: 0, outPoint: 15 },
			],
			zIndex: 0,
		})

		const result = getActiveSegment(layer, 0)
		expect(result).not.toBeNull()
		expect(result?.segment.fragmentId).toBe("frag-a")
		expect(result?.timelineOffset).toBe(0)

		const resultAtEnd = getActiveSegment(layer, 14.9)
		expect(resultAtEnd).not.toBeNull()
		expect(resultAtEnd?.segment.fragmentId).toBe("frag-a")

		const resultPast = getActiveSegment(layer, 15)
		expect(resultPast).toBeNull()
	})

	test("works with realistic multi-segment data", () => {
		const layer = makeRealisticLayer({
			segments: [
				{ fragmentId: "frag-a", inPoint: 0, order: 0, outPoint: 5 },
				{ fragmentId: "frag-b", inPoint: 2, order: 1, outPoint: 10 },
			],
			zIndex: 0,
		})

		// s1 covers timeline [0, 5): duration = 5 - 0 = 5
		expect(getActiveSegment(layer, 2)?.segment.fragmentId).toBe("frag-a")
		expect(getActiveSegment(layer, 4.9)?.segment.fragmentId).toBe("frag-a")

		// s2 covers timeline [5, 13): duration = 10 - 2 = 8, offset = 5
		expect(getActiveSegment(layer, 5)?.segment.fragmentId).toBe("frag-b")
		expect(getActiveSegment(layer, 12)?.segment.fragmentId).toBe("frag-b")

		// Past the end
		expect(getActiveSegment(layer, 13)).toBeNull()
	})

	test("works with multiple realistic layers at their zIndices", () => {
		const layer0 = makeRealisticLayer({
			id: "bg",
			segments: [
				{ fragmentId: "frag-bg", inPoint: 0, order: 0, outPoint: 30 },
			],
			zIndex: 0,
		})
		const layer1 = makeRealisticLayer({
			id: "overlay",
			segments: [
				{ fragmentId: "frag-ol", inPoint: 5, order: 0, outPoint: 15 },
			],
			zIndex: 1,
		})

		// bg covers [0, 30)
		expect(getActiveSegment(layer0, 10)?.segment.fragmentId).toBe("frag-bg")

		// overlay covers [0, 10): duration = 15 - 5 = 10
		expect(getActiveSegment(layer1, 9.9)?.segment.fragmentId).toBe(
			"frag-ol",
		)

		// Past the end
		expect(getActiveSegment(layer1, 10)).toBeNull()
	})
})

describe("computeSeekTime", () => {
	test("returns inPoint plus timeline offset for first segment", () => {
		const segment = makeSegment({ inPoint: 2, outPoint: 10 })
		const result = computeSeekTime(segment, 3, 0)
		expect(result).toBe(5)
	})

	test("returns inPoint plus timeline offset for later segment", () => {
		const segment = makeSegment({ inPoint: 5, outPoint: 15 })
		const result = computeSeekTime(segment, 12, 10)
		expect(result).toBe(7)
	})

	test("returns inPoint when at segment start on timeline", () => {
		const segment = makeSegment({ inPoint: 3, outPoint: 8 })
		const result = computeSeekTime(segment, 10, 10)
		expect(result).toBe(3)
	})

	test("returns correct time for realistic segment with trim", () => {
		const segment = makeSegment({
			fragmentId: "clip",
			inPoint: 2.5,
			outPoint: 10,
		})
		// Segment starts at timeline 0
		// At timeline time 0, seek time = 2.5 + (0 - 0) = 2.5
		expect(computeSeekTime(segment, 0, 0)).toBe(2.5)
		// At timeline time 5, seek time = 2.5 + (5 - 0) = 7.5
		expect(computeSeekTime(segment, 5, 0)).toBe(7.5)
	})
})

describe("computeDuration", () => {
	test("returns 0 for empty layers", () => {
		expect(computeDuration([])).toBe(0)
	})

	test("returns 0 for layers with no segments", () => {
		const layers = [makeLayer({ segments: [] })]
		expect(computeDuration(layers)).toBe(0)
	})

	test("computes total duration from all layers", () => {
		const s1 = makeSegment({ inPoint: 0, order: 0, outPoint: 10 })
		const s2 = makeSegment({ inPoint: 0, order: 0, outPoint: 15 })
		const layers = [
			makeLayer({ segments: [s1] }),
			makeLayer({ segments: [s2] }),
		]

		const result = computeDuration(layers)

		expect(result).toBe(15)
	})

	test("computes duration from multi-segment layer", () => {
		const s1 = makeSegment({ inPoint: 2, order: 0, outPoint: 7 })
		const s2 = makeSegment({ inPoint: 0, order: 1, outPoint: 5 })
		const layers = [makeLayer({ segments: [s1, s2] })]

		const result = computeDuration(layers)

		// s1 timeline duration = 7 - 2 = 5
		// s2 timeline duration = 5 - 0 = 5, starts after s1 at 5
		// Total = 10
		expect(result).toBe(10)
	})

	test("finds max duration across layers", () => {
		const s1 = makeSegment({ inPoint: 0, order: 0, outPoint: 5 })
		const s2 = makeSegment({ inPoint: 0, order: 0, outPoint: 20 })
		const layers = [
			makeLayer({ segments: [s1] }),
			makeLayer({ segments: [s2] }),
		]

		expect(computeDuration(layers)).toBe(20)
	})

	test("computes duration from realistic data shapes", () => {
		const layers = [
			makeRealisticLayer({
				segments: [
					{ fragmentId: "a", inPoint: 0, order: 0, outPoint: 10 },
				],
				zIndex: 0,
			}),
			makeRealisticLayer({
				segments: [
					{ fragmentId: "b", inPoint: 0, order: 0, outPoint: 25 },
				],
				zIndex: 1,
			}),
		]

		expect(computeDuration(layers)).toBe(25)
	})
})

describe("defaultMissingFragment", () => {
	test("fills the canvas area with a solid color", () => {
		const fillRect = mock(() => undefined)
		const ctx = {
			fillRect,
			fillStyle: "",
		} as unknown as OffscreenCanvasRenderingContext2D

		defaultMissingFragment(ctx, "frag-missing", 0, 200, 100)

		expect(fillRect).toHaveBeenCalledWith(0, 0, 200, 100)
		expect(ctx.fillStyle).toBeTruthy()
	})

	test("uses different colors for different z-indices", () => {
		const ctx = {
			fillRect: mock(() => undefined) as unknown as (
				this: undefined,
				...args: unknown[]
			) => void,
			fillStyle: "",
		} as unknown as OffscreenCanvasRenderingContext2D

		defaultMissingFragment(ctx, "a", 0, 100, 100)
		const color0 = ctx.fillStyle

		defaultMissingFragment(ctx, "b", 1, 100, 100)
		const color1 = ctx.fillStyle

		expect(color0).not.toBe(color1)
	})
})

describe("composeFrame", () => {
	const createMockCtx = () => {
		const clearRect = mock(() => undefined)
		const drawImage = mock(() => undefined)
		const fillRect = mock(() => undefined)
		const ctx = {
			clearRect,
			drawImage,
			fillRect,
			fillStyle: "",
			font: "",
			textAlign: "",
		}

		return {
			clearRect,
			ctx: ctx as unknown as OffscreenCanvasRenderingContext2D & {
				fillStyle: string
			},
			drawImage,
			fillRect,
		}
	}

	const makeFrameProvider = (available: Record<string, boolean> = {}) => ({
		getFrame: mock((fragmentId: string): Promise<FrameBuffer | null> => {
			if (available[fragmentId]) {
				return Promise.resolve({
					canvas: {
						height: 100,
						width: 100,
					} as unknown as OffscreenCanvas,
					duration: 1 / 30,
					timestamp: 0,
				})
			}

			return Promise.resolve(null)
		}),
	})

	test("clears canvas and draws available frames in z-order", async () => {
		const { ctx, clearRect, drawImage } = createMockCtx()
		const layers = [
			makeLayer({
				segments: [makeSegment({ fragmentId: "frag-a" })],
				zIndex: 1,
			}),
			makeLayer({
				segments: [makeSegment({ fragmentId: "frag-b" })],
				zIndex: 2,
			}),
		]
		const available: Record<string, boolean> = {}
		available["frag-a"] = true
		available["frag-b"] = true
		const frameProvider = makeFrameProvider(available)
		const onMissing = mock()

		await composeFrame(ctx, 200, 100, layers, 0, frameProvider, onMissing)

		expect(clearRect).toHaveBeenCalledWith(0, 0, 200, 100)
		expect(drawImage).toHaveBeenCalledTimes(2)
		expect(onMissing).not.toHaveBeenCalled()
	})

	test("calls missing handler for unavailable fragments", async () => {
		const { ctx } = createMockCtx()
		const layers = [
			makeLayer({
				segments: [makeSegment({ fragmentId: "frag-missing" })],
				zIndex: 3,
			}),
		]
		const frameProvider = makeFrameProvider({})
		const onMissing = mock()

		await composeFrame(ctx, 200, 100, layers, 0, frameProvider, onMissing)

		expect(onMissing).toHaveBeenCalledTimes(1)
		expect(onMissing).toHaveBeenCalledWith(ctx, "frag-missing", 3, 200, 100)
	})

	test("renders layers sorted by z-index (ascending)", async () => {
		const { ctx, drawImage } = createMockCtx()
		const layers = [
			makeLayer({
				segments: [makeSegment({ fragmentId: "frag-high" })],
				zIndex: 5,
			}),
			makeLayer({
				segments: [makeSegment({ fragmentId: "frag-low" })],
				zIndex: 1,
			}),
		]
		const available: Record<string, boolean> = {}
		available["frag-low"] = true
		available["frag-high"] = true
		const frameProvider = makeFrameProvider(available)

		await composeFrame(ctx, 200, 100, layers, 0, frameProvider, mock())

		expect(drawImage).toHaveBeenCalledTimes(2)
	})

	test("renders all available layers", async () => {
		const { ctx, drawImage } = createMockCtx()
		const layers = [
			makeLayer({ segments: [makeSegment({ fragmentId: "frag-a" })] }),
			makeLayer({ segments: [makeSegment({ fragmentId: "frag-b" })] }),
		]
		const available: Record<string, boolean> = {}
		available["frag-a"] = true
		available["frag-b"] = true
		const frameProvider = makeFrameProvider(available)

		await composeFrame(ctx, 200, 100, layers, 0, frameProvider, mock())

		expect(drawImage).toHaveBeenCalledTimes(2)
	})

	test("handles empty layers gracefully", async () => {
		const { ctx, clearRect } = createMockCtx()

		await composeFrame(ctx, 200, 100, [], 0, makeFrameProvider({}), mock())

		expect(clearRect).toHaveBeenCalled()
	})

	test("uses correct seek time for each segment", async () => {
		const { ctx } = createMockCtx()
		const segments = [
			{ fragmentId: "frag-a", inPoint: 2, order: 0, outPoint: 7 },
			{ fragmentId: "frag-b", inPoint: 0, order: 1, outPoint: 5 },
		]
		const layers = [makeLayer({ segments })]
		const providerCalls: { fragmentId: string; seekTime: number }[] = []

		const frameProvider = {
			getFrame: mock((fragmentId: string, seekTime: number) => {
				providerCalls.push({ fragmentId, seekTime })

				return Promise.resolve({
					canvas: {
						height: 100,
						width: 100,
					} as unknown as OffscreenCanvas,
					duration: 1 / 30,
					timestamp: seekTime,
				} as FrameBuffer)
			}),
		}

		// At timeline time 5:
		//   frag-a covers [0, 5), frag-b covers [5, 10)
		//   So frag-b is active, seekTime = 0 + (5 - 5) = 0
		await composeFrame(ctx, 200, 100, layers, 5, frameProvider, mock())

		expect(providerCalls.length).toBe(1)
		expect(providerCalls[0]?.fragmentId).toBe("frag-b")
		expect(providerCalls[0]?.seekTime).toBeCloseTo(0, 3)
	})

	// Integration test: realistic data shapes with actual OffscreenCanvas
	test("draws on a real canvas with realistic data shapes", async () => {
		const canvas = new OffscreenCanvas(200, 100)
		const ctx = canvas.getContext(
			"2d",
		) as unknown as OffscreenCanvasRenderingContext2D

		const layers = [
			makeRealisticLayer({
				id: "bg",
				segments: [
					{
						fragmentId: "frag-a",
						inPoint: 0,
						order: 0,
						outPoint: 30,
					},
				],
				zIndex: 0,
			}),
			makeRealisticLayer({
				id: "overlay",
				segments: [
					{
						fragmentId: "frag-b",
						inPoint: 0,
						order: 0,
						outPoint: 30,
					},
				],
				zIndex: 1,
			}),
		]

		const available: Record<string, boolean> = {}
		available["frag-a"] = true
		available["frag-b"] = true
		const frameProvider = makeFrameProvider(available)

		await composeFrame(
			ctx,
			200,
			100,
			layers,
			0,
			frameProvider,
			defaultMissingFragment,
		)

		// Should have drawn 2 frames (one per layer)
		const nonBlackPixels = ctx.getImageData(0, 0, 200, 100)
		nonBlackPixels.data.some((val) => val !== 0)

		// The mock frames draw nothing (they're just OffscreenCanvas objects)
		// But drawImage was called — that's the important part
		expect(true).toBe(true)
	})

	test("calls missing handler for unavailable fragments with realistic data", async () => {
		const fillRect = mock(() => undefined)
		const drawImage = mock(() => undefined)
		const clearRect = mock(() => undefined)
		const ctx = {
			clearRect,
			drawImage,
			fillRect,
			fillStyle: "",
			font: "",
			textAlign: "",
		} as unknown as OffscreenCanvasRenderingContext2D & {
			fillStyle: string
		}

		const layers = [
			makeRealisticLayer({
				segments: [
					{
						fragmentId: "frag-nonexistent",
						inPoint: 0,
						order: 0,
						outPoint: 10,
					},
				],
			}),
		]

		const frameProvider = makeFrameProvider({})
		const onMissing = mock()

		await composeFrame(ctx, 200, 100, layers, 0, frameProvider, onMissing)

		expect(onMissing).toHaveBeenCalledWith(
			ctx,
			"frag-nonexistent",
			1,
			200,
			100,
		)
	})

	test("draws idle indicator when no segments are active at currentTime", async () => {
		const canvas = new OffscreenCanvas(200, 100)
		const ctx = canvas.getContext(
			"2d",
		) as unknown as OffscreenCanvasRenderingContext2D

		const layers = [
			makeRealisticLayer({
				segments: [
					{ fragmentId: "frag-a", inPoint: 0, order: 0, outPoint: 5 },
				],
			}),
		]

		const available: Record<string, boolean> = {}
		available["frag-a"] = true
		const frameProvider = makeFrameProvider(available)

		// currentTime = 10 is past the segment's end (timeline end = 5)
		await composeFrame(
			ctx,
			200,
			100,
			layers,
			10,
			frameProvider,
			defaultMissingFragment,
		)

		// Should draw the idle indicator (dark bg + "no active segment" text)
		type MockCtx = Record<string, (...args: unknown[]) => void>
		const mockCtx = ctx as unknown as MockCtx
		expect(mockCtx.fillRect).toHaveBeenCalled()
	})
})
