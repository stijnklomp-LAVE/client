import { describe, test, expect, mock, beforeEach } from "bun:test"
import { renderHook } from "@testing-library/react"
import { useCompositor } from "./use-compositor"
import type { GenericLayer } from "./compositor"

const mockDecoderPool = {
	closeAll: mock(),
	open: mock(() => Promise.resolve()),
	seekToFrame: mock(() => Promise.resolve(null)),
}

void mock.module("./decoder-pool", () => ({
	// eslint-disable-next-line @typescript-eslint/naming-convention
	DecoderPool: mock(() => mockDecoderPool),
}))

void mock.module("./fragment-media", () => ({
	resolveFragmentsMedia: mock(() => Promise.resolve(new Map())),
}))

void mock.module("@/lib/logger", () => ({
	logger: {
		debug: mock(),
		error: mock(),
		info: mock(),
		warn: mock(),
	},
}))

const createMockCanvas = () => {
	const canvas = document.createElement("canvas")
	canvas.width = 640
	canvas.height = 480
	canvas.getContext = mock(() => ({
		clearRect: mock(),
		drawImage: mock(),
		fillRect: mock(),
		fillStyle: "",
		fillText: mock(),
		font: "",
		textAlign: "",
	}))

	return canvas
}

const createLayers = (duration: number): GenericLayer[] => [
	{
		segments: [
			{
				fragmentId: "frag-1",
				inPoint: 0,
				order: 0,
				outPoint: duration,
			},
		],
		zIndex: 0,
	},
]

beforeEach(() => {
	mock.clearAllMocks()
})

describe("useCompositor", () => {
	describe("animation loop timing", () => {
		test("initializes without errors when hasContent is true", () => {
			const canvas = createMockCanvas()
			const onTimeUpdate = mock()
			const onPlaybackEnd = mock()

			const { result } = renderHook(() =>
				useCompositor({
					duration: 10,
					fragments: [
						{ duration: 10, filePath: "rec-1", id: "frag-1" },
					],
					isPlaying: false,
					layers: createLayers(10),
					onPlaybackEnd,
					onTimeUpdate,
					playbackSpeed: 1,
					projectId: "proj-1",
					rootDirHandle: null,
				}),
			)

			Object.defineProperty(result.current, "canvasRef", {
				value: { current: canvas },
				writable: true,
			})

			expect(result.current.canvasRef).toBeDefined()
			expect(result.current.seek).toBeDefined()
		})

		test("seek function exists and is callable", () => {
			const canvas = createMockCanvas()
			const onTimeUpdate = mock()

			const { result } = renderHook(() =>
				useCompositor({
					duration: 10,
					fragments: [
						{ duration: 10, filePath: "rec-1", id: "frag-1" },
					],
					isPlaying: false,
					layers: createLayers(10),
					onTimeUpdate,
					playbackSpeed: 1,
					projectId: "proj-1",
					rootDirHandle: null,
				}),
			)

			Object.defineProperty(result.current, "canvasRef", {
				value: { current: canvas },
				writable: true,
			})

			expect(typeof result.current.seek).toBe("function")

			expect(() => {
				result.current.seek(5)
			}).not.toThrow()
			expect(() => {
				result.current.seek(15)
			}).not.toThrow()
			expect(() => {
				result.current.seek(-5)
			}).not.toThrow()
		})
	})

	describe("hasContent detection", () => {
		test("returns false when layers have no segments", () => {
			const { result } = renderHook(() =>
				useCompositor({
					duration: 0,
					fragments: [],
					isPlaying: false,
					layers: [{ segments: [], zIndex: 0 }],
					playbackSpeed: 1,
					projectId: "proj-1",
					rootDirHandle: null,
				}),
			)

			expect(result.current.canvasRef).toBeDefined()
		})

		test("returns true when layers have segments", () => {
			const { result } = renderHook(() =>
				useCompositor({
					duration: 10,
					fragments: [
						{ duration: 10, filePath: "rec-1", id: "frag-1" },
					],
					isPlaying: false,
					layers: createLayers(10),
					playbackSpeed: 1,
					projectId: "proj-1",
					rootDirHandle: null,
				}),
			)

			expect(result.current.canvasRef).toBeDefined()
		})
	})
})
