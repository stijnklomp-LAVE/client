import {
	describe,
	test,
	expect,
	mock,
	vi,
	beforeEach,
	afterEach,
} from "bun:test"
import { cleanup } from "@testing-library/react"
import {
	composeFrame,
	defaultMissingFragment,
	type GenericLayer,
	type FrameProvider,
} from "./compositor"

vi.mock("next-intl", () => ({
	useTranslations: () => (key: string) => key,
}))

const originalRaf = globalThis.requestAnimationFrame
const originalCaf = globalThis.cancelAnimationFrame

const rafCallbacks: Array<(now: number) => void> = []
let rafIdCounter = 0

const mockRaf = vi.fn((cb: (now: number) => void) => {
	rafCallbacks.push(cb)
	rafIdCounter++
	return rafIdCounter
})

const mockCaf = vi.fn((_id: number) => {
	rafCallbacks.length = 0
})

beforeEach(() => {
	globalThis.requestAnimationFrame =
		mockRaf as typeof globalThis.requestAnimationFrame
	globalThis.cancelAnimationFrame = mockCaf
	rafCallbacks.length = 0
	rafIdCounter = 0
})

afterEach(() => {
	globalThis.requestAnimationFrame = originalRaf
	globalThis.cancelAnimationFrame = originalCaf
	rafCallbacks.length = 0
	cleanup()
	vi.clearAllMocks()
})

const makeSegment = (fragmentId: string, inPoint = 0, outPoint = 10) => ({
	fragmentId,
	id: `seg-${fragmentId}`,
	inPoint,
	order: 0,
	outPoint,
})

const makeLayer = (
	segments: ReturnType<typeof makeSegment>[],
	zIndex = 0,
): GenericLayer => ({
	segments,
	zIndex,
})

describe("composeFrame integration with frame provider", () => {
	test("draws frame when decoder returns available frame", async () => {
		const ctx = {
			clearRect: mock(() => undefined),
			drawImage: mock(() => undefined),
			fillRect: mock(() => undefined),
			fillText: mock(() => undefined),
		} as unknown as CanvasRenderingContext2D

		const layers = [makeLayer([makeSegment("frag-1", 0, 10)], 0)]

		const frameProvider: FrameProvider = {
			getFrame: mock(() =>
				Promise.resolve({
					canvas: {
						width: 100,
						height: 100,
					} as unknown as OffscreenCanvas,
					duration: 1 / 30,
					timestamp: 0,
				}),
			),
		}

		const onMissing = mock()

		await composeFrame(ctx, 200, 100, layers, 0, frameProvider, onMissing)

		expect(ctx.drawImage).toHaveBeenCalled()
		expect(onMissing).not.toHaveBeenCalled()
		expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 200, 100)
	})

	test("draws placeholder when all decoders fail", async () => {
		const ctx = {
			clearRect: mock(() => undefined),
			drawImage: mock(() => undefined),
			fillRect: mock(() => undefined),
			fillText: mock(() => undefined),
		} as unknown as CanvasRenderingContext2D

		const layers = [makeLayer([makeSegment("frag-1", 0, 10)], 0)]

		const frameProvider: FrameProvider = {
			getFrame: mock(() => Promise.resolve(null)),
		}

		const onMissing = mock()

		await composeFrame(ctx, 200, 100, layers, 0, frameProvider, onMissing)

		expect(ctx.drawImage).not.toHaveBeenCalled()
		expect(onMissing).toHaveBeenCalled()
		expect(ctx.clearRect).toHaveBeenCalled()
	})

	test("draws nothing for empty layers", async () => {
		const ctx = {
			clearRect: mock(() => undefined),
			drawImage: mock(() => undefined),
			fillRect: mock(() => undefined),
			fillText: mock(() => undefined),
		} as unknown as CanvasRenderingContext2D

		await composeFrame(
			ctx,
			200,
			100,
			[],
			0,
			{
				getFrame: mock(() => Promise.resolve(null)),
			},
			mock(),
		)

		expect(ctx.drawImage).not.toHaveBeenCalled()
		expect(ctx.fillRect).not.toHaveBeenCalled()
		expect(ctx.clearRect).toHaveBeenCalled()
	})

	test("draws idle indicator when layers exist but no segments are active", async () => {
		const ctx = {
			clearRect: mock(() => undefined),
			drawImage: mock(() => undefined),
			fillRect: mock(() => undefined),
			fillText: mock(() => undefined),
		} as unknown as CanvasRenderingContext2D

		const layers = [makeLayer([makeSegment("frag-1", 0, 5)], 0)]

		await composeFrame(
			ctx,
			200,
			100,
			layers,
			10,
			{
				getFrame: mock(() => Promise.resolve(null)),
			},
			defaultMissingFragment,
		)

		expect(ctx.fillRect).toHaveBeenCalled()
		expect(ctx.fillText).toHaveBeenCalled()
	})

	test("uses correct seek time accounting for segment offset within layer", async () => {
		const ctx = {
			clearRect: mock(() => undefined),
			drawImage: mock(() => undefined),
			fillRect: mock(() => undefined),
			fillText: mock(() => undefined),
		} as unknown as CanvasRenderingContext2D

		const layers = [
			makeLayer(
				[makeSegment("frag-a", 0, 5), makeSegment("frag-b", 2, 10)],
				0,
			),
		]

		const frameProvider: FrameProvider = {
			getFrame: mock((fragmentId: string, seekTime: number) => {
				if (fragmentId === "frag-b") {
					return Promise.resolve({
						canvas: {
							width: 100,
							height: 100,
						} as unknown as OffscreenCanvas,
						duration: 1 / 30,
						timestamp: seekTime,
					})
				}
				return Promise.reject(new Error("unexpected"))
			}),
		}

		await composeFrame(ctx, 200, 100, layers, 6, frameProvider, mock())

		expect(frameProvider.getFrame).toHaveBeenCalledWith("frag-b", 3)
	})

	test("draws multiple layers in z-order", async () => {
		const drawCalls: number[] = []

		const frameProvider: FrameProvider = {
			getFrame: mock((fragmentId: string) => {
				const zIndex = fragmentId === "frag-bg" ? 0 : 1
				drawCalls.push(zIndex)
				return Promise.resolve({
					canvas: {
						width: 100,
						height: 100,
					} as unknown as OffscreenCanvas,
					duration: 1 / 30,
					timestamp: 0,
				})
			}),
		}

		const layers = [
			makeLayer([makeSegment("frag-overlay", 0, 10)], 1),
			makeLayer([makeSegment("frag-bg", 0, 10)], 0),
		]

		const ctx = {
			clearRect: mock(() => undefined),
			drawImage: mock(() => undefined),
			fillRect: mock(() => undefined),
			fillText: mock(() => undefined),
		} as unknown as CanvasRenderingContext2D

		await composeFrame(ctx, 200, 100, layers, 0, frameProvider, mock())

		expect(drawCalls).toEqual([0, 1])
	})
})

describe("composeFrame black screen prevention", () => {
	test("calls placeholder callback when frame not available", async () => {
		const ctx = {
			clearRect: mock(() => undefined),
			drawImage: mock(() => undefined),
			fillRect: mock(() => undefined),
			fillText: mock(() => undefined),
		} as unknown as CanvasRenderingContext2D

		const layers = [makeLayer([makeSegment("frag-1", 0, 10)], 0)]

		const onMissing = mock()

		await composeFrame(
			ctx,
			200,
			100,
			layers,
			0,
			{
				getFrame: mock(() => Promise.resolve(null)),
			},
			onMissing,
		)

		expect(onMissing).toHaveBeenCalled()
	})

	test("fills canvas with color when frame unavailable", async () => {
		const fillRectMock = mock(() => undefined)

		const ctx = {
			clearRect: mock(() => undefined),
			drawImage: mock(() => undefined),
			fillRect: fillRectMock,
			fillStyle: "",
			fillText: mock(() => undefined),
		} as unknown as CanvasRenderingContext2D

		const layers = [makeLayer([makeSegment("frag-1", 0, 10)], 0)]

		await composeFrame(
			ctx,
			200,
			100,
			layers,
			0,
			{
				getFrame: mock(() => Promise.resolve(null)),
			},
			defaultMissingFragment,
		)

		expect(fillRectMock).toHaveBeenCalled()
	})

	test("draws placeholder when frame.canvas is null", async () => {
		const drawImageMock = mock(() => undefined)
		const onMissing = mock()

		const ctx = {
			clearRect: mock(() => undefined),
			drawImage: drawImageMock,
			fillRect: mock(() => undefined),
			fillText: mock(() => undefined),
		} as unknown as CanvasRenderingContext2D

		const layers = [makeLayer([makeSegment("frag-1", 0, 10)], 0)]

		const frameProvider: FrameProvider = {
			getFrame: mock(() =>
				Promise.resolve({
					canvas: null as unknown as OffscreenCanvas,
					duration: 1 / 30,
					timestamp: 0,
				}),
			),
		}

		await composeFrame(ctx, 200, 100, layers, 0, frameProvider, onMissing)

		expect(drawImageMock).not.toHaveBeenCalled()
		expect(onMissing).toHaveBeenCalled()
	})

	test("draws placeholder when frame.canvas has zero dimensions", async () => {
		const drawImageMock = mock(() => undefined)
		const onMissing = mock()

		const ctx = {
			clearRect: mock(() => undefined),
			drawImage: drawImageMock,
			fillRect: mock(() => undefined),
			fillText: mock(() => undefined),
		} as unknown as CanvasRenderingContext2D

		const layers = [makeLayer([makeSegment("frag-1", 0, 10)], 0)]

		const frameProvider: FrameProvider = {
			getFrame: mock(() =>
				Promise.resolve({
					canvas: {
						width: 0,
						height: 0,
					} as unknown as OffscreenCanvas,
					duration: 1 / 30,
					timestamp: 0,
				}),
			),
		}

		await composeFrame(ctx, 200, 100, layers, 0, frameProvider, onMissing)

		expect(drawImageMock).not.toHaveBeenCalled()
		expect(onMissing).toHaveBeenCalled()
	})

	test("draws placeholder when frameProvider.getFrame throws", async () => {
		const drawImageMock = mock(() => undefined)
		const onMissing = mock()

		const ctx = {
			clearRect: mock(() => undefined),
			drawImage: drawImageMock,
			fillRect: mock(() => undefined),
			fillText: mock(() => undefined),
		} as unknown as CanvasRenderingContext2D

		const layers = [makeLayer([makeSegment("frag-1", 0, 10)], 0)]

		const frameProvider: FrameProvider = {
			getFrame: mock(() => Promise.reject(new Error("decoder error"))),
		}

		await composeFrame(ctx, 200, 100, layers, 0, frameProvider, onMissing)

		expect(drawImageMock).not.toHaveBeenCalled()
		expect(onMissing).toHaveBeenCalled()
	})

	test("draws placeholder when drawImage throws", async () => {
		const drawImageMock = mock(() => {
			throw new Error("drawImage failed")
		})
		const onMissing = mock()
		const fillRectMock = mock(() => undefined)

		const ctx = {
			clearRect: mock(() => undefined),
			drawImage: drawImageMock,
			fillRect: fillRectMock,
			fillText: mock(() => undefined),
		} as unknown as CanvasRenderingContext2D

		const layers = [makeLayer([makeSegment("frag-1", 0, 10)], 0)]

		const frameProvider: FrameProvider = {
			getFrame: mock(() =>
				Promise.resolve({
					canvas: {
						width: 100,
						height: 100,
					} as unknown as OffscreenCanvas,
					duration: 1 / 30,
					timestamp: 0,
				}),
			),
		}

		await composeFrame(ctx, 200, 100, layers, 0, frameProvider, onMissing)

		expect(drawImageMock).toHaveBeenCalled()
		expect(onMissing).toHaveBeenCalled()
	})

	test("draws fallback when unexpected error occurs during rendering", async () => {
		const fillRectMock = mock(() => undefined)

		const ctx = {
			clearRect: mock(() => {
				throw new Error("clearRect failed")
			}),
			drawImage: mock(() => undefined),
			fillRect: fillRectMock,
			fillStyle: "",
			fillText: mock(() => undefined),
		} as unknown as CanvasRenderingContext2D

		const layers = [makeLayer([makeSegment("frag-1", 0, 10)], 0)]

		await composeFrame(
			ctx,
			200,
			100,
			layers,
			0,
			{
				getFrame: mock(() => Promise.resolve(null)),
			},
			defaultMissingFragment,
		)

		expect(fillRectMock).toHaveBeenCalled()
	})
})
